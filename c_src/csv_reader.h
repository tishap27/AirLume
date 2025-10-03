// ============================================================================
// FILE: csv_reader.h
// ============================================================================
#ifndef CSV_READER_H
#define CSV_READER_H

typedef struct {
    char timestamp[20];
    double latitude;
    double longitude;
    int altitude_ft;
    double e_field_total_V_m;
    double e_field_vertical_V_m;
    double e_field_horizontal_V_m;
    double temperature_C;
    double pressure_hPa;
    double humidity_percent;
    double ion_density_per_cm3;
    char weather_condition[30];
    char route_name[50];
} EFieldRecord;

EFieldRecord find_nearest_efield(const char* csv_filename, double lat, double lon, int altitude_ft);
double haversine_distance(double lat1, double lon1, double lat2, double lon2);

#endif
