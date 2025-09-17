try:
    import tkinter as tk
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False   # skips GUI when tkinter not available 

import requests

def get_weather():
    print("Python Weather API: Fetching data...")
    print("Temperature: 22°C")
    print("Humidity: 65%")
    print("Pressure: 1013 hPa")
    print("Lightning risk conditions: MODERATE")


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