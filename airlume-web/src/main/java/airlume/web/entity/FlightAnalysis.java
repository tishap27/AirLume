/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package airlume.web.entity;

import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author Tisha
 */
public class FlightAnalysis {
    // Weather data from Python
    private double temperature;
    private double humidity;
    private double pressure;
    private double windSpeed;
    
    // Physics calculations from C
    private double lightningProbability;
    private String riskLevel;
    
    // And Ada safety results
     private String safetyStatus;
    private String newFlightLevel;
    private String alternateAirport;
    private double additionalFuelReserve;
    private boolean safetyCheckPassed;
    private String recommendation;
    
     // Route information
    private String origin;
    private String destination;
    private double totalDistance;
    private double averageRisk;
    
    // Waypoints list
    private List<Waypoint> waypoints = new ArrayList<>();

    public FlightAnalysis() {}
    
    // getters/setters
    
    public double getTemperature() { return temperature; }
    public void setTemperature(double temperature) { this.temperature = temperature; }
    
    public double getHumidity() { return humidity; }
    public void setHumidity(double humidity) { this.humidity = humidity; }
    
    public double getPressure() { return pressure; }
    public void setPressure(double pressure) { this.pressure = pressure; }
    
    public double getWindSpeed() { return windSpeed; }
    public void setWindSpeed(double windSpeed) { this.windSpeed = windSpeed; }

    
    public double getLightningProbability() { 
        return lightningProbability;
    }
    public void setLightningProbability(double lightningProbability) { 
        this.lightningProbability = lightningProbability; 
    }
    
    public String getRiskLevel() { 
        return riskLevel; 
    }
    public void setRiskLevel(String riskLevel) { 
        this.riskLevel = riskLevel; 
    }
    
    
    public String getSafetyStatus() { return safetyStatus; }
    public void setSafetyStatus(String safetyStatus) { this.safetyStatus = safetyStatus; }
    
    public String getNewFlightLevel() { return newFlightLevel; }
    public void setNewFlightLevel(String newFlightLevel) { this.newFlightLevel = newFlightLevel; }
    
    public String getAlternateAirport() { return alternateAirport; }
    public void setAlternateAirport(String alternateAirport) { this.alternateAirport = alternateAirport; }
    
    public double getAdditionalFuelReserve() { return additionalFuelReserve; }
    public void setAdditionalFuelReserve(double additionalFuelReserve) { 
        this.additionalFuelReserve = additionalFuelReserve; 
    }
    
    public boolean isSafetyCheckPassed() { return safetyCheckPassed; }
    public void setSafetyCheckPassed(boolean safetyCheckPassed) { 
        this.safetyCheckPassed = safetyCheckPassed; 
    }

    public String getRecommendation() {
        return recommendation; 
    }
    public void setRecommendation(String recommendation) { 
        this.recommendation = recommendation;
    }
    
  

    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    
    public double getTotalDistance() { return totalDistance; }
    public void setTotalDistance(double totalDistance) { this.totalDistance = totalDistance; }
    
    public double getAverageRisk() { return averageRisk; }
    public void setAverageRisk(double averageRisk) { this.averageRisk = averageRisk; }
    
    public List<Waypoint> getWaypoints() { return waypoints; }
    public void setWaypoints(List<Waypoint> waypoints) { this.waypoints = waypoints; }
    
    public void addWaypoint(Waypoint waypoint) {
        this.waypoints.add(waypoint);
    }
    
    public int getWaypointCount() {
        return waypoints.size();
    }
    
    public boolean hasWaypoints() {
        return waypoints != null && !waypoints.isEmpty();
    }
    
    }
