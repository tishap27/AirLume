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
#define GRAVITY 9.81                    // m/s²
#define CP_AIR 1005.0                   // Specific heat of air (J/(kg·K))
#define EARTH_RADIUS 6371000.0          // meters


WeatherData parse_weather_data(const char* weather_line) {
    WeatherData weather = {20.0, 60.0, 1013.0, 5.0, 10000.0};
    
    const char* data_start = strstr(weather_line, "WEATHER_DATA:");
    if (data_start) {
        data_start += 13;
        
        // Parse and verify
        int count = sscanf(data_start, "%lf,%lf,%lf,%lf", 
                          &weather.temperature, 
                          &weather.humidity, 
                          &weather.pressure, 
                          &weather.wind_speed);
        
        if (count == 4) {
            weather.altitude = 10000.0;
            printf("[DEBUG] Successfully parsed: %.2f, %.2f, %.2f, %.2f\n",
                   weather.temperature, weather.humidity, 
                   weather.pressure, weather.wind_speed);
        } else {
            printf("[DEBUG] Parse failed: only got %d values\n", count);
        }
    }
    
    return weather;
}
LightningRisk calculate_lightning_risk(WeatherData weather) {
    LightningRisk risk;
     printf("[NEW CODE] calculate_lightning_risk() called with T=%.1f, H=%.1f\n", weather.temperature, weather.humidity);
    
    //Calculate air density with altitude correction
    risk.air_density = calculate_air_density(weather.pressure, weather.temperature, weather.altitude);

    // Calculate atmospheric conductivity Higher temperature = higher conductivity  ; Lower pressure = lower conductivity
    double base_conductivity = 3.0e-15; // S/m (typical fair weather)
    double temp_factor = exp((weather.temperature - 15.0) / 100.0);
    double pressure_factor = 1013.25 / weather.pressure; // normalize to sea level
    
    risk.conductivity = base_conductivity * temp_factor * pressure_factor;

    risk.charge_density = charge_separation(weather, risk.air_density);

    
    //Calculate CAPE (atmospheric instability)
   // risk.cape = calculate_cape(weather, risk.air_density);

    //Calculate ice crystal density at typical thunderstorm altitude (8-12km)
    double avg_storm_altitude = 10000.0; // meters
    risk.ice_crystal_density = calculate_ice_crystal_density(weather, avg_storm_altitude);

    //Calculate charge density using enhanced model
    //risk.charge_density = charge_separation(weather, risk.air_density);


    //Calculate cloud-to-ground potential using all factors
    risk.electric_field = calculate_cloud_ground_potential(weather, risk.air_density, risk.ice_crystal_density);
    
    //Calculate electric field based on atmospheric conditions
    /*double base_field = FAIR_WEATHER_FIELD;
    // Humidity effect (high humidity enables charge accumulation)
    if (weather.humidity > 70.0) {
        base_field += (weather.humidity - 70.0) * 15.0;  // 15 V/m per 1% above 70%
    }
    
    // Pressure effect (low pressure = storms = higher fields)
    if (weather.pressure < 1010.0) {
        base_field += (1010.0 - weather.pressure) * 25.0;  // 25 V/m per hPa below 1010
    }
    
    // Temperature effect (convection drives charge separation)
    if (weather.temperature > 25.0) {
        base_field += (weather.temperature - 25.0) * 12.0;  // 12 V/m per degree above 25°C
    }
    
    // Wind effect (stronger winds = more charge separation)
    if (weather.wind_speed > 5.0) {
        base_field += (weather.wind_speed - 5.0) * 30.0;  // 30 V/m per m/s above 5 m/s
    }*/

    //charge density
    // risk.electric_field = base_field + (risk.charge_density / VACUUM_PERMITTIVITY) * 1e-8;



    // Paschen's Law breakdown voltage (assume 1cm gap for aircraft surface)
    risk.breakdown_voltage = calculate_paschen_breakdown(weather.pressure, 0.01);
    
     double field_risk = 0.0;
    if (risk.electric_field < 400) {
        field_risk = 0.10;  // Very low
    } else if (risk.electric_field < 700) {
        field_risk = 0.35;  // Low
    } else if (risk.electric_field < 1000) {
        field_risk = 0.50;  // Moderate
    } else if (risk.electric_field < 1500) {
        field_risk = 0.65;  // Elevated
    } else if (risk.electric_field < 2500) {
        field_risk = 0.80;  // High
    } else {
        field_risk = 0.90;  // Critical
    }
    

    
    
    //  Ice crystal risk (charge separation mechanism)
    double ice_risk = 0.0;
    if (risk.ice_crystal_density > 500.0) {
        ice_risk = fmin((risk.ice_crystal_density / 3000.0), 1.0);
    }



    double humidity_risk = fmax(0, (weather.humidity - 70.0) / 30.0);
    double pressure_risk = fmax(0, (1013.25 - weather.pressure) / 200.0);

    double breakdown_risk = 0.0;
    if (risk.breakdown_voltage < 500000.0) { // Less than 500kV is concerning
        breakdown_risk = (500000.0 - risk.breakdown_voltage) / 500000.0;
    }
    
    // Weighted combination of risk factors
     double total_risk = (field_risk * 0.35) +      // E-field (primary)
                                                   // Convective instability
                       (ice_risk * 0.20) +         // Charge separation mechanism
                       (humidity_risk * 0.10) +    // Charge accumulation
                       (pressure_risk * 0.10) +    // Storm system indicator
                       (breakdown_risk * 0.05);    // Breakdown proximity
    
    
   // risk.lightning_probability = fmax(0, fmin(total_risk * 100, 100.0)); // Cap at 15%
    
  risk.lightning_probability = fmax(0, fmin(total_risk * 100, 100.0));
    
    // Debug output
    printf("  [DEBUG] T=%.1f°C, H=%.0f%%, P=%.0f hPa, Alt=%.0fm\n", 
           weather.temperature, weather.humidity, weather.pressure, weather.altitude);
    printf("  [DEBUG] E-field=%.1f V/m, Ice=%.0f, Risks: field=%.2f, ice=%.2f, hum=%.2f, press=%.2f\n",
           risk.electric_field, risk.ice_crystal_density, 
           field_risk, ice_risk, humidity_risk, pressure_risk);
    
    return risk;

}



LightningRisk calculate_lightning_risk_from_efield(WeatherData weather, EFieldRecord efield_data) {
    LightningRisk risk;
    
    // Use REAL E-field from CSV instead of calculating it
    risk.electric_field = efield_data.e_field_total_V_m;
    
    // Calculate air density
    risk.air_density = calculate_air_density(weather.pressure, weather.temperature, weather.altitude);
    
    // Atmospheric conductivity
    double base_conductivity = 3.0e-15;
    double temp_factor = exp((weather.temperature - 15.0) / 100.0);
    double pressure_factor = 1013.25 / weather.pressure;
    risk.conductivity = base_conductivity * temp_factor * pressure_factor;
    
    // Charge density from CSV ion density
    risk.charge_density = efield_data.ion_density_per_cm3 * 1.6e-19 * 1e6;
    
    // Paschen's Law breakdown voltage
    risk.breakdown_voltage = calculate_paschen_breakdown(weather.pressure, 0.01);
    

    //Calculate CAPE and ice density even with CSV data
   // risk.cape = calculate_cape(weather, risk.air_density);
    risk.ice_crystal_density = calculate_ice_crystal_density(weather, weather.altitude);


    // Risk calculation based on CSV E-field
    double field_risk = 0.0;
    if (risk.electric_field < 400) {
        field_risk = 0.10;  // Very low
    } else if (risk.electric_field < 700) {
        field_risk = 0.35;  // Low
    } else if (risk.electric_field < 1000) {
        field_risk = 0.50;  // Moderate
    } else if (risk.electric_field < 1500) {
        field_risk = 0.65;  // Elevated
    } else if (risk.electric_field < 2500) {
        field_risk = 0.80;  // High
    } else {
        field_risk = 0.90;  // Critical
    }
    

    //double cape_risk = (risk.cape > 1000.0) ? fmin((risk.cape / 4000.0), 1.0) : 0.0;
    double ice_risk = (risk.ice_crystal_density > 500.0) ? fmin((risk.ice_crystal_density / 3000.0), 1.0) : 0.0;

    double humidity_risk = fmax(0, (weather.humidity - 70.0) / 30.0);
    double pressure_risk = fmax(0, (1013.25 - weather.pressure) / 200.0);
    
    // Heavy weight on E-field (it's the most important factor)
   double total_risk = (field_risk * 0.50) +
                      
                       (ice_risk * 0.15) +
                       (humidity_risk * 0.10) +
                       (pressure_risk * 0.10);


    risk.lightning_probability = total_risk * 100.0;
    
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
    double base_charge = 1.0e-10; // C/m³
    
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
    } else if (weather.temperature < 0.0) {
        // Cold air can also have charge separation (ice crystal effects)
        temp_gradient_factor = 1.0 + fabs(weather.temperature) / 100.0;
    }
    
    // Air density effect (thinner air = less charge retention)
    double density_factor = air_density / 1.225; // Normalize to sea level density
    
    double charge_density = base_charge * wind_factor * humidity_factor * temp_gradient_factor * density_factor;
    
    return charge_density;
}

void print_risk_assessment(LightningRisk risk) {
    printf("\n=== Lightning Risk Assessment ===\n");
    printf("Air Density: %.3f kg/m³\n", risk.air_density);
    printf("Atmospheric Conductivity: %.2e S/m\n", risk.conductivity);
    printf("Charge Density: %.2e C/m³\n", risk.charge_density);
    printf("Electric Field: %.1f V/m\n", risk.electric_field);

    //printf("CAPE (Instability): %.1f J/kg\n", risk.cape);
    printf("Ice Crystal Density: %.0f crystals/L\n", risk.ice_crystal_density);

    printf("Breakdown Voltage (Paschen): %.0f V\n", risk.breakdown_voltage);
    printf("Lightning Probability: %.2f%%\n", risk.lightning_probability);
    
    // Risk categories
    if (risk.lightning_probability < 15.0) {
        printf("Risk Level: LOW - Safe to fly\n");
    } else if (risk.lightning_probability < 30.0) {
        printf("Risk Level: MODERATE - Monitor conditions\n");
    } else if (risk.lightning_probability < 50.0) {
        printf("Risk Level: HIGH - Consider route change\n");
    }else {
        printf("Risk Level: CRITICAL - Immediate reroute required\n");
    }
    
    
    // Output for Ada to read
    printf("LIGHTNING_RISK:%.2f\n", risk.lightning_probability);
}

void write_risk_to_file(double lightning_risk) {
    FILE *risk_file = fopen("lightning_risk.txt", "w");
    if (risk_file != NULL) {
        fprintf(risk_file, "LIGHTNING_RISK:%.2f\n", lightning_risk);
        fclose(risk_file);
        printf("Risk data written to file for Ada system\n");
    } else {
        printf("Error: Could not write risk file for Ada\n");
    }
}




// Ice crystals are critical for charge separation in thunderstorms (non-inductive charging)
double calculate_ice_crystal_density(WeatherData weather, double altitude_m) {
    // Ice crystals form between -10degC and -40degC (optimal at -15degC)
    // This is the "charging zone" in thunderstorms
    
    //double temp_at_altitude = weather.temperature;
    //double temp_kelvin = weather.temperature + KELVIN_OFFSET;
    
    // Estimate temperature at altitude using lapse rate
   // double lapse_rate = 0.0065; // K/m
    double temp_at_altitude = weather.temperature;// - (lapse_rate * altitude_m);
    
    double ice_density = 0.0;
    
    // Charging zone: -40°C to -10°C
    // Charging zone depends on altitude
    // At cruise altitude (FL300): -70°C to -20°C
    // At lower altitude: -40°C to -10°C
    double min_temp, max_temp, optimal_temp;
    
    if (weather.altitude > 5000.0) {
        // High altitude charging zone
        min_temp = -70.0;
        max_temp = -20.0;
        optimal_temp = -45.0;  // Peak charging at FL300
    } else {
        // Low altitude charging zone
        min_temp = -40.0;
        max_temp = -10.0;
        optimal_temp = -15.0;  // Traditional charging zone
    }
    
    if (temp_at_altitude < max_temp && temp_at_altitude > min_temp) {
        double temp_range = (max_temp - min_temp) / 2.0;
        double temp_factor = 1.0 - (fabs(temp_at_altitude - optimal_temp) / temp_range);
        
        if (temp_factor < 0.0) temp_factor = 0.0;
        if (temp_factor > 1.0) temp_factor = 1.0;
        
        // Humidity effect (more moisture = more ice crystals)
        double humidity_factor = weather.humidity / 100.0;
        
        // Wind creates more collision/charge separation
        double wind_factor = 1.0 + (weather.wind_speed / 10.0);
        
        // Base ice crystal concentration (crystals per liter)
        double base_density = 1000.0; // typical thunderstorm value
        
        ice_density = base_density * temp_factor * humidity_factor * wind_factor;
    }
    
    // Supercooled water (0°C to -10°C) also contributes
    if (temp_at_altitude <= 0.0 && temp_at_altitude > -10.0) {
        double supercooled_factor = fabs(temp_at_altitude) / 10.0;
        ice_density += 500.0 * supercooled_factor * (weather.humidity / 100.0);
    }
    
    return ice_density;
}

// Calculate cloud-to-ground potential gradient
// This is the electric field that builds up before lightning discharge
double calculate_cloud_ground_potential(WeatherData weather, double air_density, double ice_density) {
    // Lightning occurs when E-field exceeds breakdown threshold (~3 MV/m)
    // We're calculating the buildup toward that threshold
    
    double base_potential = 0.0;
    
    // 1. Charge separation from ice crystal collisions (primary mechanism)
    // Graupel (soft hail) collides with ice crystals
    // Graupel becomes negatively charged, ice crystals positive
    // This creates vertical charge separation
    double ice_charge_contribution = 0.0;
    if (ice_density > 100.0) {
        // More ice = more collisions = more charge separation
        ice_charge_contribution = sqrt(ice_density) * 50.0; // V/m
    }
    
    // 2. Convective strength (CAPE) determines charge layer height/separation
    // Stronger updrafts = greater vertical charge separation
    double cape_contribution = 0.0;
   /* if (cape > 500.0) {
        // CAPE > 1000 J/kg = severe thunderstorm potential
        cape_contribution = (cape / 1000.0) * 800.0; // V/m
    }*/
    
    // 3. Humidity enables charge accumulation (water droplets hold charge)
    double humidity_contribution = 0.0;
    if (weather.humidity > 70.0) {
        humidity_contribution = (weather.humidity - 70.0) * 25.0; // V/m per %
    }
    
    // 4. Low pressure = storm system = existing E-field
   double pressure_contribution = 0.0;
    
    if (weather.altitude > 5000.0) {
        // At cruise altitude (FL300): normal pressure ~300 hPa
        // Storm system would be BELOW normal (280-290 hPa)
        double normal_cruise_pressure = 300.0;
        if (weather.pressure < normal_cruise_pressure - 5.0) {
            pressure_contribution = (normal_cruise_pressure - weather.pressure) * 30.0;
        }
    } else {
        // At ground level: < 1000 hPa indicates storm
        if (weather.pressure < 1000.0) {
            pressure_contribution = (1013.25 - weather.pressure) * 40.0;
        }
    }
    
    // 5. Wind shear enhances charge separation
    double wind_contribution = 0.0;
    if (weather.wind_speed > 5.0) {
        wind_contribution = (weather.wind_speed - 5.0) * 40.0; // V/m per m/s
    }
    
    // Combine all mechanisms
    base_potential = ice_charge_contribution + cape_contribution + 
                    humidity_contribution + pressure_contribution + 
                    wind_contribution;
    
    // Fair weather field baseline
    base_potential += FAIR_WEATHER_FIELD;
    
    return base_potential;
}
