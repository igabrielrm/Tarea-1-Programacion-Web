package com.tienda.products.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * GLOBAL CORS CONFIGURATION.
 *
 * <p><b>What is CORS?</b> Cross-Origin Resource Sharing is the browser security
 * mechanism that prevents a page served from "http://localhost:5500" from requesting
 * data from "http://localhost:8080", because they are different origins
 * (different ports mean a different origin).
 *
 * <p><b>Why do we need it here?</b> Because the Vanilla JS frontend runs on another local
 * port (for example the 5500 of the Live Server) while the backend runs on 8080.
 * Without CORS the browser blocks the response and the frontend shows an error like
 * "Access to fetch ... has been blocked by CORS policy".
 *
 * <p><b>The real flow</b>: before sending a POST/PUT/DELETE request (those are
 * "non-simple requests"), the browser first sends an EXTRA request of type OPTIONS
 * (the so-called "preflight"). The backend must answer that OPTIONS with the CORS
 * headers (Access-Control-Allow-Origin, etc.). If it does, the browser lets the
 * real request through. That is the reason for allowedMethods(... "OPTIONS" ...)
 * and allowedHeaders("*").
 *
 * <p>This class implements {@link WebMvcConfigurer}, the Spring MVC interface that lets
 * you customise the global behaviour of the framework (CORS, date formatting,
 * interceptors, etc.) without touching the controllers.
 */
@Configuration
// @Configuration: marks the class as a Spring configuration.
//                Spring registers it as a bean and executes its @Bean methods on startup.
//                It is the natural place for the configuration that applies to the WHOLE app.
public class CorsConfig implements WebMvcConfigurer {

    /**
     * Allowed origins, read from the application.properties file
     * (property app.cors.allowed-origins), separated by commas.
     *
     * <p>The array is injected directly because Spring automatically converts a
     * "a,b,c" text into a String[].
     */
    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    /**
     * Registers the CORS rules for ALL the endpoints of the API.
     *
     * <p>By overriding this method of WebMvcConfigurer, Spring applies these rules
     * globally to any controller, with no need to annotate each one with @CrossOrigin.
     *
     * <p>If the project used Spring Security, the equivalent and recommended approach
     * would be to define a "CorsConfigurationSource" bean instead of this method.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {

        registry.addMapping("/api/**")                    // Applies to every route of the API
                .allowedOrigins(allowedOrigins)           // e.g. http://localhost:5500, http://localhost:3000
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Allowed HTTP methods
                .allowedHeaders("*")                      // Allowed headers (Content-Type, Authorization...)
                .allowCredentials(true)                   // Allows sending cookies/credentials
                .maxAge(3600);                            // The browser caches the preflight response for 1 hour
    }
}
