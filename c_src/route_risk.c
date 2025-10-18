#include <stdio.h>
#include <string.h>
#include "route_risk.h"

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

void assess_route_risk(RouteRiskAssessment* assessment, FlightRoute* route) {
    assessment->route = *route;
    assessment->num_assessments = route->num_waypoints;
    
    double total_risk = 0.0;
    assessment->max_risk = 0.0;
    assessment->max_risk_waypoint = 0;
    
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
        
        // Sample weather (in production, call Python API for each waypoint)
        // For now, create varying conditions for demonstration
        wp_risk->weather.temperature = 20.0 + (i % 5) * 2.0;
        wp_risk->weather.humidity = 60.0 + (i % 3) * 10.0;
        wp_risk->weather.pressure = 1013.0 - (i % 4) * 5.0;
        wp_risk->weather.wind_speed = 5.0 + (i % 3) * 3.0;
        wp_risk->weather.altitude = 10000.0;
        
        // Calculate risk using physics engine
        wp_risk->risk = calculate_lightning_risk(wp_risk->weather);
        
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
    
    // Calculate average
    assessment->avg_risk = total_risk / route->num_waypoints;
    
    // Generate recommendation
    generate_flight_recommendation(assessment);
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