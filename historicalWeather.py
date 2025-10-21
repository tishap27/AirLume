"""
Historical Weather Fetcher using Open-Meteo Archive API
Gets weather data from the EXACT date/time of lightning strikes
"""

import pandas as pd
import requests
from datetime import datetime, timedelta
import time

def parse_strike_datetime(row):
    """
    Parse NOAA lightning strike datetime
    BEGIN_YEARMONTH: 202404
    BEGIN_DAY: 11
    BEGIN_TIME: 1213 (HHMM format)
    """
    try:
        year_month = str(row['BEGIN_YEARMONTH'])
        year = int(year_month[:4])
        month = int(year_month[4:6])
        day = int(row['BEGIN_DAY'])
        
        # Parse time (HHMM format)
        time_str = str(row['BEGIN_TIME']).zfill(4)  # Ensure 4 digits
        hour = int(time_str[:2])
        minute = int(time_str[2:4])
        
        return datetime(year, month, day, hour, minute)
    except Exception as e:
        print(f"Error parsing date: {e}")
        return None

def get_historical_weather(lat, lon, strike_date):
    """
    Fetch historical weather from Open-Meteo Archive API
    Returns weather conditions at the time of the strike
    """
    
    # Open-Meteo Archive API endpoint
    url = "https://archive-api.open-meteo.com/v1/archive"
    
    # Format date for API
    date_str = strike_date.strftime("%Y-%m-%d")
    
    # Parameters
    params = {
        'latitude': lat,
        'longitude': lon,
        'start_date': date_str,
        'end_date': date_str,
        'hourly': 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m',
        'timezone': 'auto'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Find closest hour to strike time
            hourly = data['hourly']
            times = [datetime.fromisoformat(t) for t in hourly['time']]
            
            # Find closest time index
            time_diffs = [abs((t - strike_date).total_seconds()) for t in times]
            closest_idx = time_diffs.index(min(time_diffs))
            
            # Extract weather at that time
            weather = {
                'temperature': hourly['temperature_2m'][closest_idx],
                'humidity': hourly['relative_humidity_2m'][closest_idx],
                'pressure': hourly['surface_pressure'][closest_idx],
                'wind_speed': hourly['wind_speed_10m'][closest_idx],
                'time_diff_hours': min(time_diffs) / 3600.0  # How close the match is
            }
            
            return weather
        else:
            print(f"API Error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return None

def process_lightning_events():
    """
    Main function: Process all lightning events with historical weather
    """
    
    print("=" * 70)
    print("HISTORICAL WEATHER FETCHER FOR LIGHTNING STRIKES")
    print("=" * 70)
    
    # Load lightning events
    try:
        df = pd.read_csv('lightning_events_2024.csv')
        print(f"\n✓ Loaded {len(df)} lightning events from 2024")
    except:
        print("\n✗ Cannot find lightning_events_2024.csv")
        print("Run test_swdi_simple.py first to download the data")
        return
    
    # Limit to reasonable number for testing
    if len(df) > 50:
        print(f"⚠ Limiting to 50 events for API quota")
        df = df.sample(50, random_state=42)
    
    results = []
    failed = 0
    
    print(f"\nFetching historical weather for {len(df)} strikes...")
    print("-" * 70)
    
    for idx, strike in df.iterrows():
        # Parse strike datetime
        strike_datetime = parse_strike_datetime(strike)
        
        if not strike_datetime:
            print(f"\n✗ [{idx+1}] Could not parse date for {strike['BEGIN_LOCATION']}")
            failed += 1
            continue
        
        print(f"\n[{idx+1}/{len(df)}] {strike.get('CZ_NAME', 'Unknown')}, {strike['STATE']}")
        print(f"  Strike date/time: {strike_datetime}")
        print(f"  Location: ({strike['BEGIN_LAT']:.4f}, {strike['BEGIN_LON']:.4f})")
        
        # Fetch historical weather
        weather = get_historical_weather(strike['BEGIN_LAT'], 
                                        strike['BEGIN_LON'],
                                        strike_datetime)
        
        if weather:
            print(f"  Historical weather: {weather['temperature']:.1f}°C, "
                  f"{weather['humidity']:.0f}%, {weather['pressure']:.0f} hPa")
            print(f"  Match quality: ±{weather['time_diff_hours']:.1f} hours")
            
            # Store result
            results.append({
                'location': f"{strike.get('CZ_NAME', 'Unknown')}, {strike['STATE']}",
                'strike_date': strike_datetime,
                'lat': strike['BEGIN_LAT'],
                'lon': strike['BEGIN_LON'],
                'temperature': weather['temperature'],
                'humidity': weather['humidity'],
                'pressure': weather['pressure'],
                'wind_speed': weather['wind_speed'],
                'time_match_hours': weather['time_diff_hours']
            })
        else:
            print(f"  ✗ Failed to fetch weather")
            failed += 1
        
        # Rate limiting - Open-Meteo allows 10k requests/day
        time.sleep(0.5)  # Be respectful
    
    # Save results
    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    
    if results:
        results_df = pd.DataFrame(results)
        results_df.to_csv('historical_weather_strikes.csv', index=False)
        
        print(f"\n✓ Successfully fetched weather for {len(results)} strikes")
        print(f"✗ Failed: {failed}")
        print(f"\n✓ Saved to: historical_weather_strikes.csv")
        
        # Statistics
        print("\n" + "-" * 70)
        print("WEATHER STATISTICS AT STRIKE TIMES:")
        print("-" * 70)
        print(f"Average Temperature: {results_df['temperature'].mean():.1f}°C "
              f"(range: {results_df['temperature'].min():.1f} to {results_df['temperature'].max():.1f})")
        print(f"Average Humidity: {results_df['humidity'].mean():.0f}% "
              f"(range: {results_df['humidity'].min():.0f} to {results_df['humidity'].max():.0f})")
        print(f"Average Pressure: {results_df['pressure'].mean():.0f} hPa "
              f"(range: {results_df['pressure'].min():.0f} to {results_df['pressure'].max():.0f})")
        print(f"Average Wind: {results_df['wind_speed'].mean():.1f} m/s")
        print(f"\nTime Match Quality: ±{results_df['time_match_hours'].mean():.1f} hours average")
    else:
        print("\n✗ No weather data retrieved")
    
    print("\n" + "=" * 70)
    print("NEXT STEP:")
    print("Run: python validate_with_historical_weather.py")
    print("=" * 70)

if __name__ == "__main__":
    process_lightning_events()