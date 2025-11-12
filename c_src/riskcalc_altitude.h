#ifndef RISKCALC_ALTITUDE_H
#define RISKCALC_ALTITUDE_H

#include "riskcalc.h"

/**
 * Calculate lightning risk at cruise altitude (FL200-FL400)
 * Uses different physics model optimized for high-altitude conditions
 * 
 * @param weather Weather data at cruise altitude
 * @return LightningRisk structure with risk percentage
 */
LightningRisk calculate_lightning_risk_altitude(WeatherData weather);

/**
 * Calculate ice crystal density at cruise altitude
 * Accounts for different charging mechanisms at high altitude
 */
double calculate_ice_crystal_density_altitude(WeatherData weather);

/**
 * Calculate E-field at cruise altitude
 * Uses altitude-specific pressure and temperature thresholds
 */
double calculate_cloud_ground_potential_altitude(WeatherData weather, double air_density, double ice_density);

#endif // RISKCALC_ALTITUDE_H