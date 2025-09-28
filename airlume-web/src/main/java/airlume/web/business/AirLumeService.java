/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/J2EE/EJB40/StatelessEjbClass.java to edit this template
 */
package airlume.web.business;

import airlume.web.entity.FlightAnalysis;
import jakarta.ejb.Stateless;
import jakarta.ejb.LocalBean;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 *
 * @author Tisha
 */
@Stateless
public class AirLumeService {

    public FlightAnalysis analyzeFlight(String origin, String destination) {
        //call airlume.exe 
        try {
            ProcessBuilder pb = new ProcessBuilder("C:/CST8234/AirLume/build/airlume.exe");
            pb.directory(new File("C:/CST8234/AirLume"));
            Process process = pb.start();
            
            // Read all output
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream())
            );
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
            
            process.waitFor();
            
            // Simple parsing
            return parseBasicOutput(output.toString());
            
        } catch (Exception e) {
            throw new RuntimeException("Analysis failed: " + e.getMessage());
        }
    }
        private FlightAnalysis parseBasicOutput(String output) {
        FlightAnalysis analysis = new FlightAnalysis();
        
        // Parse weather data
        Pattern tempPattern = Pattern.compile("Temperature: ([0-9.]+)°C");
        Matcher tempMatcher = tempPattern.matcher(output);
        if (tempMatcher.find()) {
            analysis.setTemperature(Double.parseDouble(tempMatcher.group(1)));
        }
        
        Pattern humidityPattern = Pattern.compile("Humidity: ([0-9.]+)%");
        Matcher humidityMatcher = humidityPattern.matcher(output);
        if (humidityMatcher.find()) {
            analysis.setHumidity(Double.parseDouble(humidityMatcher.group(1)));
        }
        
        Pattern pressurePattern = Pattern.compile("Pressure: ([0-9.]+) hPa");
        Matcher pressureMatcher = pressurePattern.matcher(output);
        if (pressureMatcher.find()) {
            analysis.setPressure(Double.parseDouble(pressureMatcher.group(1)));
        }
        
        Pattern windPattern = Pattern.compile("Wind Speed: ([0-9.]+) m/s");
        Matcher windMatcher = windPattern.matcher(output);
        if (windMatcher.find()) {
            analysis.setWindSpeed(Double.parseDouble(windMatcher.group(1)));
        }
        
        // Parse lightning probability
        Pattern riskPattern = Pattern.compile("Lightning Probability: ([0-9.]+)%");
        Matcher riskMatcher = riskPattern.matcher(output);
        if (riskMatcher.find()) {
            analysis.setLightningProbability(Double.parseDouble(riskMatcher.group(1)));
        }
        
        // Parse risk level
        if (output.contains("Risk Level: HIGH")) {
            analysis.setRiskLevel("HIGH");
        } else if (output.contains("Risk Level: MEDIUM")) {
            analysis.setRiskLevel("MEDIUM");
        } else {
            analysis.setRiskLevel("LOW");
        }
        
        // Parse Ada safety results
        if (output.contains("SAFETY_STATUS:ACTION_REQUIRED")) {
            analysis.setSafetyStatus("ACTION REQUIRED");
        } else {
            analysis.setSafetyStatus("OPERATIONAL");
        }
        
        // Parse flight level
        Pattern flightLevelPattern = Pattern.compile("New Flight Level: (FL[0-9]+)");
        Matcher flightLevelMatcher = flightLevelPattern.matcher(output);
        if (flightLevelMatcher.find()) {
            analysis.setNewFlightLevel(flightLevelMatcher.group(1));
        }
        
        // Parse alternate airport
        Pattern alternatePattern = Pattern.compile("Alternate Airport: ([A-Z]{4})");
        Matcher alternateMatcher = alternatePattern.matcher(output);
        if (alternateMatcher.find()) {
            analysis.setAlternateAirport(alternateMatcher.group(1));
        }
        
        // Parse fuel reserve
        Pattern fuelPattern = Pattern.compile("Additional Fuel Reserve: ([0-9.E+]+) kg");
        Matcher fuelMatcher = fuelPattern.matcher(output);
        if (fuelMatcher.find()) {
            String fuelStr = fuelMatcher.group(1);
            analysis.setAdditionalFuelReserve(Double.parseDouble(fuelStr));
        }
        
        // Safety check
        analysis.setSafetyCheckPassed(output.contains("SAFETY CHECK: PASSED"));
        
        // Recommendation
        if (output.contains("Route change to avoid high-risk areas")) {
            analysis.setRecommendation("Route modification required for storm avoidance");
        } else {
            analysis.setRecommendation("Current route acceptable");
        }
        
        
        return analysis;
    }
}
