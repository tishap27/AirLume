/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/J2EE/EJB40/StatelessEjbClass.java to edit this template
 */
package airlume.web.business;

import airlume.web.entity.FlightAnalysis;
import jakarta.ejb.Stateless;
import jakarta.ejb.LocalBean;

/**
 *
 * @author Tisha
 */
@Stateless
public class AirLumeService {

    public FlightAnalysis analyzeFlight(String origin, String destination) {
        // Mock data for initial testing
        FlightAnalysis analysis = new FlightAnalysis();
        analysis.setLightningProbability(9.87);
        analysis.setRiskLevel("HIGH");
        analysis.setRecommendation("Route modification recommended");
        return analysis;
    }
}
