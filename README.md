# AirLume - Aircraft Lightning Strike Prediction System

A multi-language desktop application that analyzes atmospheric conditions along aircraft flight paths to predict lightning formation zones and provide route optimization recommendations.

## Overview

AirLume integrates real-time weather data with plasma physics calculations to help pilots make informed decisions about lightning-prone areas along their flight routes. The system aims to reduce aircraft lightning strike incidents and associated inspection costs.

## Architecture

- **C**: Main controller and physics calculations engine
- **Ada**: Safety-critical flight path analysis and route planning
- **Python**: Weather API integration and data processing

## Current Status

- Basic communication framework between the three languages established
- Will do ToDo list here

## Requirements

- GCC compiler
- GNAT Ada compiler
- Python 3.x
- requests library (`pip install requests`)

## Build Instructions

### Linux/WSL
```bash
cd AirLume
mkdir build
gnat make ada_src/flight.adb -o build/flight
gcc c_src/main.c -o build/airlume
./build/airlume
```

### Windows
```cmd
cd AirLume
mkdir build
gnat make ada_src/flight.adb -o build/flight
gcc c_src/main.c -o build/airlume.exe
build\airlume.exe
```

## Project Structure

```
AirLume/
├── ada_src/          # Ada flight system modules
├── c_src/            # C controller and physics engine
├── python_src/       # Python weather API integration
├── build/            # Compiled executables
└── README.md
```

## Contributing

This is an academic project for ENG4002 - Project for Entrepreneurs course.

## Contact 
 me

Done

