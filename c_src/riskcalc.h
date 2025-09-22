#ifndef RISKCALC_H
#define RISKCALC_H

typedef struct {
    double temperature;    // Celsius
    double humidity;       // Percentage
    double pressure;       // hPa
    double wind_speed;     // m/s
} WeatherData;

typedef struct {
    double conductivity;          // S/m (Siemens per meter)
    double charge_density;        // C/m³ 
    double electric_field;        // V/m
    double lightning_probability; // Percentage 
} LightningRisk;

// Function prototypes
WeatherData parse_weather_data(const char* weather_line);
LightningRisk calculate_lightning_risk(WeatherData weather);
void print_risk_assessment(LightningRisk risk);

#endif