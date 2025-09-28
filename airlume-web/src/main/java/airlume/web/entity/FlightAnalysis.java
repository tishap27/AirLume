/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package airlume.web.entity;

/**
 *
 * @author Tisha
 */
public class FlightAnalysis {
    private double lightningProbability;
    private String riskLevel;
    private String recommendation;
    
    public FlightAnalysis() {}
    
    // getters/setters
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
    
    public String getRecommendation() {
        return recommendation; 
    }
    public void setRecommendation(String recommendation) { 
        this.recommendation = recommendation;
    }
}
