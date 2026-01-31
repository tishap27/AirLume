"""
AirLume ML 
This gets called by C code to enhance physics predictions
"""

import joblib
import os
import sys

def read_physics_prediction():
    """Read the C physics prediction from file"""
    
    # Debug: show current directory and files
    print(f"DEBUG: Current directory: {os.getcwd()}")
    print(f"DEBUG: route_risk.txt exists: {os.path.exists('route_risk.txt')}")
    print(f"DEBUG: lightning_risk.txt exists: {os.path.exists('lightning_risk.txt')}")
    print(f"DEBUG: lightningrisk.txt exists: {os.path.exists('lightningrisk.txt')}")
    
    # Try route_risk.txt first (for route mode)
    if os.path.exists('route_risk.txt'):
        try:
            print("DEBUG: Reading route_risk.txt...")
            with open('route_risk.txt', 'r') as f:
                content = f.read()
                print(f"DEBUG: route_risk.txt content:\n{content}")
                f.seek(0)  # Go back to start
                for line in f:
                    if line.startswith('MAX_RISK:'):
                        risk = float(line.split(':')[1].strip())
                        print(f"DEBUG: Found MAX_RISK: {risk}")
                        return risk
        except Exception as e:
            print(f"Warning: Could not read route_risk.txt: {e}")
    
    # Fall back to lightning_risk.txt (single-point mode)
    
    for filename in ['lightning_risk.txt', 'lightningrisk.txt']:
        if os.path.exists(filename):
            try:
                print(f"DEBUG: Reading {filename}...")
                with open(filename, 'r') as f:
                    content = f.read()
                    print(f"DEBUG: {filename} content: '{content}'")
                    risk = float(content.strip())
                    return risk
            except Exception as e:
                print(f"Warning: Could not read {filename}: {e}")
    
    print("ERROR: No risk files found")
    print("Looking for: route_risk.txt or lightning_risk.txt")
    return None

def read_route_info():
    """Read route information if available"""
    route_info = {'mode': 'single-point'}
    
    if os.path.exists('route_risk.txt'):
        try:
            with open('route_risk.txt', 'r') as f:
                for line in f:
                    if line.startswith('ROUTE:'):
                        route_info['route'] = line.split(':')[1].strip()
                        route_info['mode'] = 'route'
                    elif line.startswith('AVG_RISK:'):
                        route_info['avg_risk'] = float(line.split(':')[1].strip())
        except:
            pass
    
    return route_info

def read_atmospheric_conditions():
    """Read atmospheric conditions from waypoints file"""
    try:
        conditions = []
        with open('waypoints.txt', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split(',')
                    if len(parts) >= 2:
                        lat = float(parts[0])
                        lon = float(parts[1])
                        conditions.append({'lat': lat, 'lon': lon})
        
        # Use first waypoint for now (or average later)
        if conditions:
            return conditions[0]
        return {'lat': 45.0, 'lon': -75.0}  # Default Ottawa
    except:
        return {'lat': 45.0, 'lon': -75.0}

def enhance_prediction(physics_risk, model, route_info):
    """
    Enhance C physics prediction with ML
    
    For now, useing simple rules.later training ML
    
    """
    
    # Simple enhancement logic
    # This simulates what ML would learn:
    
    if physics_risk < 5:
        # Low risk - physics is usually accurate
        ml_adjustment = 0.0
    elif physics_risk < 15:
        # Moderate risk - physics might underestimate slightly
        ml_adjustment = physics_risk * 0.15  # +15%
    elif physics_risk < 25:
        # Higher risk - check for underestimation
        ml_adjustment = physics_risk * 0.10  # +10%
    else:
        # High risk - physics is usually conservative enough
        ml_adjustment = 0.0
    
    enhanced_risk = physics_risk + ml_adjustment
    
    # Cap at 100%
    enhanced_risk = min(enhanced_risk, 100.0)
    
    return enhanced_risk

def write_enhanced_prediction(enhanced_risk, physics_risk, route_info):
    """Write ML-enhanced prediction to file for Ada to read"""
    try:
        with open('lightning_risk_ml.txt', 'w') as f:
            f.write(f"{enhanced_risk:.2f}\n")
        
        # Also write a detailed log
        with open('ml_enhancement.log', 'w') as f:
            if route_info['mode'] == 'route':
                f.write(f"Mode: Route Analysis\n")
                if 'route' in route_info:
                    f.write(f"Route: {route_info['route']}\n")
            else:
                f.write(f"Mode: Single Point\n")
            
            f.write(f"Physics Prediction: {physics_risk:.2f}%\n")
            f.write(f"ML Enhanced: {enhanced_risk:.2f}%\n")
            f.write(f"Adjustment: {enhanced_risk - physics_risk:+.2f}%\n")
            
            if enhanced_risk > physics_risk:
                f.write("ML says: INCREASE RISK\n")
            elif enhanced_risk < physics_risk:
                f.write("ML says: DECREASE RISK\n")
            else:
                f.write("ML says: PHYSICS ACCURATE\n")
        
        return True
    except Exception as e:
        print(f"ERROR writing ML prediction: {e}")
        return False

def main():
    print("=== AirLume ML Enhancement Layer ===")
    
    # Step 1: Read route info
    route_info = read_route_info()
    if route_info['mode'] == 'route':
        print(f"Mode: Route Analysis ({route_info.get('route', 'unknown')})")
    else:
        print("Mode: Single Point Analysis")
    
    # Step 2: Read C physics prediction
    physics_risk = read_physics_prediction()
    if physics_risk is None:
        print("FAIL: Could not read physics prediction")
        print("\nMake sure to run AirLume first to generate risk files:")
        print("  build\\airlume CYOW CYYZ 30000")
        sys.exit(1)
    
    print(f"C Physics Prediction: {physics_risk:.2f}%")
    
    # Step 3: Read atmospheric conditions
    conditions = read_atmospheric_conditions()
    
    # Step 4: Load ML model (if exists)
    model = None
    model_path = 'build/airlume_ml_model.pkl'
    if os.path.exists(model_path):
        try:
            model = joblib.load(model_path)
            print(f" ML model loaded from {model_path}")
        except:
            print("Could not load ML model, using simple enhancement")
    else:
        print(" No trained model found, using simple enhancement")
    
    # Step 5: Enhance prediction
    enhanced_risk = enhance_prediction(physics_risk, model, route_info)
    
    print(f"ML Enhanced Prediction: {enhanced_risk:.2f}%")
    print(f"Adjustment: {enhanced_risk - physics_risk:+.2f}%")
    
    # Step 6: Write result
    if write_enhanced_prediction(enhanced_risk, physics_risk, route_info):
        print(" Enhanced prediction written to lightning_risk_ml.txt")
        print("=== ML Enhancement Complete ===")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()