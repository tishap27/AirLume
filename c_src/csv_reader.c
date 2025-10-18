// ============================================================================
// FILE: csv_reader.c
// ============================================================================
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "csv_reader.h"

#define EARTH_RADIUS_KM 6371.0

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/*double haversine_distance(double lat1, double lon1, double lat2, double lon2) {
    double lat1_rad = lat1 * M_PI / 180.0;
    double lon1_rad = lon1 * M_PI / 180.0;
    double lat2_rad = lat2 * M_PI / 180.0;
    double lon2_rad = lon2 * M_PI / 180.0;
    
    double dlat = lat2_rad - lat1_rad;
    double dlon = lon2_rad - lon1_rad;
    
    double a = sin(dlat/2) * sin(dlat/2) + 
               cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2) * sin(dlon/2);
    double c = 2 * atan2(sqrt(a), sqrt(1-a));
    
    return EARTH_RADIUS_KM * c;
}*/

EFieldRecord find_nearest_efield(const char* csv_filename, double lat, double lon, int altitude_ft) {
    FILE* file = fopen(csv_filename, "r");
    EFieldRecord nearest_record = {0};
    EFieldRecord temp_record;
    char line[512];
    int first_record = 1;
    double min_distance = 999999.0;
    
    if (file == NULL) {
        printf("Error: Cannot open CSV file %s\n", csv_filename);
        nearest_record.e_field_total_V_m = -1.0;
        return nearest_record;
    }
    
    // Skip header line
    fgets(line, sizeof(line), file);
    
    while (fgets(line, sizeof(line), file)) {
        if (sscanf(line, "%[^,],%lf,%lf,%d,%lf,%lf,%lf,%lf,%lf,%lf,%lf,%[^,],%[^\n]",
                   temp_record.timestamp,
                   &temp_record.latitude,
                   &temp_record.longitude,
                   &temp_record.altitude_ft,
                   &temp_record.e_field_total_V_m,
                   &temp_record.e_field_vertical_V_m,
                   &temp_record.e_field_horizontal_V_m,
                   &temp_record.temperature_C,
                   &temp_record.pressure_hPa,
                   &temp_record.humidity_percent,
                   &temp_record.ion_density_per_cm3,
                   temp_record.weather_condition,
                   temp_record.route_name) == 13) {
            
            double distance = haversine_distance(lat, lon, 
                                                temp_record.latitude, 
                                                temp_record.longitude);
            
            // Altitude penalty: 1000 ft difference = ~10 km equivalent
            double altitude_penalty = abs(altitude_ft - temp_record.altitude_ft) / 100.0;
            double total_distance = distance + altitude_penalty;
            
            if (first_record || total_distance < min_distance) {
                min_distance = total_distance;
                nearest_record = temp_record;
                first_record = 0;
            }
        }
    }
    
    fclose(file);
    
    if (!first_record) {
        printf("\n=== E-Field Data Found ===\n");
        printf("Nearest CSV Record: %.1f km away\n", min_distance);
        printf("Location: (%.4f, %.4f) @ %d ft\n", 
               nearest_record.latitude, nearest_record.longitude, nearest_record.altitude_ft);
        printf("E-Field: %.2f V/m\n", nearest_record.e_field_total_V_m);
        printf("Condition: %s\n", nearest_record.weather_condition);
        printf("Route: %s\n", nearest_record.route_name);
    } else {
        printf("Error: No valid records found in CSV\n");
        nearest_record.e_field_total_V_m = -1.0;
    }
    
    return nearest_record;
}


// ============================================================================
// FILE: riskcalc.h (UPDATED with CSV function)
// ============================================================================
#ifndef RISKCALC_H
#define RISKCALC_H

#include "csv_reader.h"  // Add this

typedef struct {
    double temperature;   // Celsius
    double humidity;      // %
    double pressure;      // hPa
    double wind_speed;    // m/s
    double altitude;      // meters
} WeatherData;

typedef struct {
    double air_density;           // kg/m³
    double conductivity;          // S/m
    double charge_density;        // C/m³
    double electric_field;        // V/m
    double breakdown_voltage;     // V
    double lightning_probability; // %
} LightningRisk;

WeatherData parse_weather_data(const char* weather_line);
LightningRisk calculate_lightning_risk(WeatherData weather);
LightningRisk calculate_lightning_risk_from_efield(WeatherData weather, EFieldRecord efield);  // NEW
double calculate_paschen_breakdown(double pressure, double gap_distance);
double calculate_air_density(double pressure, double temperature, double altitude);
double charge_separation(WeatherData weather, double air_density);
void print_risk_assessment(LightningRisk risk);
void write_risk_to_file(double lightning_risk);

#endif


