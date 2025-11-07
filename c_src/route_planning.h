#ifndef ROUTE_PLANNING_H
#define ROUTE_PLANNING_H

#define MAX_WAYPOINTS 20
#define EARTH_RADIUS_KM 6371.0
#define PI 3.14159265358979323846

// Route waypoint structure
typedef struct {
    double latitude;
    double longitude;
    double distance_from_start;  // km
    int segment_number;
} Waypoint;

// Route structure
typedef struct {
    char origin_name[50];
    char destination_name[50];
    double origin_lat;
    double origin_lon;
    double dest_lat;
    double dest_lon;
    Waypoint waypoints[MAX_WAYPOINTS];
    int num_waypoints;
    double total_distance;  // km
} FlightRoute;

// Route calculation functions
double haversine_distance(double lat1, double lon1, double lat2, double lon2);
void generate_waypoints(FlightRoute* route, double interval_km);
void print_route_summary(FlightRoute* route);

// Airport lookup (simplified - can expand later)
int lookup_airport_coordinates(const char* icao_code, double* lat, double* lon);


#endif