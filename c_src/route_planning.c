// ESP32 compatibility layer
#ifdef ESP32_BUILD
    #include <Arduino.h>
    #undef PI  // Remove Arduino's PI definition
    #define PI 3.14159265358979323846  // Use our definition
    #define fopen(name, mode) NULL
    #define fclose(file)
    #define fprintf(file, fmt, ...) do {} while(0)
    #define fgets(buf, size, file) NULL
#endif

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include "route_planning.h"

// Airport database (simplified - can expand)
typedef struct {
    char icao[5];
    char name[50];
    double lat;
    double lon;
} Airport;

static Airport* airports= NULL  ; 
static int num_airports = 0;
static int airports_loaded = 0;

void load_airports_csv(const char* filename) {
    if (airports_loaded) return;  // Already loaded
    
    FILE* fp = fopen(filename, "r");
    if (!fp) {
        fprintf(stderr, "Warning: Cannot open %s, using default airports\n", filename);
        // Fall back to hardcoded airports
        static Airport default_airports[] = {
            {"CYOW", "Ottawa Macdonald-Cartier", 45.3225, -75.6692},
            {"CYYZ", "Toronto Pearson", 43.6777, -79.6248},
            {"CYUL", "Montreal Trudeau", 45.4706, -73.7408},
            {"CYVR", "Vancouver Intl", 49.1939, -123.1844},
            {"CYYC", "Calgary Intl", 51.1139, -114.0203},
            {"KJFK", "New York JFK", 40.6413, -73.7781},
            {"KORD", "Chicago O'Hare", 41.9742, -87.9073},
            {"KLAX", "Los Angeles Intl", 33.9416, -118.4085},
            {"KATL", "Atlanta Hartsfield", 33.6407, -84.4277},
            {"KDFW", "Dallas Fort Worth", 32.8998, -97.0403}
        };
        airports = default_airports;
        num_airports = 11;
        airports_loaded = 1;
        return;
    }
    
    // Allocate space for up to 500 airports
    Airport* temp_airports = (Airport*)malloc(500 * sizeof(Airport));
    if (!temp_airports) {
        fclose(fp);
        return;
    }
    
    char line[2048];
    int count = 0;
    
    // Skip header line
    if (fgets(line, sizeof(line), fp) == NULL) {
        free(temp_airports);
        fclose(fp);
        return;
    }
    
    // Read each line
    while (fgets(line, sizeof(line), fp) && count < 500) {
        char icao[10], name[100];
        double lat, lon;
        
        // Parse CSV: id,ident,type,name,latitude_deg,longitude_deg,...
        // We only care about: ident (col 1), name (col 3), lat (col 4), lon (col 5)
        
        char* token = strtok(line, ",");
        int col = 0;
        int valid = 1;
        
        while (token != NULL && col < 6) {
            if (col == 1) {  // ident/ICAO code
                strncpy(icao, token, 4);
                icao[4] = '\0';
            } else if (col == 3) {  // name (may have quotes)
                char* name_start = token;
                if (*name_start == '"') name_start++;
                strncpy(name, name_start, 49);
                name[49] = '\0';
                // Remove trailing quote if present
                size_t len = strlen(name);
                if (len > 0 && name[len-1] == '"') name[len-1] = '\0';
            } else if (col == 4) {  // latitude
                lat = atof(token);
            } else if (col == 5) {  // longitude
                lon = atof(token);
            }
            token = strtok(NULL, ",");
            col++;
        }
        
        // Only add if we have a valid 4-letter ICAO code
        if (strlen(icao) == 4 && lat != 0.0 && lon != 0.0) {
            strncpy(temp_airports[count].icao, icao, 4);
            temp_airports[count].icao[4] = '\0';
            strncpy(temp_airports[count].name, name, 49);
            temp_airports[count].name[49] = '\0';
            temp_airports[count].lat = lat;
            temp_airports[count].lon = lon;
            count++;
        }
    }
    
    fclose(fp);
    
    airports = temp_airports;
    num_airports = count;
    airports_loaded = 1;
    
    printf("Loaded %d airports from %s\n", count, filename);
}



int lookup_airport_coordinates(const char* icao_code, double* lat, double* lon) {
    // Load CSV if not already loaded
    if (!airports_loaded) {
        load_airports_csv("CA-airports.csv");
    }

    for (int i = 0; i < num_airports; i++) {
        if (strcmp(airports[i].icao, icao_code) == 0) {
            *lat = airports[i].lat;
            *lon = airports[i].lon;
            return 1;  // Found
        }
    }
    return 0;  // Not found
}

double haversine_distance(double lat1, double lon1, double lat2, double lon2) {
    // Convert degrees to radians
    double lat1_rad = lat1 * PI / 180.0;
    double lon1_rad = lon1 * PI / 180.0;
    double lat2_rad = lat2 * PI / 180.0;
    double lon2_rad = lon2 * PI / 180.0;
    
    // Haversine formula
    double dlat = lat2_rad - lat1_rad;
    double dlon = lon2_rad - lon1_rad;
    
    double a = sin(dlat/2) * sin(dlat/2) + 
               cos(lat1_rad) * cos(lat2_rad) * 
               sin(dlon/2) * sin(dlon/2);
    double c = 2 * atan2(sqrt(a), sqrt(1-a));
    
    return EARTH_RADIUS_KM * c;
}

void generate_waypoints(FlightRoute* route, double interval_km) {
    // Calculate total distance
    route->total_distance = haversine_distance(
        route->origin_lat, route->origin_lon,
        route->dest_lat, route->dest_lon
    );
    
    // Calculate number of waypoints needed
    int num_segments = (int)(route->total_distance / interval_km) + 1;
    if (num_segments > MAX_WAYPOINTS) {
        num_segments = MAX_WAYPOINTS;
    }
    
    route->num_waypoints = num_segments;
    
    // Generate waypoints using great circle interpolation
    for (int i = 0; i < num_segments; i++) {
        double fraction = (double)i / (num_segments - 1);
        
        // Convert to radians
        double lat1 = route->origin_lat * PI / 180.0;
        double lon1 = route->origin_lon * PI / 180.0;
        double lat2 = route->dest_lat * PI / 180.0;
        double lon2 = route->dest_lon * PI / 180.0;
        
        // Calculate angular distance
        double d = route->total_distance / EARTH_RADIUS_KM;
        
        // Spherical interpolation (slerp)
        double a = sin((1 - fraction) * d) / sin(d);
        double b = sin(fraction * d) / sin(d);
        
        double x = a * cos(lat1) * cos(lon1) + b * cos(lat2) * cos(lon2);
        double y = a * cos(lat1) * sin(lon1) + b * cos(lat2) * sin(lon2);
        double z = a * sin(lat1) + b * sin(lat2);
        
        // Convert back to lat/lon
        double lat = atan2(z, sqrt(x*x + y*y));
        double lon = atan2(y, x);
        
        route->waypoints[i].latitude = lat * 180.0 / PI;
        route->waypoints[i].longitude = lon * 180.0 / PI;
        route->waypoints[i].distance_from_start = fraction * route->total_distance;
        route->waypoints[i].segment_number = i + 1;
    }
}

void print_route_summary(FlightRoute* route) {
    printf("\n=== Flight Route Summary ===\n");
    printf("Route: %s → %s\n", route->origin_name, route->destination_name);
    printf("Total Distance: %.1f km\n", route->total_distance);
    printf("Number of Waypoints: %d\n", route->num_waypoints);
    printf("\nWaypoints:\n");
    
    for (int i = 0; i < route->num_waypoints; i++) {
        printf("  WP%d: (%.4f, %.4f) @ %.0f km\n",
               route->waypoints[i].segment_number,
               route->waypoints[i].latitude,
               route->waypoints[i].longitude,
               route->waypoints[i].distance_from_start);
    }
    printf("\n");
}