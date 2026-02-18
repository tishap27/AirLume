/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package airlume.web.config;

/**
 *
 * @author Tisha
 */


import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;
import java.util.HashSet;
import java.util.Set;

@ApplicationPath("resources")
public class ApplicationConfig extends Application {

    @Override
    public Set<Class<?>> getClasses() {
        Set<Class<?>> resources = new HashSet<>();

        // API Resources
        resources.add(airlume.web.resources.FlightAnalysisResource.class);
        resources.add(airlume.web.resources.JakartaEE10Resource.class);

        // CORS
        resources.add(airlume.web.config.CorsFilter.class);
        resources.add(airlume.web.config.CorsPreflightResource.class);

        return resources;
    }
}