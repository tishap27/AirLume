import sys
import requests

try:
    import tkinter as tk
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False   # skips GUI when tkinter not available 

API_KEY = "23d3c91d2e3ce153066c3a59550a2f38"

def get_weather(lat=45.3202, lon=-75.6656):
    """Get weather for a single point (Ottawa default)"""
    print("Python Weather API: Fetching data...")
    try:
        print(f"Checking weather for coordinates: {lat}, {lon}")
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        
        response = requests.get(url)
        data = response.json()
        
        print("API Response:")
        print(data)
        
        if 'cod' in data and data['cod'] != 200:
            print(f"API Error: {data.get('message', 'Unknown error')}")
            return None
        
        temp = data['main']['temp']
        humidity = data['main']['humidity']
        pressure = data['main']['pressure']
        wind_speed = data['wind']['speed']
        
        print(f"Temperature: {temp} C")
        print(f"Humidity: {humidity}%")
        print(f"Pressure: {pressure} hPa")
        print(f"Wind Speed: {wind_speed} m/s")
        
        print(f"WEATHER_DATA:{temp},{humidity},{pressure},{wind_speed}")
        
        return {
            'temp': temp,
            'humidity': humidity,
            'pressure': pressure,
            'wind_speed': wind_speed
        }
        
    except Exception as e:
        print(f"Weather API Error: {e}")
        return None

def get_route_weather(waypoints_file):
    """
    Read waypoints from file and fetch weather for each.
    Expected format: lat,lon (one per line)
    """
    print("=== ROUTE WEATHER MODE ===")
    print(f"Reading waypoints from: {waypoints_file}")
    
    try:
        with open(waypoints_file, 'r') as f:
            waypoints = []
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split(',')
                    if len(parts) >= 2:
                        lat = float(parts[0])
                        lon = float(parts[1])
                        waypoints.append((lat, lon))
        
        print(f"OK Found {len(waypoints)} waypoints")
        
        # Fetch weather for each waypoint
        results = []
        for i, (lat, lon) in enumerate(waypoints, 1):
            print(f"\n[{i}/{len(waypoints)}] Waypoint {i}: ({lat:.4f}, {lon:.4f})")
            weather = get_weather_silent(lat, lon)
            if weather:
                results.append(weather)
                # Output in C-readable format
                print(f"WP{i}_WEATHER:{weather['temp']},{weather['humidity']},{weather['pressure']},{weather['wind_speed']}")
        
        print(f"\nOK Successfully fetched weather for {len(results)}/{len(waypoints)} waypoints")
        return results
        
    except FileNotFoundError:
        print(f"Error: Cannot find waypoints file: {waypoints_file}")
        return []
    except Exception as e:
        print(f"Error reading waypoints: {e}")
        return []

def get_weather_silent(lat, lon):
    """Get weather without printing debug info (for batch processing)"""
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        response = requests.get(url)
        data = response.json()
        
        if 'cod' in data and data['cod'] != 200:
            return None
        
        return {
            'temp': data['main']['temp'],
            'humidity': data['main']['humidity'],
            'pressure': data['main']['pressure'],
            'wind_speed': data['wind']['speed']
        }
    except:
        return None

def simulate_flight_updates(route_file, cruise_speed_kmh=850, update_interval_min=10):
    """
    Simulate real-time weather updates during flight.
    
    Args:
        route_file: File containing waypoints
        cruise_speed_kmh: Aircraft speed (default 850 km/h for jets)
        update_interval_min: How often to update (default 10 minutes)
    """
    print("=== SIMULATING REAL-TIME FLIGHT UPDATES ===")
    print(f"Update Interval: {update_interval_min} minutes")
    print(f"Cruise Speed: {cruise_speed_kmh} km/h")
    
    try:
        with open(route_file, 'r') as f:
            waypoints = []
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split(',')
                    if len(parts) >= 3:  # lat,lon,distance_km
                        lat = float(parts[0])
                        lon = float(parts[1])
                        dist = float(parts[2])
                        waypoints.append((lat, lon, dist))
        
        total_distance = waypoints[-1][2] if waypoints else 0
        flight_time_hours = total_distance / cruise_speed_kmh
        flight_time_minutes = flight_time_hours * 60
        
        print(f"Total Distance: {total_distance:.1f} km")
        print(f"Estimated Flight Time: {flight_time_minutes:.0f} minutes\n")
        
        # Calculate number of updates
        num_updates = int(flight_time_minutes / update_interval_min) + 1
        
        for update_num in range(num_updates):
            elapsed_min = update_num * update_interval_min
            distance_covered = (elapsed_min / 60.0) * cruise_speed_kmh
            
            # Find current position
            current_lat, current_lon = interpolate_position(waypoints, distance_covered)
            
            print(f"\n{'='*60}")
            print(f"UPDATE #{update_num + 1} | Time: T+{elapsed_min} min | Distance: {distance_covered:.1f} km")
            print(f"{'='*60}")
            
            weather = get_weather_silent(current_lat, current_lon)
            if weather:
                print(f"Position: ({current_lat:.4f}, {current_lon:.4f})")
                print(f"Temperature: {weather['temp']:.1f} C")
                print(f"Humidity: {weather['humidity']}%")
                print(f"Pressure: {weather['pressure']} hPa")
                print(f"FLIGHT_UPDATE:{elapsed_min},{distance_covered:.1f},{weather['temp']},{weather['humidity']},{weather['pressure']}")
            
            if distance_covered >= total_distance:
                print("\nOK Destination reached!")
                break
        
    except Exception as e:
        print(f"Error in simulation: {e}")

def interpolate_position(waypoints, distance_covered):
    """Find current lat/lon based on distance covered along route"""
    for i in range(len(waypoints) - 1):
        if distance_covered <= waypoints[i+1][2]:
            # Interpolate between waypoints[i] and waypoints[i+1]
            fraction = (distance_covered - waypoints[i][2]) / (waypoints[i+1][2] - waypoints[i][2])
            lat = waypoints[i][0] + fraction * (waypoints[i+1][0] - waypoints[i][0])
            lon = waypoints[i][1] + fraction * (waypoints[i+1][1] - waypoints[i][1])
            return lat, lon
    
    # If beyond all waypoints, return last waypoint
    return waypoints[-1][0], waypoints[-1][1]

def main():
    # Check for command-line arguments
    if len(sys.argv) > 1:
        mode = sys.argv[1]
        
        if mode == "--route" and len(sys.argv) > 2:
            # Route mode: fetch weather for multiple waypoints
            waypoints_file = sys.argv[2]
            get_route_weather(waypoints_file)
            
        elif mode == "--simulate" and len(sys.argv) > 2:
            # Simulation mode: show updates every 10 minutes
            route_file = sys.argv[2]
            interval = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            simulate_flight_updates(route_file, update_interval_min=interval)
            
        elif mode == "--point" and len(sys.argv) > 3:
            # Single point mode with custom coordinates
            lat = float(sys.argv[2])
            lon = float(sys.argv[3])
            get_weather(lat, lon)
        else:
            print("Usage:")
            print("  Single point:  python weather.py")
            print("  Custom point:  python weather.py --point <lat> <lon>")
            print("  Route mode:    python weather.py --route waypoints.txt")
            print("  Simulate:      python weather.py --simulate waypoints.txt [interval_min]")
    else:
        # Default: GUI or single point mode
        if GUI_AVAILABLE:
            root = tk.Tk()
            root.title("AirLume - Aircraft Lightning Prediction")
            root.geometry("400x200")
            
            title_label = tk.Label(root, text="AirLume Lightning Prediction System", 
                                  font=("Arial", 14, "bold"))
            title_label.pack(pady=10)
            
            weather_button = tk.Button(root, text="Get Weather Data", 
                                      command=lambda: get_weather(), bg="lightblue")
            weather_button.pack(pady=10)
            
            status_label = tk.Label(root, text="System Ready")
            status_label.pack(pady=5)
            
            root.mainloop()
        else:
            # Command-line mode (no GUI)
            get_weather()

if __name__ == "__main__":
    main()