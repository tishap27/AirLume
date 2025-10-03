#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "riskcalc.h"

#ifdef _WIN32
    #define PYTHON_CMD "python"
    #define PATH_SEP "\\"
#else
    #define PYTHON_CMD "python3"
    #define PATH_SEP "/"
#endif

int main() {
    printf("=== AirLume Lightning Strike Prediction System ===\n");
    printf("Trying CSV\n");
    
    // Call Python 
    printf("\n1. Calling Python Weather API...\n");
    //system("python3 ../python_src/weather.py");

    FILE* weather_pipe; 
   // char weather_output[1024];
    char command[256];

    #ifdef _WIN32
        system("python python_src\\weather.py");
    #else
        system("python3 python_src/weather.py");
    #endif

    weather_pipe = popen(command, "r");
    if (!weather_pipe) {
        printf("Error: Cannot execute Python weather module\n");
        return 1;
    }
    WeatherData weather_data = {20.0, 60.0, 1013.0, 5.0}; // defaults
    char weather_output[1024];
    double query_lat = 45.3202;  // Ottawa (will come from API)
    double query_lon = -75.6656;
    int query_altitude = 30000;  // feet
    
    // Read Python output and parse weather data
    while (fgets(weather_output, sizeof(weather_output), weather_pipe)) {
        printf("%s", weather_output); // Show Python output
        
        if (strstr(weather_output, "WEATHER_DATA:")) {
            weather_data = parse_weather_data(weather_output);
        }
    }
    pclose(weather_pipe);
    

    // Calculate lightning risk using physics
    printf("\n Analyzing Lightning Risk via the CSV ...\n");
    //LightningRisk risk = calculate_lightning_risk(weather_data);
    //print_risk_assessment(risk);


    //Writing risk to file for Ada
   // write_risk_to_file(risk.lightning_probability);

    EFieldRecord efield_data = find_nearest_efield("airlume_test_10.csv", 
                                                     query_lat, 
                                                     query_lon, 
                                                     query_altitude);
    
    LightningRisk risk;
    
    if (efield_data.e_field_total_V_m < 0) {
        // CSV not available, use calculation
        printf("\n[STEP 3] CSV not found - Using Calculated E-Field Model\n");
        risk = calculate_lightning_risk(weather_data);
        print_risk_assessment(risk);
    } else {
        // CSV available, use enhanced prediction
        printf("\n[STEP 3] Calculating Risk with CSV-Enhanced Model\n");
        risk = calculate_lightning_risk_from_efield(weather_data, efield_data);
        
        // Enhanced output
        printf("\n=== COMBINED DATA ANALYSIS ===\n");
        printf("Query Location: (%.4f, %.4f) @ %d ft\n", query_lat, query_lon, query_altitude);
        printf("---\n");
        printf("Real-Time Weather (API):\n");
        printf("  Temperature: %.1f°C\n", weather_data.temperature);
        printf("  Humidity: %.1f%%\n", weather_data.humidity);
        printf("  Pressure: %.1f hPa\n", weather_data.pressure);
        printf("  Wind Speed: %.1f m/s\n", weather_data.wind_speed);
        printf("---\n");
        printf("Historical E-Field Data (CSV):\n");
        printf("  E-Field Total: %.1f V/m\n", efield_data.e_field_total_V_m);
        printf("  E-Field Vertical: %.1f V/m\n", efield_data.e_field_vertical_V_m);
        printf("  E-Field Horizontal: %.1f V/m\n", efield_data.e_field_horizontal_V_m);
        printf("  Ion Density: %.0f ions/cm³\n", efield_data.ion_density_per_cm3);
        printf("  CSV Condition: %s\n", efield_data.weather_condition);
        printf("---\n");
        printf("Physics Calculations:\n");
        printf("  Air Density: %.3f kg/m³\n", risk.air_density);
        printf("  Conductivity: %.2e S/m\n", risk.conductivity);
        printf("  Charge Density: %.2e C/m³\n", risk.charge_density);
        printf("  Breakdown Voltage: %.0f V\n", risk.breakdown_voltage);
        printf("---\n");
        printf("LIGHTNING PROBABILITY: %.2f%%\n", risk.lightning_probability);
        
        if (risk.lightning_probability < 15.0) {
            printf("Risk Level: LOW - Safe to fly\n");
        } else if (risk.lightning_probability < 40.0) {
            printf("Risk Level: MODERATE - Monitor conditions\n");
        } else if (risk.lightning_probability < 70.0) {
            printf("Risk Level: HIGH - Consider route change\n");
        } else {
            printf("Risk Level: CRITICAL - Immediate reroute required\n");
        }
        
        printf("\nLIGHTNING_RISK:%.2f\n", risk.lightning_probability);
    }
    
    write_risk_to_file(risk.lightning_probability);


    // Call Ada 
    printf("\n2. Calling Ada Flight System...\n");
    //system("../ada_src/obj/main.exe");
    
    #ifdef _WIN32
        system("ada_src\\obj\\main.exe");
    #else
        system("./ada_src/obj/main.exe");
    #endif
    
    
    // C main controller
    //printf("\n3. C Controller: Lightning risk = 2.4%%\n");
    printf("All systems operational!\n");
    
    return 0;
}