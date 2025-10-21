"""
AirLume Validation - Using CORRECT Historical Weather
This is the PROPER way to validate: weather from when strikes occurred
"""

import pandas as pd
import math

def calculate_risk_physics(weather):
    """
    Calculate lightning risk using physics model
    Matches your C implementation
    """
    
    # E-field calculation (simplified from C)
    e_field = 120.0  # Fair weather baseline
    
    if weather['humidity'] > 70:
        e_field += (weather['humidity'] - 70) * 25.0
    
    if weather['pressure'] < 1000:
        e_field += (1013.25 - weather['pressure']) * 40.0
    
    if weather['temperature'] > 20:
        e_field += (weather['temperature'] - 20) * 15.0
    
    if weather['wind_speed'] > 5:
        e_field += (weather['wind_speed'] - 5) * 40.0
    
    # E-field risk (improved thresholds)
    if e_field < 400:
        field_risk = 0.10
    elif e_field < 700:
        field_risk = 0.35
    elif e_field < 1000:
        field_risk = 0.50
    elif e_field < 1500:
        field_risk = 0.65
    elif e_field < 2500:
        field_risk = 0.80
    else:
        field_risk = 0.95
    
    # Environmental risks
    humidity_risk = max(0, (weather['humidity'] - 70.0) / 30.0)
    pressure_risk = max(0, (1013.25 - weather['pressure']) / 200.0)
    
    # Temperature contribution (convection)
    temp_risk = 0.0
    if weather['temperature'] > 20:
        temp_risk = (weather['temperature'] - 20) / 30.0
    
    # Weighted combination
    total_risk = (field_risk * 0.45 + 
                 humidity_risk * 0.25 + 
                 pressure_risk * 0.20 +
                 temp_risk * 0.10)
    
    return total_risk * 100.0, e_field

print("=" * 70)
print("AIRLUME VALIDATION - HISTORICAL WEATHER (CORRECT METHOD)")
print("=" * 70)

# Load historical weather data
try:
    df = pd.read_csv('historical_weather_strikes.csv')
    print(f"\n✓ Loaded {len(df)} strikes with historical weather")
except:
    print("\n✗ Cannot find historical_weather_strikes.csv")
    print("Run fetch_historical_weather.py first!")
    exit(1)

# Parse dates
df['strike_date'] = pd.to_datetime(df['strike_date'])

print(f"Date range: {df['strike_date'].min()} to {df['strike_date'].max()}")
print(f"Average time match: ±{df['time_match_hours'].mean():.1f} hours")

results = []
print("\n" + "-" * 70)
print("CALCULATING LIGHTNING RISK FOR EACH STRIKE")
print("-" * 70)

for idx, strike in df.iterrows():
    weather = {
        'temperature': strike['temperature'],
        'humidity': strike['humidity'],
        'pressure': strike['pressure'],
        'wind_speed': strike['wind_speed']
    }
    
    risk, e_field = calculate_risk_physics(weather)
    
    print(f"\n[{idx+1}/{len(df)}] {strike['location']}")
    print(f"  Date: {strike['strike_date']}")
    print(f"  Weather: {weather['temperature']:.1f}°C, {weather['humidity']:.0f}%, "
          f"{weather['pressure']:.0f} hPa")
    print(f"  E-Field: {e_field:.1f} V/m")
    print(f"  → Risk: {risk:.1f}%")
    
    # Threshold: 25% for HIGH risk
    high_risk = risk >= 25.0
    
    if high_risk:
        print(f"  ✓ DETECTED")
    else:
        print(f"  ✗ MISSED")
    
    results.append({
        'location': strike['location'],
        'strike_date': strike['strike_date'],
        'temperature': weather['temperature'],
        'humidity': weather['humidity'],
        'pressure': weather['pressure'],
        'e_field': e_field,
        'risk': risk,
        'detected': high_risk
    })

# Results
print("\n" + "=" * 70)
print("VALIDATION RESULTS - HISTORICAL WEATHER")
print("=" * 70)

results_df = pd.DataFrame(results)
detected = len(results_df[results_df['detected'] == True])
missed = len(results_df[results_df['detected'] == False])
total = len(results_df)
detection_rate = (detected / total * 100) if total > 0 else 0

print(f"\nTotal Strikes: {total}")
print(f"Correctly Predicted HIGH Risk: {detected}")
print(f"Missed (predicted LOW): {missed}")
print(f"\nDETECTION RATE: {detection_rate:.1f}%")

if detection_rate >= 70:
    print("\n✓✓ EXCELLENT - Model validated successfully")
elif detection_rate >= 50:
    print("\n✓ ACCEPTABLE - Good predictive capability")
elif detection_rate >= 30:
    print("\n△ MODERATE - Shows potential, needs refinement")
else:
    print("\n⚠ NEEDS IMPROVEMENT - Consider threshold adjustment")

# Save
results_df.to_csv('validation_historical_weather.csv', index=False)
print(f"\nResults saved to: validation_historical_weather.csv")

# Statistics
print("\n" + "-" * 70)
print("STATISTICS:")
print("-" * 70)
print(f"Average E-Field: {results_df['e_field'].mean():.1f} V/m (max: {results_df['e_field'].max():.1f})")
print(f"Average Risk: {results_df['risk'].mean():.1f}% (max: {results_df['risk'].max():.1f})")

# Weather conditions at strike time
print(f"\nWeather at Strike Times:")
print(f"  Avg Temperature: {results_df['temperature'].mean():.1f}°C")
print(f"  Avg Humidity: {results_df['humidity'].mean():.0f}%")
print(f"  Avg Pressure: {results_df['pressure'].mean():.0f} hPa")

# Risk distribution
print(f"\nRisk Distribution:")
print(f"  0-25%:   {len(results_df[results_df['risk'] < 25])} strikes (MISSED)")
print(f"  25-50%:  {len(results_df[(results_df['risk'] >= 25) & (results_df['risk'] < 50)])} strikes")
print(f"  50-75%:  {len(results_df[(results_df['risk'] >= 50) & (results_df['risk'] < 75)])} strikes")
print(f"  75-100%: {len(results_df[results_df['risk'] >= 75])} strikes")

# Detailed results
print("\n" + "-" * 70)
print("STRIKE-BY-STRIKE RESULTS:")
print("-" * 70)
for _, row in results_df.iterrows():
    icon = "✓" if row['detected'] else "✗"
    print(f"{icon} {row['location']:40s} | Risk: {row['risk']:5.1f}% | E: {row['e_field']:6.0f} V/m")

print("\n" + "=" * 70)
print("VALIDATION COMPLETE")
print("=" * 70)