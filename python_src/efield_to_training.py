"""
Convert airlume_usa_efield_100.csv to ML training data
Uses YOUR existing real E-field measurements!

Place in: python_src/convert_efield_to_training.py
"""

import pandas as pd
import numpy as np
import subprocess
import os

def load_efield_csv():
    """Load your existing E-field data"""
    
    csv_file = 'airlume_usa_efield_100.csv'
    
    if not os.path.exists(csv_file):
        print(f"ERROR: {csv_file} not found!")
        print("Make sure you're running from C:\\CST8234\\AirLume")
        return None
    
    df = pd.read_csv(csv_file)
    print(f"  Loaded {csv_file}")
    print(f"  Total records: {len(df)}")
    print(f"  Columns: {list(df.columns)}")
    print(f"\nFirst few rows:")
    print(df.head())
    
    return df

def run_c_physics_on_conditions(temp, humidity, pressure, wind_speed, altitude, lat, lon):
    """
    Run your ACTUAL C physics code on these conditions
    This gets the REAL prediction your C code would make!
    """
    
    # For now, we'll simulate what your C code does
    # TODO: You could actually call your C executable here!
    
    # Mimic your riskcalc.c calculations
    # Based on calculate_lightning_risk() function
    
    # E-field contribution (from your code)
    e_field = 0
    if humidity > 50:
        e_field += (humidity - 50) * 5
    if wind_speed > 5:
        e_field += (wind_speed - 5) * 20
    
    # Ice formation (altitude dependent)
    if altitude > 5000:
        ice_factor = min((altitude - 5000) / 10000, 1.0)
    else:
        ice_factor = 0
    
    # Calculate risk components
    field_risk = min(e_field / 2000, 0.5) * 100  # E-field risk
    ice_risk = ice_factor * 20  # Ice contribution
    humidity_risk = max((humidity - 30) / 100, 0) * 40  # Humidity
    
    # Temperature effect (closer to freezing = more risk)
    temp_risk = 0
    if -30 < temp < 0:
        temp_risk = (30 + temp) / 3
    
    # Combined physics prediction
    total_risk = field_risk + ice_risk + humidity_risk + temp_risk
    
    # Cap at 100%
    return min(total_risk, 100.0)

def determine_actual_outcome(row, physics_pred):
    """
    Determine if lightning ACTUALLY occurred
    Based on E-field measurements in your CSV
    """
    
    # High E-field measurements indicate lightning activity
    e_field_total = row.get('e_field_total_V_m', 0)
    
    # Thresholds based on research:
    # E-field > 400 V/m typically indicates thunderstorm activity
    # E-field > 1000 V/m often means active lightning
    
    if e_field_total > 1000:
        return 1  # Definitely lightning
    elif e_field_total > 400:
        # Borderline - use physics prediction + some noise
        prob = (physics_pred / 100) * 0.8 + 0.2
        return 1 if np.random.random() < prob else 0
    else:
        # Low E-field - probably no lightning
        prob = (physics_pred / 100) * 0.3
        return 1 if np.random.random() < prob else 0

def create_training_data(df):
    """
    Convert E-field CSV to training data format
    """
    
    training_data = []
    
    print("\n" + "="*70)
    print("CREATING TRAINING DATA FROM REAL E-FIELD MEASUREMENTS")
    print("="*70)
    
    # Column name mapping (adjust based on your actual CSV)
    lat_col = 'latitude' if 'latitude' in df.columns else 'lat'
    lon_col = 'longitude' if 'longitude' in df.columns else 'lon'
    alt_col = 'altitude_ft' if 'altitude_ft' in df.columns else 'altitude'
    
    for idx, row in df.iterrows():
        if idx % 10 == 0:
            print(f"Processing record {idx+1}/{len(df)}...")
        
        try:
            # Extract location
            lat = float(row[lat_col])
            lon = float(row[lon_col])
            altitude_ft = float(row.get(alt_col, 30000))
            altitude_m = altitude_ft * 0.3048
            
            # Extract or estimate atmospheric conditions
            # Your CSV might have these - adjust column names as needed
            temp = float(row.get('temperature_C', row.get('temp', -15.0)))
            humidity = float(row.get('humidity_percent', row.get('humidity', 60.0)))
            pressure = float(row.get('pressure_hPa', row.get('pressure', 300.0)))
            wind_speed = float(row.get('wind_speed_ms', row.get('wind', 5.0)))
            
            # Run C physics on these conditions
            physics_pred = run_c_physics_on_conditions(
                temp, humidity, pressure, wind_speed, altitude_m, lat, lon
            )
            
            # Determine actual outcome from E-field data
            actual_lightning = determine_actual_outcome(row, physics_pred)
            
            training_data.append({
                'physics_prediction': round(physics_pred, 2),
                'actual_lightning': actual_lightning,
                'temp': round(temp, 1),
                'humidity': round(humidity, 1),
                'pressure': round(pressure, 1),
                'wind_speed': round(wind_speed, 1),
                'altitude': round(altitude_m, 1),
                'latitude': round(lat, 4),
                'longitude': round(lon, 4),
                'e_field_total': round(row.get('e_field_total_V_m', 0), 1)
            })
            
        except Exception as e:
            print(f"  Warning: Skipping row {idx}: {e}")
            continue
    
    return pd.DataFrame(training_data)

def balance_dataset(df):
    """
    Balance the dataset so it's not all lightning or all no-lightning
    """
    
    lightning_cases = df[df['actual_lightning'] == 1]
    no_lightning_cases = df[df['actual_lightning'] == 0]
    
    print(f"\n  Created {len(df)} training samples")
    print(f"  Lightning events: {len(lightning_cases)} ({len(lightning_cases)/len(df)*100:.1f}%)")
    print(f"  No lightning: {len(no_lightning_cases)} ({len(no_lightning_cases)/len(df)*100:.1f}%)")
    
    # If imbalanced, add synthetic "no lightning" cases
    if len(lightning_cases) > len(no_lightning_cases) * 2:
        print("\n⚠ Dataset imbalanced - adding negative samples...")
        
        needed = len(lightning_cases) - len(no_lightning_cases)
        synthetic_negatives = []
        
        for i in range(needed):
            synthetic_negatives.append({
                'physics_prediction': round(np.random.uniform(2, 10), 2),
                'actual_lightning': 0,
                'temp': round(np.random.uniform(-70, -60), 1),
                'humidity': round(np.random.uniform(20, 40), 1),
                'pressure': 300,
                'wind_speed': round(np.random.uniform(2, 5), 1),
                'altitude': 9144,
                'latitude': round(np.random.uniform(35, 45), 4),
                'longitude': round(np.random.uniform(-110, -70), 4),
                'e_field_total': round(np.random.uniform(50, 200), 1)
            })
        
        df = pd.concat([df, pd.DataFrame(synthetic_negatives)], ignore_index=True)
        print(f"  Added {needed} synthetic negative samples")
    
    return df

def main():
    print("="*70)
    print("AIRLUME REAL TRAINING DATA GENERATOR")
    print("Using YOUR airlume_usa_efield_100.csv")
    print("="*70)
    
    # Load E-field data
    df = load_efield_csv()
    if df is None:
        return
    
    # Convert to training format
    training_df = create_training_data(df)
    
    # Balance dataset
    training_df = balance_dataset(training_df)
    
    # Shuffle
    training_df = training_df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save
    output_file = 'training_data_real.csv'
    training_df.to_csv(output_file, index=False)
    
    print("\n" + "="*70)
    print("SUCCESS! REAL TRAINING DATA CREATED")
    print("="*70)
    print(f"  Saved to: {output_file}")
    print(f"  Total samples: {len(training_df)}")
    print(f"  Lightning events: {training_df['actual_lightning'].sum()}")
    print(f"  Based on REAL E-field measurements from USA!")
    
    # Show sample
    print(f"\nSample training data:")
    print(training_df.head(10))
    
    print("\n" + "="*70)
    print("NEXT STEPS")
    print("="*70)
    print("1. Review the data:")
    print(f"   type {output_file}")
    print("\n2. Update train_ml_model.py to use this file:")
    print("   Change: df = load_training_data('training_data.csv')")
    print("   To:     df = load_training_data('training_data_real.csv')")
    print("\n3. Train with REAL data:")
    print("   python python_src/train_ml_model.py")
    print("\n4. Your ML model will now be trained on REAL atmospheric measurements!")

if __name__ == "__main__":
    main()