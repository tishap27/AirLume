#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "riskcalc_altitude.h"

// Physical constants (same as ground model)
#define FAIR_WEATHER_FIELD 120.0
#define BREAKDOWN_FIELD 3000000.0
#define VACUUM_PERMITTIVITY 8.85e-12
#define GAS_CONSTANT 287.05
#define KELVIN_OFFSET 273.15
#define GRAVITY 9.81

/**
 * ALTITUDE-SPECIFIC PHYSICS MODEL
 * 
 * Key differences from ground model:
 * 1. Pressure: 300 hPa is NORMAL (not low pressure storm)
 * 2. Temperature: -50°C to -60°C is NORMAL (not cold front)
 * 3. Ice charging: Wider temperature range (-70°C to -20°C)
 * 4. E-field thresholds: Lower baseline due to thin air
 */

double calculate_ice_crystal_density_altitude(WeatherData weather) {
    // At cruise altitude, temperature is ALREADY at correct altitude
    // (Python has applied lapse rate)
    double temp_at_altitude = weather.temperature;
    
    double ice_density = 0.0;
    
    // ALTITUDE-SPECIFIC charging zone: -70°C to -20°C
    // (Much wider than ground-level -40°C to -10°C)
    double min_temp = -70.0;
    double max_temp = -20.0;
    double optimal_temp = -45.0;  // Peak charging at FL300
    
    if (temp_at_altitude < max_temp && temp_at_altitude > min_temp) {
        // Calculate how close to optimal temperature
        double temp_range = (max_temp - min_temp) / 2.0;
        double temp_factor = 1.0 - (fabs(temp_at_altitude - optimal_temp) / temp_range);
        
        if (temp_factor < 0.0) temp_factor = 0.0;
        if (temp_factor > 1.0) temp_factor = 1.0;
        
        // Humidity effect (reduced humidity at altitude)
        double humidity_factor = weather.humidity / 100.0;
        
        // Wind effect (stronger winds at altitude)
        double wind_factor = 1.0 + (weather.wind_speed / 15.0);  // Normalized for jet stream
        
        // Base ice crystal concentration at altitude
        double base_density = 800.0;  // Slightly lower than ground (less moisture)
        
        ice_density = base_density * temp_factor * humidity_factor * wind_factor;
    }
    
    // Minimal ice formation outside charging zone
    if (temp_at_altitude <= max_temp && ice_density == 0.0) {
        ice_density = 50.0;  // Baseline ice presence
    }
    
    return ice_density;
}

double calculate_cloud_ground_potential_altitude(WeatherData weather, double air_density, double ice_density) {
    double base_potential = 0.0;
    
    // 1. Ice crystal charge separation (still primary mechanism)
    double ice_charge_contribution = 0.0;
    if (ice_density > 50.0) {
        ice_charge_contribution = sqrt(ice_density) * 35.0;  // Reduced from 50.0 (thinner air)
    }
    
    // 2. ALTITUDE-ADJUSTED humidity contribution
    // At altitude, even moderate humidity (>40%) can indicate nearby storm
    double humidity_contribution = 0.0;
    if (weather.humidity > 40.0) {
        humidity_contribution = (weather.humidity - 40.0) * 15.0;  // Lower baseline
    }
    
    // 3. ALTITUDE-SPECIFIC pressure contribution
    // Normal cruise: 300 hPa
    // Storm nearby: < 295 hPa (pressure drops even at altitude)
    double pressure_contribution = 0.0;
    double normal_cruise_pressure = 300.0;
    
    if (weather.pressure < normal_cruise_pressure - 3.0) {
        // Significant pressure drop at altitude = storm system
        pressure_contribution = (normal_cruise_pressure - weather.pressure) * 50.0;
    }
    
    // 4. Wind shear (more important at altitude)
    double wind_contribution = 0.0;
    if (weather.wind_speed > 8.0) {  // Higher threshold (jet stream)
        wind_contribution = (weather.wind_speed - 8.0) * 25.0;
    }
    
    // Combine all mechanisms
    base_potential = ice_charge_contribution + 
                    humidity_contribution + 
                    pressure_contribution + 
                    wind_contribution;
    
    // Fair weather field baseline (reduced at altitude)
    base_potential += FAIR_WEATHER_FIELD * 0.7;  // Thinner air = lower baseline
    
    return base_potential;
}

LightningRisk calculate_lightning_risk_altitude(WeatherData weather) {
    LightningRisk risk;
    
    printf("  [ALTITUDE MODEL] T=%.1f°C, H=%.0f%%, P=%.0f hPa, Alt=%.0fm\n", 
           weather.temperature, weather.humidity, weather.pressure, weather.altitude);
    
    // Calculate air density
    risk.air_density = calculate_air_density(weather.pressure, weather.temperature, weather.altitude);
    
    // Atmospheric conductivity (same as ground)
    double base_conductivity = 3.0e-15;
    double temp_factor = exp((weather.temperature - 15.0) / 100.0);
    double pressure_factor = 1013.25 / weather.pressure;
    risk.conductivity = base_conductivity * temp_factor * pressure_factor;
    
    // ALTITUDE-SPECIFIC ice crystal density
    risk.ice_crystal_density = calculate_ice_crystal_density_altitude(weather);
    
    // ALTITUDE-SPECIFIC E-field
    risk.electric_field = calculate_cloud_ground_potential_altitude(weather, risk.air_density, risk.ice_crystal_density);
    
    // Charge density calculation (same as ground)
    risk.charge_density = charge_separation(weather, risk.air_density);
    
    // Breakdown voltage (same as ground)
    risk.breakdown_voltage = calculate_paschen_breakdown(weather.pressure, 0.01);
    
    // ALTITUDE-ADJUSTED risk thresholds
    // At cruise altitude, normal conditions should yield LOW risk
    double field_risk = 0.0;
    if (risk.electric_field < 250.0) {
        field_risk = 0.05;  // Very low (normal cruise)
    } else if (risk.electric_field < 450.0) {
        field_risk = 0.15;  // Low
    } else if (risk.electric_field < 700.0) {
        field_risk = 0.30;  // Moderate
    } else if (risk.electric_field < 1000.0) {
        field_risk = 0.50;  // Elevated
    } else if (risk.electric_field < 1500.0) {
        field_risk = 0.70;  // High
    } else {
        field_risk = 0.90;  // Critical
    }
    
    // Ice crystal risk (reduced importance at altitude)
    double ice_risk = 0.0;
    if (risk.ice_crystal_density > 300.0) {
        ice_risk = fmin((risk.ice_crystal_density / 2000.0), 1.0);
    }
    
    // Environmental risks (altitude-adjusted)
    double humidity_risk = fmax(0, (weather.humidity - 40.0) / 60.0);  // Lower baseline
    
    double pressure_risk = 0.0;
    if (weather.pressure < 297.0) {  // Below normal cruise pressure
        pressure_risk = fmax(0, (300.0 - weather.pressure) / 20.0);
    }
    
    // Weighted combination (altitude model)
    double total_risk = (field_risk * 0.40) +       // E-field (most important)
                       (ice_risk * 0.25) +          // Ice crystals (still important)
                       (humidity_risk * 0.15) +     // Humidity indicator
                       (pressure_risk * 0.20);      // Pressure deviation
    
    risk.lightning_probability = fmax(0, fmin(total_risk * 100, 100.0));
    
    printf("  [ALTITUDE MODEL] E-field=%.1f V/m, Ice=%.0f, Risks: field=%.2f, ice=%.2f, hum=%.2f, press=%.2f\n",
           risk.electric_field, risk.ice_crystal_density, 
           field_risk, ice_risk, humidity_risk, pressure_risk);
    printf("  [ALTITUDE MODEL] Risk=%.1f%%\n", risk.lightning_probability);
    
    return risk;
}