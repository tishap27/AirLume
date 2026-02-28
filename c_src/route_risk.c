#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "route_risk.h"
#include "riskcalc_altitude.h"

void classify_risk_level(double risk_percent, char* level) {
    if (risk_percent < 15.0) {
        strcpy(level, "LOW");
    } else if (risk_percent < 30.0) {
        strcpy(level, "MODERATE");
    } else if (risk_percent < 50.0) {
        strcpy(level, "HIGH");
    } else {
        strcpy(level, "CRITICAL");
    }
}

void write_waypoints_to_file(FlightRoute* route) {
    FILE* fp = fopen("waypoints.txt", "w");
    if (!fp) return;
    
    fprintf(fp, "# Waypoints for route %s -> %s\n", 
            route->origin_name, route->destination_name);
    
    for (int i = 0; i < route->num_waypoints; i++) {
        fprintf(fp, "%.4f,%.4f,%.1f\n",
                route->waypoints[i].latitude,
                route->waypoints[i].longitude,
                route->waypoints[i].distance_from_start);
    }
    
    fclose(fp);
}

int fetch_route_weather(FlightRoute* route, WeatherData* weather_array, int altitude_ft) {
    printf("\n=== Fetching Real-Time Weather for Waypoints ===\n");
    
    if (altitude_ft > 0) {
        printf("Flight Level: FL%d (%d ft)\n", altitude_ft / 100, altitude_ft);
    } else {
        printf("Using ground-level weather\n");
    }
    
    write_waypoints_to_file(route);
    printf(" Waypoints written to waypoints.txt\n");
    
    char command[512];
    
    if (altitude_ft > 0) {
        // Flight level mode
        #ifdef _WIN32
            snprintf(command, sizeof(command), 
                     "python python_src\\weather.py --route waypoints.txt %d", altitude_ft);
        #else
            snprintf(command, sizeof(command), 
                     "python3 python_src/weather.py --route waypoints.txt %d", altitude_ft);
        #endif
    } else {
        // Ground level mode (NO altitude parameter)
        #ifdef _WIN32
            snprintf(command, sizeof(command), 
                     "python python_src\\weather.py --route waypoints.txt");
        #else
            snprintf(command, sizeof(command), 
                     "python3 python_src/weather.py --route waypoints.txt");
        #endif
    }
    
    // Write waypoints to file
    write_waypoints_to_file(route);
    printf(" Waypoints written to waypoints.txt\n");
    
    // Call Python to fetch weather AT ALTITUDE
    //char command[512];
    #ifdef _WIN32
        snprintf(command, sizeof(command), 
                 "python python_src\\weather.py --route waypoints.txt %d", altitude_ft);
    #else
        snprintf(command, sizeof(command), 
                 "python3 python_src/weather.py --route waypoints.txt %d", altitude_ft);
    #endif
    
    printf("Executing command: %s\n", command);  // DEBUG
    
    FILE* pipe = popen(command, "r");
    if (!pipe) {
        fprintf(stderr, "Error: Cannot execute Python weather module\n");
        return 0;
    }
    
    char line[1024];
    int wp_index = 0;
    
    printf("Reading Python output...\n");  // DEBUG
    
    // Read Python output and parse weather for each waypoint
    while (fgets(line, sizeof(line), pipe) && wp_index < route->num_waypoints) {
        printf("  Python output: %s", line);  // DEBUG - see what Python says
        
        // Look for lines like: WP1_WEATHER:15.2,65,1013,5.4
        if (strstr(line, "_WEATHER:")) {
            double temp, hum, pres, wind;
            char* data_start = strstr(line, ":") + 1;
            printf("  Parsing data: %s", data_start);  // DEBUG
            
            if (sscanf(data_start, "%lf,%lf,%lf,%lf", 
                       &temp, &hum, &pres, &wind) == 4) {
                weather_array[wp_index].temperature = temp;
                weather_array[wp_index].humidity = hum;
                weather_array[wp_index].pressure = pres;
                weather_array[wp_index].wind_speed = wind;
                weather_array[wp_index].altitude = 30000.0;
                
                printf(" WP%d: %.1f°C, %.0f%%, %.0f hPa, %.1f m/s\n",
                       wp_index + 1, temp, hum, pres, wind);
                
                wp_index++;
            } else {
                printf("  Failed to parse weather data\n");  // DEBUG
            }
        }
    }
    
    int exit_code = pclose(pipe);
    printf("Python exit code: %d\n", exit_code);  // DEBUG
    
    printf(" Fetched weather for %d/%d waypoints\n", wp_index, route->num_waypoints);
    return wp_index;
}

void assess_route_risk(RouteRiskAssessment* assessment, FlightRoute* route) {
    assess_route_risk_at_altitude(assessment, route, 0);  // Default FL300
}

void assess_route_risk_at_altitude(RouteRiskAssessment* assessment, FlightRoute* route, int altitude_ft) {
    assessment->route = *route;
    assessment->num_assessments = route->num_waypoints;
    
    double total_risk = 0.0;
    assessment->max_risk = 0.0;
    assessment->max_risk_waypoint = 0;
    
    // Fetch weather AT SPECIFIED ALTITUDE
    WeatherData* weather_array = (WeatherData*)malloc(route->num_waypoints * sizeof(WeatherData));
    int weather_count = fetch_route_weather(route, weather_array, altitude_ft);
    // Set altitude in weather data for physics model selection
    for (int i = 0; i < weather_count; i++) {
        if (altitude_ft > 0) {
            weather_array[i].altitude = altitude_ft * 0.3048;  // Convert ft to meters
        } else {
            weather_array[i].altitude = 0.0;  // Ground level
        }
    }
    
    printf("\n=== Analyzing Route Risk ===\n");
    printf("Calculating lightning risk for %d waypoints...\n", route->num_waypoints);
    
    for (int i = 0; i < route->num_waypoints; i++) {
        WaypointRisk* wp_risk = &assessment->waypoint_risks[i];
        Waypoint* wp = &route->waypoints[i];
        
        // Store waypoint info
        wp_risk->waypoint_number = wp->segment_number;
        wp_risk->latitude = wp->latitude;
        wp_risk->longitude = wp->longitude;
        wp_risk->distance_km = wp->distance_from_start;
        
        // Use real weather if available
        if (i < weather_count && weather_array != NULL) {
            wp_risk->weather = weather_array[i];
        } else {
            // Fallback to sample weather if API failed
            wp_risk->weather.temperature = 20.0 + (i % 5) * 2.0;
            wp_risk->weather.humidity = 60.0 + (i % 3) * 10.0;
            wp_risk->weather.pressure = 1013.0 - (i % 4) * 5.0;
            wp_risk->weather.wind_speed = 5.0 + (i % 3) * 3.0;
            wp_risk->weather.altitude = 10000.0;
        }
        
        // Calculate risk using physics engine
        //wp_risk->risk = calculate_lightning_risk(wp_risk->weather);
        // Choose physics model based on altitude
        if (wp_risk->weather.altitude >= 5000.0) {
            // Use altitude model for cruise flight (> 5000m / 16,400 ft)
            wp_risk->risk = calculate_lightning_risk_altitude(wp_risk->weather);
        } else {
            // Use ground model for low altitude / ground
            wp_risk->risk = calculate_lightning_risk(wp_risk->weather);
        }
        
        // Classify risk level
        classify_risk_level(wp_risk->risk.lightning_probability, wp_risk->risk_level);
        
        // Track maximum risk
        if (wp_risk->risk.lightning_probability > assessment->max_risk) {
            assessment->max_risk = wp_risk->risk.lightning_probability;
            assessment->max_risk_waypoint = i;
        }
        
        total_risk += wp_risk->risk.lightning_probability;
        
        printf("  [%d/%d] WP%d @ %.0f km: %.1f%% %s\n",
               i+1, route->num_waypoints,
               wp_risk->waypoint_number,
               wp_risk->distance_km,
               wp_risk->risk.lightning_probability,
               wp_risk->risk_level);
    }
    
    // Free allocated memory
    if (weather_array != NULL) {
        free(weather_array);
    }
    
    // Calculate average
    assessment->avg_risk = total_risk / route->num_waypoints;
    
    // Generate recommendation
    generate_flight_recommendation(assessment);
    
    /*
    WaypointRisk* max_wp = &assessment->waypoint_risks[assessment->max_risk_waypoint];
    
    FILE* risk_file = fopen("lightning_risk.txt", "w");
    if (risk_file) {
        fprintf(risk_file, "LIGHTNING_RISK:%.1f\n", assessment->max_risk);
        //fprintf(risk_file, "WAYPOINT:%d\n", max_wp->waypoint_number);
        fprintf(risk_file, "TEMPERATURE:%.1f\n", max_wp->weather.temperature);
        fprintf(risk_file, "HUMIDITY:%.1f\n", max_wp->weather.humidity);
        fprintf(risk_file, "PRESSURE:%.1f\n", max_wp->weather.pressure);
        fprintf(risk_file, "WIND_SPEED:%.1f\n", max_wp->weather.wind_speed);
        fclose(risk_file);
        printf("Risk data written to file for Ada system\n");
    }*/
}

void generate_flight_recommendation(RouteRiskAssessment* assessment) {
    if (assessment->max_risk < 15.0) {
        strcpy(assessment->overall_recommendation, 
               "CLEARED FOR FLIGHT - Low lightning risk throughout route");
    } else if (assessment->max_risk < 30.0) {
        snprintf(assessment->overall_recommendation, 100,
                "PROCEED WITH CAUTION - Monitor conditions near waypoint %d",
                assessment->max_risk_waypoint + 1);
    } else if (assessment->max_risk < 50.0) {
        snprintf(assessment->overall_recommendation, 100,
                "HIGH RISK - Consider route deviation near waypoint %d or altitude change",
                assessment->max_risk_waypoint + 1);
    } else {
        snprintf(assessment->overall_recommendation, 100,
                "CRITICAL RISK - Recommend route change or delay departure");
    }
}

void print_route_risk_profile(RouteRiskAssessment* assessment) {
    printf("\n");
    printf("===============================================================\n");
    printf("   AIRLUME ROUTE RISK ASSESSMENT\n");
    printf("===============================================================\n");
    printf("Route: %s -> %s\n", 
           assessment->route.origin_name, 
           assessment->route.destination_name);
    printf("Distance: %.1f km | Waypoints Analyzed: %d\n",
           assessment->route.total_distance,
           assessment->num_assessments);
    printf("---------------------------------------------------------------\n");
    
    // Visual risk profile
    printf("\nRisk Profile Along Route:\n\n");
    
    for (int i = 0; i < assessment->num_assessments; i++) {
        WaypointRisk* wp = &assessment->waypoint_risks[i];
        
        // Create visual bar
        int bar_length = (int)(wp->risk.lightning_probability / 5.0);
        if (bar_length > 20) bar_length = 20;
        
        printf("  WP%d (%3.0f km): ", wp->waypoint_number, wp->distance_km);
        
        // Bar
        for (int j = 0; j < bar_length; j++) printf("#");
        for (int j = bar_length; j < 20; j++) printf(".");
        
        printf(" %5.1f%% %s", wp->risk.lightning_probability, wp->risk_level);
        
        // Marker for max risk
        if (i == assessment->max_risk_waypoint) {
            printf(" <- PEAK RISK");
        }
        
        printf("\n");
    }
    
    printf("\n---------------------------------------------------------------\n");
    printf("SUMMARY:\n");
    printf("  Maximum Risk: %.1f%% at waypoint %d (%.0f km)\n",
           assessment->max_risk,
           assessment->max_risk_waypoint + 1,
           assessment->waypoint_risks[assessment->max_risk_waypoint].distance_km);
    printf("  Average Risk: %.1f%%\n", assessment->avg_risk);
    printf("\n");
    printf("RECOMMENDATION:\n");
    printf("  %s\n", assessment->overall_recommendation);
    printf("===============================================================\n\n");
}