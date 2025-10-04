"""
AirLume Validation - Real NOAA Lightning Strike Data
Uses actual coordinates from NOAA database
"""

import pandas as pd
import requests
import time

API_KEY = "23d3c91d2e3ce153066c3a59550a2f38"

def get_current_weather(lat, lon):
    """Get current weather as proxy for strike conditions"""
    url = "http://api.openweathermap.org/data/2.5/weather"
    params = {'lat': lat, 'lon': lon, 'appid': API_KEY, 'units': 'metric'}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        return {
            'temperature': data['main']['temp'],
            'humidity': data['main']['humidity'],
            'pressure': data['main']['pressure'],
            'wind_speed': data['wind']['speed']
        }
    except:
        return None

def find_nearest_efield(lat, lon):
    """Find nearest E-field from your CSV"""
    df = pd.read_csv('airlume_usa_efield_100.csv')
    df['distance'] = ((df['latitude'] - lat)**2 + (df['longitude'] - lon)**2)**0.5
    nearest = df.loc[df['distance'].idxmin()]
    return nearest['e_field_total_V_m']

def calculate_risk(e_field, weather):
    """Your risk calculation logic"""
    if e_field < 200:
        field_risk = 0.05
    elif e_field < 500:
        field_risk = 0.15
    elif e_field < 1000:
        field_risk = 0.35
    elif e_field < 2500:
        field_risk = 0.60
    elif e_field < 5000:
        field_risk = 0.80
    else:
        field_risk = 0.95
    
    humidity_risk = max(0, (weather['humidity'] - 75.0) / 25.0)
    pressure_risk = max(0, (1013.25 - weather['pressure']) / 300.0)
    total = (field_risk * 0.70 + humidity_risk * 0.20 + pressure_risk * 0.10)
    return total * 100.0

print("=" * 70)
print("AIRLUME VALIDATION - REAL NOAA LIGHTNING STRIKES")
print("=" * 70)

# Read your lightning data
df = pd.read_csv('noaa_lightning.csv')
print(f"\nLoaded {len(df)} real lightning strike records")
print(f"Date range: {df['BEGIN_YEARMONTH'].min()} to {df['BEGIN_YEARMONTH'].max()}")
print(f"States: {', '.join(df['STATE'].unique()[:10])}")

results = []
print("\n" + "-" * 70)
print("Testing each strike location...")
print("-" * 70)

for idx, strike in df.iterrows():
    print(f"\n[{idx+1}/{len(df)}] {strike['BEGIN_LOCATION']}, {strike['STATE']}")
    print(f"  Coordinates: ({strike['BEGIN_LAT']:.2f}, {strike['BEGIN_LON']:.2f})")
    print(f"  Strike date: {strike['BEGIN_YEARMONTH']}, Time: {strike['BEGIN_TIME']}")
    
    # Get weather
    weather = get_current_weather(strike['BEGIN_LAT'], strike['BEGIN_LON'])
    if not weather:
        print("  ✗ Weather API failed")
        continue
    
    print(f"  Current weather: {weather['temperature']:.1f}°C, {weather['humidity']}%, {weather['pressure']} hPa")
    
    # Get E-field
    e_field = find_nearest_efield(strike['BEGIN_LAT'], strike['BEGIN_LON'])
    print(f"  E-Field: {e_field:.1f} V/m")
    
    # Calculate risk
    risk = calculate_risk(e_field, weather)
    high_risk = risk >= 40.0
    
    print(f"  AirLume Prediction: {risk:.1f}%")
    
    if high_risk:
        print("  ✓ DETECTED (HIGH risk predicted)")
        status = "DETECTED"
    else:
        print("  ✗ MISSED (LOW risk predicted)")
        status = "MISSED"
    
    results.append({
        'location': f"{strike['BEGIN_LOCATION']}, {strike['STATE']}",
        'lat': strike['BEGIN_LAT'],
        'lon': strike['BEGIN_LON'],
        'date': strike['BEGIN_YEARMONTH'],
        'e_field': e_field,
        'risk': risk,
        'high_risk': high_risk,
        'status': status,
        'temp': weather['temperature'],
        'humidity': weather['humidity']
    })
    
    time.sleep(1)  # API rate limit

# Results
print("\n" + "=" * 70)
print("VALIDATION RESULTS")
print("=" * 70)

results_df = pd.DataFrame(results)
detected = len(results_df[results_df['high_risk'] == True])
missed = len(results_df[results_df['high_risk'] == False])
total = len(results_df)
detection_rate = (detected / total * 100) if total > 0 else 0

print(f"\nTotal Strikes Tested: {total}")
print(f"Correctly Predicted HIGH Risk: {detected}")
print(f"Missed (predicted LOW): {missed}")
print(f"\nDETECTION RATE: {detection_rate:.1f}%")

if detection_rate >= 85:
    print("\n✓✓ EXCELLENT - System identifies most lightning conditions")
elif detection_rate >= 70:
    print("\n✓ ACCEPTABLE - Good detection for aviation safety")
else:
    print("\n⚠ NEEDS IMPROVEMENT - Consider lowering risk thresholds")

# Save
results_df.to_csv('validation_results.csv', index=False)
print(f"\nResults saved to: validation_results.csv")

# Summary table
print("\n" + "-" * 70)
print("STRIKE-BY-STRIKE RESULTS:")
print("-" * 70)
for _, row in results_df.iterrows():
    icon = "✓" if row['status'] == "DETECTED" else "✗"
    print(f"{icon} {row['location']:35s} Risk: {row['risk']:5.1f}% | E: {row['e_field']:6.1f} V/m")

print("\n" + "=" * 70)
print("VALIDATION COMPLETE")
print("=" * 70)