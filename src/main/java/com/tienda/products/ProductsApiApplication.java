package com.tienda.products;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * MAIN APPLICATION CLASS (entry point).
 *
 * <p>This is the "power button" of the API. When it runs:
 * <ol>
 *   <li>Spring Boot starts the embedded Tomcat web server on port 8080.</li>
 *   <li>It reads the application.properties file (database connection, CORS, etc.).</li>
 *   <li>It scans the "com.tienda.products" package and registers every class annotated
 *       with @Entity, @Repository, @Service, @Controller and @Configuration.</li>
 *   <li>It starts the connection pool against PostgreSQL.</li>
 * </ol>
 *
 * <p>That is why every class MUST live inside the "com.tienda.products" package
 * (or a sub-package): anything outside it would simply not be discovered.
 */
@SpringBootApplication
public class ProductsApiApplication {

    /**
     * The main method: the entry point of any Java application.
     * SpringApplication.run() performs the whole bootstrap (context, beans, web server).
     */
    public static void main(String[] args) {
        SpringApplication.run(ProductsApiApplication.class, args);
    }
}
