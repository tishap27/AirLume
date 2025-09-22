#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "riskcalc.h"

// Physical constants
#define FAIR_WEATHER_FIELD 120.0        // V/m (fair weather electric field)
#define BREAKDOWN_FIELD 3000000.0       // V/m (air breakdown threshold)
#define CHARGE_DENSITY_CONSTANT 8.85e-12 // F/m (vacuum permittivity)
#define VACUUM_PERMITTIVITY 8.85e-12    // F/m
#define GAS_CONSTANT 287.05             // J/(kg·K) for dry air
#define KELVIN_OFFSET 273.15            // Convert C to K
#define PASCHEN_A 112.50                // Paschen constant for air (V/(Pa·m))
#define PASCHEN_B 2737.50               // Paschen constant for air (V/(Pa·m))

WeatherData parse_weather_data(const char* weather_line) {
    WeatherData weather = {20.0, 60.0, 1013.0, 5.0}; // defaults
    
    // Look for WEATHER_DATA: prefix
    const char* data_start = strstr(weather_line, "WEATHER_DATA:");
    if (data_start) {
        data_start += 13; // Skip "WEATHER_DATA:"
        sscanf(data_start, "%lf,%lf,%lf,%lf", 
               &weather.temperature, &weather.humidity, 
               &weather.pressure, &weather.wind_speed);
        // For NOW, assuming cruise altitude of 10km
        weather.altitude = 10000.0;
    }
    
    return weather;
}

LightningRisk calculate_lightning_risk(WeatherData weather) {
    LightningRisk risk;
    
    //Calculate air density with altitude correction
    risk.air_density = calculate_air_density(weather.pressure, weather.temperature, weather.altitude);
    // Calculate atmospheric conductivity Higher temperature = higher conductivity  ; Lower pressure = lower conductivity
    double base_conductivity = 3.0e-15; // S/m (typical fair weather)
    double temp_factor = exp((weather.temperature - 15.0) / 100.0);
    double pressure_factor = 1013.25 / weather.pressure; // normalize to sea level
    
    risk.conductivity = base_conductivity * temp_factor * pressure_factor;

    //Electric field calculation
    risk.electric_field = FAIR_WEATHER_FIELD + fabs(risk.charge_density / VACUUM_PERMITTIVITY);
    
    // Paschen's Law breakdown voltage (assume 1cm gap for aircraft surface)
    risk.breakdown_voltage = calculate_paschen_breakdown(weather.pressure, 0.01);
    
     double field_risk = 0.0;
    if (risk.electric_field > FAIR_WEATHER_FIELD) {
        field_risk = (risk.electric_field - FAIR_WEATHER_FIELD) / 10000.0;
    }
    
    double humidity_risk = fmax(0, (weather.humidity - 80.0) / 20.0);
    double pressure_risk = fmax(0, (1013.25 - weather.pressure) / 200.0);
    double breakdown_risk = 0.0;
    
    if (risk.breakdown_voltage < 500000.0) { // Less than 500kV is concerning
        breakdown_risk = (500000.0 - risk.breakdown_voltage) / 500000.0;
    }
    
    // Weighted combination of risk factors
    double total_risk = (field_risk * 0.4 + humidity_risk * 0.3 + 
                        pressure_risk * 0.2 + breakdown_risk * 0.1);
    
    risk.lightning_probability = fmax(0, fmin(total_risk * 100, 15.0)); // Cap at 15%
    
    return risk;

}
double calculate_paschen_breakdown(double pressure, double gap_distance) {
    // Paschen's Law: V_b = (A * p * d) / ln(B * p * d) ; A and B constants
    // where p = pressure in Pa, d = gap distance in meters
    
    double pressure_pa = pressure * 100.0; // Convert hPa to Pa
    double pd = pressure_pa * gap_distance;
    
    if (pd <= 0) return 1000000.0; // Return high value for invalid input
    
    double breakdown_voltage = (PASCHEN_A * pd) / log(PASCHEN_B * pd);
    
    return breakdown_voltage;
}

double calculate_air_density(double pressure, double temperature, double altitude) {
    // Use ideal gas law with altitude correction   ; p(rho) = p / (R * T) where T is in Kelvin
    
    double temp_kelvin = temperature + KELVIN_OFFSET;
    double pressure_pa = pressure * 100.0; // Convert hPa to Pa
    
    // Basic altitude correction (basic barometric formula for now)
    double altitude_factor = exp(-altitude / 8400.0); // 8.4km scale height
    double corrected_pressure = pressure_pa * altitude_factor;
    
    double density = corrected_pressure / (GAS_CONSTANT * temp_kelvin);
    
    return density;
}

double charge_separation(WeatherData weather, double air_density) {
   
    
    // Base charge density
    double base_charge = 1.0e-18; // C/m³
    
    // Wind-driven charge separation (stronger winds = more separation)
    double wind_factor = 1.0 + pow(weather.wind_speed / 10.0, 1.5);
    
    // Humidity effect (water droplets enhance charge separation)
    double humidity_factor = 1.0;
    if (weather.humidity > 70.0) {
        humidity_factor = 1.0 + pow((weather.humidity - 70.0) / 30.0, 2.0);
    }
    // Temperature gradient effect (convection drives charge separation)
    double temp_gradient_factor = 1.0;
    if (weather.temperature > 25.0) {
        temp_gradient_factor = 1.0 + (weather.temperature - 25.0) / 50.0;
    }
    
    // Air density effect (thinner air = less charge retention)
    double density_factor = air_density / 1.225; // Normalize to sea level density
    
    double charge_density = base_charge * wind_factor * humidity_factor * 
                           temp_gradient_factor * density_factor;
    
    return charge_density;
}

void print_risk_assessment(LightningRisk risk) {
    printf("\n=== Lightning Risk Assessment ===\n");
    printf("Air Density: %.3f kg/m³\n", risk.air_density);
    printf("Atmospheric Conductivity: %.2e S/m\n", risk.conductivity);
    printf("Charge Density: %.2e C/m³\n", risk.charge_density);
    printf("Electric Field: %.1f V/m\n", risk.electric_field);
    printf("Breakdown Voltage (Paschen): %.0f V\n", risk.breakdown_voltage);
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