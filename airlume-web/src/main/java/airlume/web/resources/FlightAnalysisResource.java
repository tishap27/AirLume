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
        try {
            FlightAnalysis analysis = airLumeService.analyzeFlight(origin, destination);
            return Response.ok(analysis).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity("{\"error\": \"" + e.getMessage() + "\"}")
                .type(MediaType.APPLICATION_JSON)
                .build();
        }
    }
}
