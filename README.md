# AirLume - Aircraft Lightning Strike Prediction System

A multi-language desktop application that analyzes atmospheric conditions along aircraft flight paths to predict lightning formation zones and provide route optimization recommendations.

## Overview

AirLume integrates real-time weather data with plasma physics calculations to help pilots make informed decisions about lightning-prone areas along their flight routes. The system aims to reduce aircraft lightning strike incidents and associated inspection costs.

## Architecture

- **C**: Main controller and physics calculations engine
- **Ada**: Safety-critical flight path analysis and route planning
- **Python**: Weather API integration and data processing

## Features
* **Real-Time Weather Data**: Fetches current atmospheric conditions for flight routes
* **Physics-Based Risk Model**: Calculates lightning probability using temperature, humidity, pressure, and E-field data
* **Route Analysis**: Generates waypoints and analyzes risk at each segment
* **Interactive Web GUI**: Visual flight path with color-coded risk indicators
* **Safety Validation**: Ada-based critical system validation
* **Multi-Airport Support**: 500+ Canadian airports via CSV database

## Current Status

✅ **Completed Features:**
* Basic communication framework between the three languages established
* Multi-language integration (C, Ada, Python, Java)
* Real-time weather API integration via OpenWeatherMap
* Physics-based lightning risk calculation engine
* Route waypoint generation and analysis
* Safety-critical validation system (Ada ARINC 653)
* Jakarta EE web interface with interactive visualization
* CSV airport database (500+ airports)
* Route risk profiling with color-coded waypoints

🚧 **In Progress:**
* Enhanced route visualization with map integration
* Historical weather data analysis/testing
* Alternative route suggestions
* Route-specific enhancements

## Requirements

- GCC compiler
- GNAT Ada compiler
- Python 3.x
- requests library (`pip install requests`)

## Technology Stack
* **Backend**: C (physics engine), Ada (safety systems)
* **Weather API**: Python 3.x with `requests` library
* **Web Framework**: Jakarta EE 10 (GlassFish 7.0)
* **Frontend**: JSF (JavaServer Faces) with XHTML
* **Database**: CSV file storage for airport data

## Build Instructions

### C/Ada Core System

**Linux/WSL:**
```bash
cd AirLume
mkdir build
gnat make ada_src/flight.adb -o build/flight
gcc c_src/main.c c_src/route_planning.c c_src/route_risk.c -lm -o build/airlume
./build/airlume CYOW CYYZ
```

**Windows:**
```cmd
cd AirLume
mkdir build
gnat make ada_src/flight.adb -o build/flight
gcc c_src/main.c c_src/route_planning.c c_src/route_risk.c -lm -o build/airlume.exe
build\airlume.exe CYOW CYYZ
```

### Jakarta Web Application

1. Open `airlume-web` project in NetBeans
2. Build Project (Clean & Build)
3. Deploy to GlassFish Server
4. Access at: `http://localhost:8080/airlume-web/`

### Python Weather Module (Standalone Testing)
```bash
cd python_src
python weather.py --route ../waypoints.txt
```


## Project Structure

```
AirLume/
├── ada_src/              # Ada safety-critical flight systems
│   ├── flight.adb        # Main safety validation module
│   └── flight.ads        # Ada specification
├── c_src/                # C physics engine and controllers
│   ├── main.c            # Main entry point
│   ├── route_planning.c  # Waypoint generation
│   ├── route_risk.c      # Risk assessment
│   └── *.h               # Header files
├── python_src/           # Python weather integration
│   └── weather.py        # OpenWeatherMap API client
├── airlume-web/          # Jakarta EE web application
│   ├── src/main/java/    # Java backend (EJB services)
│   └── src/main/webapp/  # JSF frontend (XHTML pages)
├── build/                # Compiled executables
├── CA-airports.csv       # Airport database
└── README.md
```
## Usage

### Command Line (C/Ada/Python)
```bash
# Single route analysis
./build/airlume.exe CYOW CYYZ

# Custom coordinates
python python_src/weather.py --point 45.3225 -75.6692
```

### Web Interface
1. Navigate to `http://localhost:8080/airlume-web/route-visualization.xhtml`
2. Enter origin airport code (e.g., CYOW)
3. Enter destination airport code (e.g., CYYZ)
4. Click "Analyze Route"
5. View interactive flight path with waypoint risk analysis

### Output
- **Lightning Risk**: Percentage probability (0-100%)
- **Risk Level**: LOW, MODERATE, HIGH, CRITICAL
- **Waypoint Analysis**: Risk at each route segment
- **Weather Data**: Temperature, humidity, pressure, wind speed
- **Recommendation**: Flight safety guidance

## Contributing

This is an academic project for ENG4002 - Project for Entrepreneurs course.

## Contact

**Tisha Patel**
- **GitHub:** [@tishap27](https://github.com/tishap27)
- **Email:** tishaapatel08@gmail.com

Done

