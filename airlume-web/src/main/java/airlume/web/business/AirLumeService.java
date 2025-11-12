package airlume.web.business;

import airlume.web.entity.FlightAnalysis;
import airlume.web.entity.Waypoint;
import jakarta.ejb.Stateless;
import jakarta.ejb.LocalBean;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import static java.time.Clock.system;
import static java.time.InstantSource.system;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 *
 * @author Tisha
 */
@Stateless
@LocalBean
public class AirLumeService {

    public FlightAnalysis analyzeFlight(String origin, String destination, int flightLevel) {
        try {
           // Validate airport codes first
        if (origin == null || origin.isEmpty() || origin.length() < 3 || origin.length() > 4) {
            throw new RuntimeException("Invalid origin airport code. Must be 3-4 characters.");
        }
        
        if (destination == null || destination.isEmpty() || destination.length() < 3 || destination.length() > 4) {
            throw new RuntimeException("Invalid destination airport code. Must be 3-4 characters.");
        }
        // Validate flight level (0 or 200-400)
        if (flightLevel != 0 && (flightLevel < 200 || flightLevel > 400)) {
            throw new RuntimeException("Invalid flight level. Must be 0 (ground) or FL200-FL400.");
        }
        
        String originCode = origin.toUpperCase();
        String destCode = destination.toUpperCase();
            
            System.out.println("============================================");
            if (flightLevel > 0) {
            int altitudeFt = flightLevel * 100;  // FL300 = 30,000 ft
            System.out.println("Analyzing route: " + originCode + " -> " + destCode + " at FL" + flightLevel);
            
            // Build full command string
            String command = String.format(
                "C:\\CST8234\\AirLume\\build\\airlume.exe %s %s %d",
                originCode,
                destCode,
                altitudeFt
            );
            
            System.out.println("Running: " + command);
            
            ProcessBuilder pb = new ProcessBuilder("cmd.exe", "/c", command);
            pb.directory(new File("C:/CST8234/AirLume"));
            pb.redirectErrorStream(true);
            
            Process process = pb.start();
            
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream())
            );
            StringBuilder output = new StringBuilder();
            String line;
            int lineCount = 0;
            while ((line = reader.readLine()) != null) {
                lineCount++;
                System.out.println("LINE " + lineCount + ": " + line);
                output.append(line).append("\n");
            }
            
            int exitCode = process.waitFor();
            System.out.println("Exit code: " + exitCode);
            System.out.println("Total output lines: " + lineCount);
            System.out.println("============================================");
            
            if (exitCode != 0) {
                throw new RuntimeException("Program failed with exit code: " + exitCode);
            }
            // Validate output contains expected data
            if (!output.toString().contains("WP") && !output.toString().contains("WEATHER_DATA")) {
            System.err.println("=== INVALID OUTPUT ===");
            System.err.println(output.toString());
            throw new RuntimeException("C program produced invalid output - no waypoint or weather data found");
            }
            
            if (output.length() == 0) {
                throw new RuntimeException("No output from program!");
            }
            
            // Parse the output (handles both route and single-point mode)
            FlightAnalysis analysis = parseOutput(output.toString());
            analysis.setOrigin(originCode);
            analysis.setDestination(destCode);
            return analysis;
        } else {
        // <-- ADD ELSE BLOCK HERE after the above closing brace (})
        // Ground-level mode
        System.out.println("Analyzing route: " + originCode + " -> " + destCode + " at ground level");

        String command = String.format(
            "C:\\CST8234\\AirLume\\build\\airlume.exe %s %s",
            originCode,
            destCode
        );

        System.out.println("Running: " + command);

        ProcessBuilder pb = new ProcessBuilder("cmd.exe", "/c", command);
        pb.directory(new File("C:/CST8234/AirLume"));
        pb.redirectErrorStream(true);

        Process process = pb.start();

        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder output = new StringBuilder();
        String line;
        int lineCount = 0;
        while ((line = reader.readLine()) != null) {
            lineCount++;
            System.out.println("LINE " + lineCount + ": " + line);
            output.append(line).append("\n");
        }
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("Program failed with exit code: " + exitCode);
        }

        if (!output.toString().contains("WP") && !output.toString().contains("WEATHER_DATA")) {
            System.err.println("=== INVALID OUTPUT ===");
            System.err.println(output.toString());
            throw new RuntimeException("C program produced invalid output - no waypoint or weather data found");
        }

        if (output.length() == 0) {
            throw new RuntimeException("No output from program!");
        }

        FlightAnalysis analysis = parseOutput(output.toString());
        analysis.setOrigin(originCode);
        analysis.setDestination(destCode);
        return analysis;
    }
 
       } catch (IOException e) {
         e.printStackTrace();
            String errorMsg = "Failed to execute C program: " + e.getMessage();
            System.err.println(errorMsg);
            throw new RuntimeException(errorMsg);
       } catch (InterruptedException e) {
           e.printStackTrace();
            String errorMsg = "Analysis was interrupted: " + e.getMessage();
            System.err.println(errorMsg);
         throw new RuntimeException(errorMsg);
       } catch (Exception e) {
         e.printStackTrace();
        String errorMsg = "Unexpected error during analysis: " + e.getMessage();
        System.err.println(errorMsg);
        //System.err.println("Output received: " + (output != null ? output.toString() : "null"));
    
        throw new RuntimeException(errorMsg);
    }
}
    /**
     * Main parser - detects mode and calls appropriate parser
     */
    private FlightAnalysis parseOutput(String output) {
    FlightAnalysis analysis = new FlightAnalysis();
       
    // Parse total distance
    Pattern distancePattern = Pattern.compile("Total Distance: ([0-9.]+) km");
    Matcher distanceMatcher = distancePattern.matcher(output);
    if (distanceMatcher.find()) {
        double distance = Double.parseDouble(distanceMatcher.group(1));
        analysis.setTotalDistance(distance);
        System.out.println("Parsed distance: " + distance);
    }
    
    // Parse maximum risk along route
    Pattern maxRiskPattern = Pattern.compile("Maximum Risk: ([0-9.]+)%");
    Matcher maxRiskMatcher = maxRiskPattern.matcher(output);
    if (maxRiskMatcher.find()) {
        double maxRisk = Double.parseDouble(maxRiskMatcher.group(1));
        analysis.setLightningProbability(maxRisk);
        System.out.println("Parsed max risk: " + maxRisk);
    }
    
    // Parse average risk
    Pattern avgRiskPattern = Pattern.compile("Average Risk: ([0-9.]+)%");
    Matcher avgRiskMatcher = avgRiskPattern.matcher(output);
    if (avgRiskMatcher.find()) {
        double avgRisk = Double.parseDouble(avgRiskMatcher.group(1));
        analysis.setAverageRisk(avgRisk);
        System.out.println("Parsed avg risk: " + avgRisk);
    }
    
    // Parse weather data - MUST handle negative numbers! 
    Pattern wp1WeatherPattern = Pattern.compile("WP1_WEATHER:([0-9.\\-]+),([0-9.\\-]+),([0-9.\\-]+),([0-9.\\-]+)");
    Matcher wp1WeatherMatcher = wp1WeatherPattern.matcher(output);
    if (wp1WeatherMatcher.find()) {
        analysis.setTemperature(Double.parseDouble(wp1WeatherMatcher.group(1)));
        analysis.setHumidity(Double.parseDouble(wp1WeatherMatcher.group(2)));
        analysis.setPressure(Double.parseDouble(wp1WeatherMatcher.group(3)));
        analysis.setWindSpeed(Double.parseDouble(wp1WeatherMatcher.group(4)));
        System.out.println("Parsed weather from WP1: " + 
                           wp1WeatherMatcher.group(1) + "°C, " + 
                           wp1WeatherMatcher.group(2) + "%");
    }
        int numWaypoints = 0;
    // Pattern to extract: WP1: (45.3225, -75.6692) @ 0 km
    Pattern waypointPattern = Pattern.compile(
    "WP(\\d+):\\s*\\(([0-9.\\-]+),\\s*([0-9.\\-]+)\\)\\s*@\\s*(\\d+)\\s*km");
    Matcher waypointMatcher = waypointPattern.matcher(output);
    
    while (waypointMatcher.find()) {
    int wpNum = Integer.parseInt(waypointMatcher.group(1));
    double lat = Double.parseDouble(waypointMatcher.group(2));
    double lon = Double.parseDouble(waypointMatcher.group(3));
    double distKm = Double.parseDouble(waypointMatcher.group(4));
    
     numWaypoints++;  // increment here to track total waypoints
    // Now extract risk for this waypoint
    String riskPattern;
        riskPattern = String.format(
                "\\[%d/%d\\]\\s+WP%d\\s+@\\s+%d\\s+km:\\s+([0-9.]+)%%\\s+(LOW|MODERATE|HIGH|CRITICAL)",
                wpNum, numWaypoints, wpNum, (int)distKm
        );         // This is maybe the place where it prits lat and lon twice check later again
       
    Pattern riskMatcher = Pattern.compile(riskPattern);
    Matcher riskMatch = riskMatcher.matcher(output);
    
    double riskPercent = 0.0;
    String riskLevel = "UNKNOWN";
    
    if (riskMatch.find()) {
        riskPercent = Double.parseDouble(riskMatch.group(1));
        riskLevel = riskMatch.group(2);
    }
    
    Waypoint wp = new Waypoint();
    wp.setNumber(wpNum);
    wp.setLatitude(lat);
    wp.setLongitude(lon);
    wp.setDistanceKm(distKm);
    wp.setRiskPercent(riskPercent);
    wp.setRiskLevel(riskLevel);
    
    analysis.addWaypoint(wp);
        
       // Waypoint wp;
        wp = new Waypoint();
        wp.setNumber(wpNum);
        wp.setDistanceKm(distKm);
        wp.setRiskPercent(riskPercent);
        wp.setRiskLevel(riskLevel);
        
        analysis.addWaypoint(wp);
        System.out.println("Parsed waypoint: WP" + wpNum + " @ " + distKm + "km, Risk: " + riskPercent + "% " + riskLevel);
        System.out.println("=================================================================================================");
        System.out.println("Parsed waypoint: WP" + numWaypoints + " @ " + distKm + "km, Risk: " + riskPercent + "% " + riskLevel);
        
    }
    
    // Determine risk level based on max risk
    double maxRisk = analysis.getLightningProbability();
    if (maxRisk >= 50.0) {
        analysis.setRiskLevel("CRITICAL");
    } else if (maxRisk >= 30.0) {
        analysis.setRiskLevel("HIGH");
    } else if (maxRisk >= 15.0) {
        analysis.setRiskLevel("MODERATE");
    } else {
        analysis.setRiskLevel("LOW");
    }
    
    // Parse recommendation
    if (output.contains("CRITICAL RISK") || output.contains("IMMEDIATE")) {
        analysis.setRecommendation("Immediate reroute required - unsafe conditions");
    } else if (output.contains("HIGH RISK") || output.contains("CONSIDER ROUTE CHANGE")) {
        analysis.setRecommendation("Consider alternate route - elevated risk detected");
    } else if (output.contains("PROCEED WITH CAUTION") || output.contains("MODERATE")) {
        analysis.setRecommendation("Proceed with caution - monitor conditions along route");
    } else if (output.contains("CLEARED FOR FLIGHT")) {
        analysis.setRecommendation("Safe to proceed - normal flight operations");
    } else {
        analysis.setRecommendation("Monitor weather conditions along route");
    }
    
    // Parse Ada safety status
    if (output.contains("SAFETY_STATUS:EMERGENCY") || output.contains("EMERGENCY")) {
        analysis.setSafetyStatus("EMERGENCY");
    } else if (output.contains("SAFETY_STATUS:DANGER") || output.contains("DANGER")) {
        analysis.setSafetyStatus("DANGER");
    } else if (output.contains("SAFETY_STATUS:CAUTION") || output.contains("Safety Status: CAUTION")) {
        analysis.setSafetyStatus("CAUTION");
    } else if (output.contains("SAFETY_STATUS:SAFE") || output.contains("Safety Status: SAFE")) {
        analysis.setSafetyStatus("SAFE");
    } else if (output.contains("OPERATIONAL")) {
        analysis.setSafetyStatus("OPERATIONAL");
    } else {
        analysis.setSafetyStatus("SAFE");
    }
    
    analysis.setSafetyCheckPassed(
        output.contains("SAFETY CHECK: PASSED") || 
        output.contains("VALIDATION:PASSED")
    );
    
    System.out.println("Route parsing complete - Found " + analysis.getWaypointCount() + " waypoints");
    return analysis;
}
    /**
     * Parse single-point analysis output (fallback mode)
     */
    private FlightAnalysis parseSinglePointOutput(String output) {
        FlightAnalysis analysis = new FlightAnalysis();
        
        // Parse weather data
        Pattern tempPattern = Pattern.compile("Temperature: ([0-9.]+)");
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
        if (output.contains("Risk Level: CRITICAL")) {
            analysis.setRiskLevel("CRITICAL");
        } else if (output.contains("Risk Level: HIGH")) {
            analysis.setRiskLevel("HIGH");
        } else if (output.contains("Risk Level: MODERATE")) {
            analysis.setRiskLevel("MODERATE");
        } else {
            analysis.setRiskLevel("LOW");
        }
        
        // Parse Ada safety results
        if (output.contains("SAFETY_STATUS:EMERGENCY")) {
            analysis.setSafetyStatus("EMERGENCY");
        } else if (output.contains("SAFETY_STATUS:DANGER")) {
            analysis.setSafetyStatus("DANGER");
        } else if (output.contains("SAFETY_STATUS:CAUTION")) {
            analysis.setSafetyStatus("CAUTION");
        } else if (output.contains("SAFETY_STATUS:ACTION_REQUIRED")) {
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
        } else if (output.contains("Immediate reroute required")) {
            analysis.setRecommendation("Immediate reroute required");
        } else {
            analysis.setRecommendation("Current route acceptable");
        }
        
        System.out.println("Single-point parsing complete");
        return analysis;
    }
}