#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "riskcalc.h"

// Physical constants
#define FAIR_WEATHER_FIELD 120.0        // V/m (fair weather electric field)
#define BREAKDOWN_FIELD 3000000.0       // V/m (air breakdown threshold)
#define CHARGE_DENSITY_CONSTANT 8.85e-12 // F/m (vacuum permittivity)

WeatherData parse_weather_data(const char* weather_line) {
    WeatherData weather = {20.0, 60.0, 1013.0, 5.0}; // defaults
    
    // Look for WEATHER_DATA: prefix
    const char* data_start = strstr(weather_line, "WEATHER_DATA:");
    if (data_start) {
        data_start += 13; // Skip "WEATHER_DATA:"
        sscanf(data_start, "%lf,%lf,%lf,%lf", 
               &weather.temperature, &weather.humidity, 
               &weather.pressure, &weather.wind_speed);
    }
    
    return weather;
}

LightningRisk calculate_lightning_risk(WeatherData weather) {
    LightningRisk risk;
    
    // Calculate atmospheric conductivity Higher temperature = higher conductivity  ; Lower pressure = lower conductivity
    double base_conductivity = 3.0e-15; // S/m (typical fair weather)
    double temp_factor = exp((weather.temperature - 15.0) / 100.0);
    double pressure_factor = 1013.25 / weather.pressure; // normalize to sea level
    
    risk.conductivity = base_conductivity * temp_factor * pressure_factor;
    
    // Estimating charge density based on convection (wind)   Higher wind = more charge separation
    double base_charge = 1.0e-18; // C/m³ 
    double convection_factor = 1.0 + (weather.wind_speed / 100.0);
    double humidity_factor = 1.0 + ((weather.humidity - 50.0) / 200.0);
    
    risk.charge_density = base_charge * convection_factor * humidity_factor;
    
    // Calculating electric field using simplified model E = p / e₀ (Gauss's law approximation)
    risk.electric_field = FAIR_WEATHER_FIELD + fabs(risk.charge_density / CHARGE_DENSITY_CONSTANT);
    
    // Calculating lightning probability  Risk increases with field strength and humidity
    double field_risk = fmax(0, (risk.electric_field - FAIR_WEATHER_FIELD) / 5000.0);
    double humidity_risk = fmax(0, (weather.humidity - 85.0) / 15.0);
    
    // Combining factors (field strength 70%, humidity 30%)
    double risk_probability = (field_risk * 0.7 + humidity_risk * 0.3) * 0.01;
    
    // Cap at reasonable maximum (5% per hour)
    risk.lightning_probability = fmax(0, fmin(risk_probability * 100, 5.0));
    
    return risk;
}

void print_risk_assessment(LightningRisk risk) {
    printf("\n=== Lightning Risk Assessment ===\n");
    printf("Atmospheric Conductivity: %.2e S/m\n", risk.conductivity);
    printf("Charge Density: %.2e C/m³\n", risk.charge_density);
    printf("Electric Field: %.1f V/m\n", risk.electric_field);
    printf("Lightning Probability: %.2f%%\n", risk.lightning_probability);
    
    // Risk categories
    if (risk.lightning_probability < 0.5) {
        printf("Risk Level: LOW - Safe to fly\n");
    } else if (risk.lightning_probability < 2.0) {
        printf("Risk Level: MODERATE - Monitor conditions\n");
    } else {
        printf("Risk Level: HIGH - Consider route change\n");
    }
    
    // Output for Ada to read
    printf("LIGHTNING_RISK:%.2f\n", risk.lightning_probability);
}