try:
    import tkinter as tk
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False   # skips GUI when tkinter not available 

import requests

def get_weather():
    print("Python Weather API: Fetching data...")
    try:
     # Test API call to get weather (YOW airport)
     api_key = "23d3c91d2e3ce153066c3a59550a2f38"
     lat = 45.3202  # Ottawa latitude
     lon = -75.6656 # Ottawa longitude
        
     # For now, let's just print the coordinates
     print(f"Checking weather for coordinates: {lat}, {lon}")
     url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        
     response = requests.get(url)
     data = response.json()
        
     # DEBUG: just to see what exactly the data is  
     print("API Response:")
     print(data)
        
     # Checks if got an error
     if 'cod' in data and data['cod'] != 200:
       print(f"API Error: {data.get('message', 'Unknown error')}")
       return
        
     # Trying to get weather data
     temp = data['main']['temp']
     humidity = data['main']['humidity']
     pressure = data['main']['pressure']
        
     print(f"Temperature: {temp}°C")
     print(f"Humidity: {humidity}%")
     print(f"Pressure: {pressure} hPa")
     print("Real weather data received!")
        
        
    except Exception as e:
        print(f"Error: {e}")

def main():
  if GUI_AVAILABLE:
    root = tk.Tk()
    root.title("AirLume - Aircraft Lightning Prediction")
    root.geometry("400x200")
    
    # Title label
    title_label = tk.Label(root, text="AirLume Lightning Prediction System", 
                          font=("Arial", 14, "bold"))
    title_label.pack(pady=10)
    
    # Test button
    weather_button = tk.Button(root, text="Get Weather Data", 
                              command=get_weather, bg="lightblue")
    weather_button.pack(pady=10)
    
    # Status label
    status_label = tk.Label(root, text="System Ready")
    status_label.pack(pady=5)
    
    root.mainloop()
  else:
    # Command-line mode (no GUI)
    get_weather()

if __name__ == "__main__":
    main()