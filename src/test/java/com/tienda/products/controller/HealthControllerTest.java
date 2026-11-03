package com.tienda.products.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WEB LAYER TEST: HealthControllerTest.
 *
 * <p>MockMvc simulates the exact request the AWS Target Group will send, without
 * starting Tomcat and without a database.
 *
 * <p>The contract verified here is the one the load balancer depends on:
 * <ul>
 *   <li>{@code GET /health} answers <b>200</b> (any non-2xx marks the instance unhealthy).</li>
 *   <li>The body is JSON with {@code status = "UP"}.</li>
 *   <li>No authentication or query parameter is required.</li>
 * </ul>
 */
@WebMvcTest(HealthController.class)
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /health -> 200 OK with {\"status\":\"UP\"}")
    void healthReturnsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("GET /health -> the body has only the status field (no internals leaked)")
    void healthDoesNotLeakInternalDetails() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").isString())
                // There is no "database", "version", "host" or stack trace in the payload.
                .andExpect(jsonPath("$.database").doesNotExist())
                .andExpect(jsonPath("$.version").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }
}
