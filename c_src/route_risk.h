//route_risk.h
#ifndef ROUTE_RISK_H
#define ROUTE_RISK_H

#include "route_planning.h"
#include "riskcalc.h"

// Risk assessment for a waypoint
typedef struct {
    int waypoint_number;
    double latitude;
    double longitude;
    double distance_km;
    WeatherData weather;
    LightningRisk risk;
    char risk_level[20];  // "LOW", "MODERATE", "HIGH", "CRITICAL"
} WaypointRisk;

// Route-wide risk summary
typedef struct {
    FlightRoute route;
    WaypointRisk waypoint_risks[MAX_WAYPOINTS];
    int num_assessments;
    
    // Summary statistics
    double max_risk;
    int max_risk_waypoint;
    double avg_risk;
    char overall_recommendation[100];
} RouteRiskAssessment;

// Functions
void assess_route_risk(RouteRiskAssessment* assessment, FlightRoute* route);
void classify_risk_level(double risk_percent, char* level);
void print_route_risk_profile(RouteRiskAssessment* assessment);
void generate_flight_recommendation(RouteRiskAssessment* assessment);

#endif