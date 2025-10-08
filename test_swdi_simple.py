"""
SWDI Simple Downloader - Uses NCEI's Direct CSV Files
This is the WORKING method - downloads pre-made CSV files
"""

import requests
import pandas as pd
from datetime import datetime
import os

def download_storm_events(year=2024, month=10):
    """
    Download storm events (including lightning) from NCEI
    These are pre-processed CSV files updated monthly
    """
    
    # NCEI Storm Events CSV directory
    base_url = "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/"
    
    # Files available: StormEvents_details-ftp_v1.0_d{YEAR}_c{DATE}.csv.gz
    # Example: StormEvents_details-ftp_v1.0_d2024_c20241014.csv.gz
    
    print(f"=== Downloading SWDI Storm Events Data ===")
    print(f"Target: {year}-{month:02d}")
    
    # Try to find the latest file for this year
    try:
        # List files in directory
        response = requests.get(base_url, timeout=10)
        
        if response.status_code == 200:
            print("✓ SWDI server accessible")
            
            # Look for details file for the year
            # Format: StormEvents_details-ftp_v1.0_dYYYY_cYYYYMMDD.csv.gz
            import re
            pattern = f'StormEvents_details-ftp_v1.0_d{year}_c\\d{{8}}\\.csv\\.gz'
            files = re.findall(pattern, response.text)
            
            if files:
                # Get the most recent file
                latest_file = sorted(files)[-1]
                file_url = base_url + latest_file
                
                print(f"Found: {latest_file}")
                print(f"Downloading from: {file_url}")
                
                # Download the file
                print("Downloading... (may take a minute)")
                file_response = requests.get(file_url, timeout=60)
                
                if file_response.status_code == 200:
                    # Save compressed file
                    output_file = f"storm_events_{year}.csv.gz"
                    with open(output_file, 'wb') as f:
                        f.write(file_response.content)
                    
                    print(f"✓ Downloaded: {output_file} ({len(file_response.content)/1024/1024:.1f} MB)")
                    
                    # Read and decompress
                    print("Reading CSV...")
                    df = pd.read_csv(output_file, compression='gzip')
                    
                    print(f"✓ Loaded {len(df)} events")
                    print(f"\nColumns: {', '.join(df.columns[:10])}...")
                    
                    # Filter for lightning events
                    if 'EVENT_TYPE' in df.columns:
                        lightning = df[df['EVENT_TYPE'] == 'Lightning']
                        print(f"\n✓ Found {len(lightning)} LIGHTNING events")
                        
                        if len(lightning) > 0:
                            # Save lightning-only CSV
                            lightning_file = f"lightning_events_{year}.csv"
                            lightning.to_csv(lightning_file, index=False)
                            print(f"✓ Lightning events saved to: {lightning_file}")
                            
                            # Show sample
                            print(f"\nSample lightning events:")
                            print(lightning[['BEGIN_YEARMONTH', 'STATE', 'BEGIN_LAT', 'BEGIN_LON']].head())
                            
                            return lightning
                    
                    return df
                else:
                    print(f"✗ Download failed: {file_response.status_code}")
            else:
                print(f"✗ No files found for year {year}")
                print(f"Available files might use different format")
        else:
            print(f"✗ Cannot access SWDI: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error: {e}")
    
    return None

def get_storm_events_for_location(lat, lon, radius_km=100, year=2024):
    """
    Download storm events and filter by location
    """
    
    print(f"\n=== Getting Storm Events Near ({lat}, {lon}) ===")
    
    # Download full dataset
    df = download_storm_events(year=year)
    
    if df is None:
        return None
    
    # Filter by location (simple rectangular bounds)
    # 1 degree ≈ 111 km
    radius_deg = radius_km / 111.0
    
    nearby = df[
        (df['BEGIN_LAT'] >= lat - radius_deg) &
        (df['BEGIN_LAT'] <= lat + radius_deg) &
        (df['BEGIN_LON'] >= lon - radius_deg) &
        (df['BEGIN_LON'] <= lon + radius_deg)
    ]
    
    print(f"\n✓ Found {len(nearby)} events within {radius_km} km")
    
    if len(nearby) > 0:
        # Group by event type
        if 'EVENT_TYPE' in nearby.columns:
            print(f"\nEvent types:")
            print(nearby['EVENT_TYPE'].value_counts().head())
    
    return nearby

def quick_test():
    """Quick test - just check if we can access the server"""
    print("=" * 70)
    print("SWDI QUICK CONNECTION TEST")
    print("=" * 70)
    
    base_url = "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/"
    
    print(f"\nTesting: {base_url}")
    
    try:
        response = requests.get(base_url, timeout=10)
        
        if response.status_code == 200:
            print("✓ SWDI server is accessible")
            
            # Look for recent files
            import re
            files_2024 = re.findall(r'StormEvents_details.*d2024.*\.csv\.gz', response.text)
            files_2023 = re.findall(r'StormEvents_details.*d2023.*\.csv\.gz', response.text)
            
            print(f"\nFound {len(files_2024)} files for 2024")
            print(f"Found {len(files_2023)} files for 2023")
            
            if files_2024:
                print(f"\nMost recent 2024 file: {sorted(files_2024)[-1]}")
            
            return True
        else:
            print(f"✗ Server returned: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

# Run tests
print("=" * 70)
print("SWDI DATA ACCESS TEST - CORRECTED VERSION")
print("=" * 70)

# Test 1: Quick connection test
print("\n[TEST 1] Connection Test")
if not quick_test():
    print("\n⚠ Cannot access SWDI - check internet connection")
    exit(1)

# Test 2: Download 2024 storm events
print("\n" + "=" * 70)
print("[TEST 2] Downloading 2024 Storm Events")
print("=" * 70)

storm_data = download_storm_events(year=2024)

# Test 3: Filter for specific location (Ottawa)
if storm_data is not None:
    print("\n" + "=" * 70)
    print("[TEST 3] Finding Events Near Ottawa")
    print("=" * 70)
    
    ottawa_events = get_storm_events_for_location(45.4215, -75.6972, radius_km=200, year=2024)
    
    if ottawa_events is not None and len(ottawa_events) > 0:
        print(f"\n✓ SUCCESS - Found storm events near Ottawa")
        ottawa_events.to_csv('ottawa_storm_events.csv', index=False)
        print(f"Saved to: ottawa_storm_events.csv")

print("\n" + "=" * 70)
print("TESTS COMPLETE")
print("=" * 70)
print("\nNOTE: SWDI provides pre-processed CSV files updated monthly.")
print("For real-time data, you would need to use the SWDI interactive map")
print("or wait for monthly updates.")
print("\nSWDI Website: https://www.ncei.noaa.gov/products/severe-weather-data-inventory")