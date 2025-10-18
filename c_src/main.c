#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "riskcalc.h"
#include "route_planning.h"
#include "route_risk.h"

#ifdef _WIN32
    #define PYTHON_CMD "python"
    #define PATH_SEP "\\"
#else
    #define PYTHON_CMD "python3"
    #define PATH_SEP "/"
#endif

int main(int argc, char *argv[]) {
    printf("=== AirLume Lightning Strike Prediction System ===\n");

     // Check if running in route mode
    if (argc >= 3) {
        printf("\n=== ROUTE ANALYSIS MODE ===\n");
        
        FlightRoute route;
        
        // Look up origin
        if (lookup_airport_coordinates(argv[1], &route.origin_lat, &route.origin_lon)) {
            strcpy(route.origin_name, argv[1]);
            printf("Origin: %s (%.4f, %.4f)\n", argv[1], route.origin_lat, route.origin_lon);
        } else {
            printf("Error: Unknown airport code '%s'\n", argv[1]);
            printf("Available codes: CYOW, CYYZ, CYUL, CYVR, CYYC, KJFK, KORD, KLAX, KATL, KDFW\n");
            return 1;
        }
        
        // Look up destination
        if (lookup_airport_coordinates(argv[2], &route.dest_lat, &route.dest_lon)) {
            strcpy(route.destination_name, argv[2]);
            printf("Destination: %s (%.4f, %.4f)\n", argv[2], route.dest_lat, route.dest_lon);
        } else {
            printf("Error: Unknown airport code '%s'\n", argv[2]);
            return 1;
        }
        
        // Generate waypoints
        generate_waypoints(&route, 50.0);
        print_route_summary(&route);
        
        // Assess risk along route
        RouteRiskAssessment assessment;
        assess_route_risk(&assessment, &route);
        
        // Print results
        print_route_risk_profile(&assessment);
        
        // Write for Ada
        FILE* route_file = fopen("route_risk.txt", "w");
        if (route_file) {
            fprintf(route_file, "ROUTE:%s->%s\n", route.origin_name, route.destination_name);
            fprintf(route_file, "MAX_RISK:%.2f\n", assessment.max_risk);
            fprintf(route_file, "AVG_RISK:%.2f\n", assessment.avg_risk);
            fclose(route_file);
        }
        
        printf("\n=== Route analysis complete ===\n");
        return 0;  // Exit after route mode
    }
    // END OF ROUTE MODE SECTION ###


    printf("Trying CSV\n");
    printf("\nNote: For route analysis, use: ./airlume ORIGIN DEST\n");
    printf("Example: ./airlume CYOW CYYZ\n");
    printf("Running single-point mode...\n\n");
    
    // Call Python 
    printf("\n1. Calling Python Weather API...\n");
    //system("python3 ../python_src/weather.py");

    FILE* weather_pipe; 
   // char weather_output[1024];
    char command[256];
    char weather_output[1024];

    #ifdef _WIN32
        snprintf(command, sizeof(command), "python python_src\\weather.py");
    #else
        snprintf(command, sizeof(command), "python3 python_src/weather.py");
    #endif

    weather_pipe = popen(command, "r");
    if (!weather_pipe) {
        printf("Error: Cannot execute Python weather module\n");
        return 1;
    }
    WeatherData weather_data = {20.0, 60.0, 1013.0, 5.0}; // defaults
    //char weather_output[1024];
    double query_lat = 45.3202;  // Ottawa (will come from API)
    double query_lon = -75.6656;
    int query_altitude = 30000;  // feet
    
    // Read Python output and parse weather data
    while (fgets(weather_output, sizeof(weather_output), weather_pipe)) {
    printf("%s", weather_output);
    if (strstr(weather_output, "WEATHER_DATA:")) {
        // Direct parsing right here
        double temp, hum, pres, wind;
        if (sscanf(weather_output, "WEATHER_DATA:%lf,%lf,%lf,%lf", 
                   &temp, &hum, &pres, &wind) == 4) {
            weather_data.temperature = temp;
            weather_data.humidity = hum;
            weather_data.pressure = pres;
            weather_data.wind_speed = wind;
            weather_data.altitude = 10000.0;
            printf("[DEBUG] Direct parse SUCCESS: %.2f, %.2f, %.2f, %.2f\n",
                   temp, hum, pres, wind);
        } else {
            printf("[DEBUG] Direct parse FAILED\n");
            printf("[DEBUG] Line was: '%s'\n", weather_output);
        }
    }
}
    pclose(weather_pipe);
    printf("\n[DEBUG] After parsing: temp=%.2f, humidity=%.2f, pressure=%.2f\n", 
       weather_data.temperature, weather_data.humidity, weather_data.pressure);

    // Calculate lightning risk using physics
    printf("\n Analyzing Lightning Risk via the CSV ...\n");
    //LightningRisk risk = calculate_lightning_risk(weather_data);
    //print_risk_assessment(risk);


    //Writing risk to file for Ada
   // write_risk_to_file(risk.lightning_probability);

    EFieldRecord efield_data = find_nearest_efield("airlume_usa_efield_100.csv", 
                                                     query_lat, 
                                                     query_lon, 
                                                     query_altitude);
    
    LightningRisk risk;
    
    if (efield_data.e_field_total_V_m < 0) {
        // CSV not available, use calculation
        printf("\n[] CSV not found - Using Calculated E-Field Model\n");
        risk = calculate_lightning_risk(weather_data);
        print_risk_assessment(risk);
    } else {
        // CSV available, use enhanced prediction
        printf("\n[] Calculating Risk with CSV-Enhanced Model\n");
       // risk = calculate_lightning_risk_from_efield(weather_data, efield_data);
        risk = calculate_lightning_risk(weather_data);  // Pure physics only
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