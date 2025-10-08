

#include "csv_reader.h" 

#ifndef RISKCALC_H
#define RISKCALC_H

typedef struct {
    double temperature;    // Celsius
    double humidity;       // Percentage
    double pressure;       // hPa
    double wind_speed;     // m/s
    double altitude;       //meters(flight alt) -- fixed in C code for now 
} WeatherData;

typedef struct {
    double conductivity;          // S/m (Siemens per meter)
    double charge_density;        // C/m³ 
    double electric_field;        // V/m
    double lightning_probability; // Percentage 
    double breakdown_voltage;     // V (Paschen's law)
    double air_density;          // kg/m³ (altitude corrected)
   // double cape;                  // J/kg (Convective Available Potential Energy)
   double ice_crystal_density;   // crystals/L
} LightningRisk;

// Function prototypes
WeatherData parse_weather_data(const char* weather_line);
LightningRisk calculate_lightning_risk(WeatherData weather);
void print_risk_assessment(LightningRisk risk);
void write_risk_to_file(double lightning_risk);

double calculate_paschen_breakdown(double pressure, double gap_distance);
double calculate_air_density(double pressure, double temperature, double altitude);
double charge_separation(WeatherData weather, double air_density);

LightningRisk calculate_lightning_risk_from_efield(WeatherData weather, EFieldRecord efield); 

double calculate_ice_crystal_density(WeatherData weather, double altitude_m);
double calculate_cloud_ground_potential(WeatherData weather, double air_density, double ice_density);

//CAPE stuff



#endif