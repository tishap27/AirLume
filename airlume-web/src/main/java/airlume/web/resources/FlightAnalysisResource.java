/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package airlume.web.resources;

/**
 *
 * @author Tisha
 */

import airlume.web.business.AirLumeService;
import airlume.web.entity.FlightAnalysis;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("analysis")
public class FlightAnalysisResource {

    @Inject
    private AirLumeService airLumeService;

   @GET
@Produces(MediaType.APPLICATION_JSON)
public Response getFlightAnalysis(
    @QueryParam("origin") String origin,
    @QueryParam("destination") String destination
) {
    System.out.println("=== API REQUEST ===");
    System.out.println("Origin: " + origin);
    System.out.println("Destination: " + destination);
    
    // Validate inputs
    if (origin == null || origin.trim().isEmpty()) {
        String errorJson = "{\"error\": \"Missing origin airport code\"}";
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(errorJson)
            .type(MediaType.APPLICATION_JSON)
            .build();
    }
    
    if (destination == null || destination.trim().isEmpty()) {
        String errorJson = "{\"error\": \"Missing destination airport code\"}";
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(errorJson)
            .type(MediaType.APPLICATION_JSON)
            .build();
    }
    
    try {
        FlightAnalysis analysis = airLumeService.analyzeFlight(origin, destination);
        
        if (analysis == null) {
            String errorJson = "{\"error\": \"Analysis returned null - check server logs\"}";
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(errorJson)
                .type(MediaType.APPLICATION_JSON)
                .build();
        }
        
        System.out.println("Analysis complete: " + analysis.getOrigin() + " -> " + analysis.getDestination());
        System.out.println("Risk: " + analysis.getLightningProbability() + "%");
        
        return Response.ok(analysis).build();
        
    } catch (Exception e) {
        e.printStackTrace();
        String errorMsg = e.getMessage() != null ? e.getMessage() : "Unknown error occurred";
        String errorJson = "{\"error\": \"" + errorMsg.replace("\"", "\\\"") + "\"}";
        
        System.err.println("API Error: " + errorMsg);
        
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorJson)
            .type(MediaType.APPLICATION_JSON)
            .build();
        }
    }
}
