/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */


package airlume.web.presentation;


import airlume.web.business.AirLumeService;
import airlume.web.entity.FlightAnalysis;
import jakarta.enterprise.context.SessionScoped;
import jakarta.faces.context.FacesContext;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import java.io.IOException;
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
    private int flightLevel = 0;  // Default ground-level
    private FlightAnalysis analysis;
    private String errorMessage; 
    private boolean analysisComplete = false;
    
    public String analyzeRoute() {
        try {
            analysisComplete = false;
            errorMessage = null;  // Clear previous errors
            
             // Validate input
        if (origin == null || origin.trim().isEmpty()) {
            errorMessage = "Please enter an origin airport code";
            return null;
        }
        
        if (destination == null || destination.trim().isEmpty()) {
            errorMessage = "Please enter a destination airport code";
            return null;
        }
        
        if (origin.trim().length() < 3 || origin.trim().length() > 4) {
            errorMessage = "Origin airport code must be 3-4 characters (ICAO format)";
            return null;
        }
        
        if (destination.trim().length() < 3 || destination.trim().length() > 4) {
            errorMessage = "Destination airport code must be 3-4 characters (ICAO format)";
            return null;
        }
            
             if (flightLevel > 0) {
                System.out.println("Analyzing at flight level: FL" + flightLevel);
                analysis = airLumeService.analyzeFlight(origin, destination, flightLevel);
            } else {
                System.out.println("Analyzing at ground level");
            analysis = airLumeService.analyzeFlight(origin, destination, flightLevel);
             }
            analysisComplete = true;
        } catch (Exception e) {
            errorMessage = "Analysis failed: " + e.getMessage();
            analysis = null;
            analysisComplete = false;
            System.err.println("Error in analyzeRoute: " + e.getMessage());
            e.printStackTrace();
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
     public int getFlightLevel() {
        return flightLevel;
    }
    
    public void setFlightLevel(int flightLevel) {
        this.flightLevel = flightLevel;
    }
    
    
    public void openGlobe() {
    String globeUrl = "http://localhost:3000"
        + "?origin="      + origin
        + "&destination=" + destination
        + "&flightLevel=" + flightLevel;
    
    try {
        FacesContext.getCurrentInstance()
            .getExternalContext()
            .redirect(globeUrl);
    } catch (IOException e) {
        errorMessage = "Could not open globe: " + e.getMessage();
    }
}
}
