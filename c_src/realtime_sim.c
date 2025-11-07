#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "route_planning.h"
#include "route_risk.h"
#include "riskcalc.h"

#ifdef _WIN32
    #include <windows.h>
    #define SLEEP_SECONDS(x) Sleep((x) * 1000)
#else
    #include <unistd.h>
    #define SLEEP_SECONDS(x) sleep(x)
#endif

void simulate_realtime_flight(FlightRoute* route, double cruise_speed_kmh, int update_interval_min);
/**
 * Real-time flight simulation mode
 * Simulates an actual flight with periodic weather checks
 * 
 * @param route - The flight route with waypoints
 * @param cruise_speed_kmh - Aircraft cruise speed (default 850 km/h for commercial jets)
 * @param update_interval_min - How often to check weather (default 15 minutes)
 */
void simulate_realtime_flight(FlightRoute* route, double cruise_speed_kmh, int update_interval_min) {
    printf("\n");
    printf("================================================================\n");
    printf("   AIRLUME REAL-TIME FLIGHT SIMULATION MODE\n");
    printf("================================================================\n");
    printf("Route: %s -> %s (%.1f km)\n", 
           route->origin_name, route->destination_name, route->total_distance);
    printf("Cruise Speed: %.0f km/h\n", cruise_speed_kmh);
    printf("Update Interval: %d minutes\n", update_interval_min);
    printf("================================================================\n\n");
    
    // Calculate flight parameters
    double flight_time_hours = route->total_distance / cruise_speed_kmh;
    double flight_time_minutes = flight_time_hours * 60.0;
    int num_updates = (int)(flight_time_minutes / update_interval_min) + 1;
    
    printf("Estimated Flight Time: %.0f minutes (%.1f hours)\n", 
           flight_time_minutes, flight_time_hours);
    printf("Number of Updates: %d\n\n", num_updates);
    
    printf(">>> FLIGHT STARTING NOW <<<\n");
    printf("Departure: %s\n\n", route->origin_name);
    
    time_t start_time = time(NULL);
    
    // Simulation loop - checks weather every X minutes
    for (int update = 0; update < num_updates; update++) {
        int elapsed_minutes = update * update_interval_min;
        double distance_covered = (elapsed_minutes / 60.0) * cruise_speed_kmh;
        
        // Prevent going past destination
        if (distance_covered > route->total_distance) {
            distance_covered = route->total_distance;
        }
        
        // Find current waypoint based on distance
        int current_waypoint = 0;
        for (int i = 0; i < route->num_waypoints; i++) {
            if (distance_covered >= route->waypoints[i].distance_from_start) {
                current_waypoint = i;
            }
        }
        
        Waypoint* wp = &route->waypoints[current_waypoint];
        
        printf("----------------------------------------------------------------\n");
        printf("UPDATE #%d | Time: T+%d min | Distance: %.1f / %.1f km\n",
               update + 1, elapsed_minutes, distance_covered, route->total_distance);
        printf("----------------------------------------------------------------\n");
        printf("Current Position: WP%d (%.4f, %.4f)\n", 
               current_waypoint + 1, wp->latitude, wp->longitude);
        
        // Call Python to get CURRENT weather at this location
        printf("\n[FETCHING REAL-TIME WEATHER]\n");
        
        char command[512];
        #ifdef _WIN32
            snprintf(command, sizeof(command), 
                     "python python_src\\weather.py --point %.4f %.4f",
                     wp->latitude, wp->longitude);
        #else
            snprintf(command, sizeof(command), 
                     "python3 python_src/weather.py --point %.4f %.4f",
                     wp->latitude, wp->longitude);
        #endif
        
        FILE* pipe = popen(command, "r");
        if (!pipe) {
            fprintf(stderr, "Error: Cannot execute Python weather module\n");
            continue;
        }
        
        // Parse weather data from Python
        WeatherData current_weather = {20.0, 60.0, 1013.0, 5.0, 10000.0}; // defaults
        char line[1024];
        
        while (fgets(line, sizeof(line), pipe)) {
            if (strstr(line, "WEATHER_DATA:")) {
                double temp, hum, pres, wind;
                if (sscanf(strstr(line, ":") + 1, "%lf,%lf,%lf,%lf", 
                           &temp, &hum, &pres, &wind) == 4) {
                    current_weather.temperature = temp;
                    current_weather.humidity = hum;
                    current_weather.pressure = pres;
                    current_weather.wind_speed = wind;
                    current_weather.altitude = 10000.0;
                }
            }
        }
        pclose(pipe);
        
        printf("Weather: %.1f°C, %.0f%%, %.0f hPa, %.1f m/s\n",
               current_weather.temperature,
               current_weather.humidity,
               current_weather.pressure,
               current_weather.wind_speed);
        
        // Calculate lightning risk at current position
        LightningRisk risk = calculate_lightning_risk(current_weather);
        
        printf("\n[RISK ANALYSIS]\n");
        printf("Lightning Probability: %.1f%%\n", risk.lightning_probability);
        
        // Risk level determination
        char risk_level[20];
        if (risk.lightning_probability < 15.0) {
            strcpy(risk_level, "LOW");
            printf("Status: ✓ SAFE - Continue as planned\n");
        } else if (risk.lightning_probability < 30.0) {
            strcpy(risk_level, "MODERATE");
            printf("Status: ⚠ CAUTION - Monitor conditions\n");
        } else if (risk.lightning_probability < 50.0) {
            strcpy(risk_level, "HIGH");
            printf("Status: ⚠⚠ HIGH RISK - Consider route change\n");
        } else {
            strcpy(risk_level, "CRITICAL");
            printf("Status: 🚨 CRITICAL - Immediate action required!\n");
        }
        
        // Check if reached destination
        if (distance_covered >= route->total_distance) {
            printf("\n================================================================\n");
            printf(">>> DESTINATION REACHED: %s <<<\n", route->destination_name);
            printf("Total Flight Time: %d minutes\n", elapsed_minutes);
            printf("================================================================\n");
            break;
        }
        
        // Wait for next update (in real simulation)
        // For demo, we speed up time (1 second = 1 minute simulation)
        printf("\nNext update in %d minutes...\n", update_interval_min);
        
        // COMMENT THIS OUT FOR INSTANT DEMO, UNCOMMENT FOR REAL-TIME
        // SLEEP_SECONDS(update_interval_min * 60);  // Real-time: sleep actual minutes
        
        // For demo purposes, sleep 1 second per update
        SLEEP_SECONDS(1);  // Demo mode: 1 second = 1 update
        
        printf("\n");
    }
    
    time_t end_time = time(NULL);
    double elapsed_real_seconds = difftime(end_time, start_time);
    
    printf("\n=== SIMULATION COMPLETE ===\n");
    printf("Real simulation time: %.0f seconds\n", elapsed_real_seconds);
    printf("Simulated flight time: %.0f minutes\n", flight_time_minutes);
}

/**
 * Interpolate position between waypoints based on distance covered
 */
void get_current_position(FlightRoute* route, double distance_covered, 
                         double* current_lat, double* current_lon) {
    // Find which segment we're in
    for (int i = 0; i < route->num_waypoints - 1; i++) {
        Waypoint* wp1 = &route->waypoints[i];
        Waypoint* wp2 = &route->waypoints[i + 1];
        
        if (distance_covered >= wp1->distance_from_start && 
            distance_covered <= wp2->distance_from_start) {
            
            // Interpolate between waypoints
            double segment_distance = wp2->distance_from_start - wp1->distance_from_start;
            double fraction = (distance_covered - wp1->distance_from_start) / segment_distance;
            
            *current_lat = wp1->latitude + fraction * (wp2->latitude - wp1->latitude);
            *current_lon = wp1->longitude + fraction * (wp2->longitude - wp1->longitude);
            return;
        }
    }
    
    // If beyond all waypoints, return destination
    *current_lat = route->waypoints[route->num_waypoints - 1].latitude;
    *current_lon = route->waypoints[route->num_waypoints - 1].longitude;
}