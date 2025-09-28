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
        
        // parse info
        if (output.contains("Lightning Probability:")) {
            // Extract just the probability number
            String[] lines = output.split("\n");
            for (String line : lines) {
                if (line.contains("Lightning Probability:")) {
                    String prob = line.replace("Lightning Probability: ", "").replace("%", "");
                    analysis.setLightningProbability(Double.parseDouble(prob));
                    break;
                }
            }
        }
        
        
        // Simple risk level detection
        if (output.contains("HIGH")) {
            analysis.setRiskLevel("HIGH");
            analysis.setRecommendation("Route change recommended");
        } else {
            analysis.setRiskLevel("LOW");  
            analysis.setRecommendation("Route acceptable");
        }
        
        return analysis;
    }
}
