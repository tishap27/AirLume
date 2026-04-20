# AirLume - Aircraft Lightning Strike Prediction System

AirLume is a physics-based aviation lightning strike prediction system built in four languages, namely Python, C, Ada, and Jakarta EE. It predicts lightning formation probability 30-40 minutes in advance along specific flight routes using Paschen's Law, Townsend Avalanche theory, and an ARINC 653-compliant Ada safety validation layer. Validated at 88% accuracy against 181 real strikes from the NASA SWDI 2024 database

## Overview

AirLume integrates real-time weather data with plasma physics calculations to help pilots make informed decisions about lightning-prone areas along their flight routes. The system aims to reduce aircraft lightning strike incidents and associated inspection costs.

## Why This Matters
- Airlines spend $2B annually on mandatory post-strike inspections
- 63% of lightning strikes occur in conditions pilots perceive as safe
- Current systems only detect strikes after they happen — AirLume predicts them before
- Validated against 181 real NASA SWDI lightning events at 88% detection rate

## Architecture

AirLume uses a four-language pipeline where each language is chosen for a specific reason:

| Language | Role | Why |
|---|---|---|
| Python | Weather API integration | Best HTTP/JSON libraries, network I/O bound |
| C | Physics engine (Paschen's Law, Townsend Avalanche) | 60x faster than Python for numerical calculations |
| Ada | Safety validation monitor (ARINC 653) | DO-178C Level A certification capable, dissimilar redundancy |
| Jakarta EE | Enterprise web interface | Industry standard for aviation enterprise systems |

Data flow: Python → C → Ada → Jakarta EE

## Features
* **Real-Time Weather Data**: Fetches current atmospheric conditions for flight routes
* **Physics-Based Risk Model**: Calculates lightning probability using temperature, humidity, pressure, and E-field data
* **Route Analysis**: Generates waypoints and analyzes risk at each segment
* **Interactive Web GUI**: Visual flight path with color-coded risk indicators
* **Safety Validation**: Ada-based critical system validation
* **Multi-Airport Support**: 500+ Canadian airports via CSV database

## Safety & Compliance Architecture
- **DO-178C**: Ada safety monitor designed to Level A certification requirements
- **ARINC 653**: Temporal partitioning enforced, 100ms execution budget per operation
- **Dissimilar Redundancy**: C (Paschen's Law) and Ada (empirical E-field model) 
  Use independent algorithms: if C has a bug, Ada catches it
- **Audit Trail**: All safety events logged with timestamps for regulatory review

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
* Altitude physics model (FL200-FL400) with cruise-specific E-field thresholds
* Mid-route heading diversion via --divert and --at CLI flags

## Validation Results
- 88% lightning detection rate against 181 NASA SWDI 2024 historical strikes
- <100ms processing time per 8-waypoint route
- Ada/C agreement rate: >85% on test dataset
- ARINC 653 temporal partition: all operations within 100ms budget

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
├── ada_src/                    # Ada safety-critical flight systems
│   ├── flight.adb              # Main safety validation module
│   ├── flight.ads              # Ada specification
│   ├──physics_validator.adb    # Independent E-field risk calculation
│   ├── physics_validator.ads   # Physics validator specification
│   ├── safety_monitor.adb      # Alert generation & regulatory enforcement
│   ├── safety_monitor.ads      # Safety monitor specification
│   ├── arinc653_core.adb       # Partition management & emergency halt
│   ├── time_partition.adb      # 100ms execution budget enforcement
│   └── safety_types.ads        # Shared type definitions
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

# Route at cruise altitude with mid-route diversion
./build/airlume CYOW CYYZ 30000 --divert 140 --at 3

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
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Contact

**Tisha Patel**
- **GitHub:** [@tishap27](https://github.com/tishap27)
- **Email:** [tishaapatel08@gmail.com](mailto:tishaapatel08@gmail.com)

