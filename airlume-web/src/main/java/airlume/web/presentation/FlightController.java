/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package airlume.web.presentation;


import airlume.web.business.AirLumeService;
import airlume.web.entity.FlightAnalysis;
import jakarta.enterprise.context.SessionScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import java.io.Serializable;

/**
 *
 * @author Tisha
 */
@Named
@SessionScoped
public class FlightController implements Serializable {
    
    @Inject
    private AirLumeService airLumeService;
    
    private String origin = "CYOW";
    private String destination = "CYYZ";
    private FlightAnalysis analysis;
    private String errorMessage; 
    private boolean analysisComplete = false;
    
    public String analyzeRoute() {
        try {
            analysisComplete = false;
            errorMessage = null;  // Clear previous errors
            analysis = airLumeService.analyzeFlight(origin, destination);
            analysisComplete = true;
        } catch (Exception e) {
            errorMessage = "Analysis failed: " + e.getMessage();
            analysis = null;
            analysisComplete = false;
        }
        return null;
    }
    
    
    // Getters/setters
    public String getOrigin() { 
        return origin; 
    }
    public void setOrigin(String origin) {
        this.origin = origin;
    }
    
    public String getDestination() { 
        return destination;
    }
    public void setDestination(String destination) {
        this.destination = destination; 
    }
    
    public FlightAnalysis getAnalysis() { 
        return analysis;
    }
    public String getErrorMessage() { 
        return errorMessage; 
    }
    public boolean isAnalysisComplete() { 
        return analysisComplete; 
    }
}
