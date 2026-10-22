package com.tienda.products.controller;

import com.tienda.products.dto.ProductRequest;
import com.tienda.products.dto.ProductResponse;
import com.tienda.products.exception.DuplicateResourceException;
import com.tienda.products.exception.ResourceNotFoundException;
import com.tienda.products.service.ProductService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WEB LAYER TEST: ProductControllerTest.
 *
 * <p>It uses MockMvc to simulate real HTTP requests against the controller WITHOUT
 * starting a real server (no Tomcat, no port, no PostgreSQL).
 *
 * <p>What it verifies:
 * <ul>
 *   <li>That every route answers the expected HTTP status code.</li>
 *   <li>That the errors leave as JSON with the ApiError shape (never as the Tomcat HTML page).</li>
 *   <li>That the CORS preflight (OPTIONS) is answered correctly.</li>
 * </ul>
 *
 * <p>The Service is replaced by a mock, so this test isolates the web layer.
 */
@WebMvcTest(ProductController.class)
@AutoConfigureMockMvc
// @WebMvcTest: loads ONLY the web layer (the controllers, the exception handler and the
//               CORS configuration). The Repository and the database are NOT started.
// @AutoConfigureMockMvc: builds the MockMvc object that performs the simulated requests.
class ProductControllerTest {

    /** Mock of the service: it returns prepared data instead of calling PostgreSQL. */
    @MockBean
    // @MockBean: registers a Mockito mock in the Spring context, replacing the real Service.
    private ProductService productService;

    /** The MockMvc client used to perform the simulated HTTP requests. */
    @Autowired
    private MockMvc mockMvc;

    /** Sample response used across the tests. */
    private ProductResponse sampleProduct() {
        return new ProductResponse(1L, "Laptop Pro 14\"", "Laptop with 16 GB RAM", new BigDecimal("1299.90"));
    }

    // ---------------------------------------------------------------- LIST

    /**
     * GET /api/products must answer 200 with a JSON array.
     */
    @Test
    @DisplayName("GET /api/products returns 200 and the JSON list of products")
    void findAll_returns200AndJsonArray() throws Exception {
        when(productService.findAll()).thenReturn(List.of(sampleProduct()));

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Laptop Pro 14\""))
                .andExpect(jsonPath("$[0].price").value(1299.90));
    }

    // ---------------------------------------------------------------- SEARCH

    /**
     * GET /api/products/search?q=term must answer 200 and forward the term to the Service.
     */
    @Test
    @DisplayName("GET /api/products/search returns 200 and forwards the search term")
    void search_returns200AndForwardsTheTerm() throws Exception {
        when(productService.search("lap")).thenReturn(List.of(sampleProduct()));

        mockMvc.perform(get("/api/products/search").param("q", "lap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));

        verify(productService).search("lap");
    }

    // ---------------------------------------------------------------- FIND BY ID

    /**
     * GET /api/products/{id} must answer 200 with the product.
     */
    @Test
    @DisplayName("GET /api/products/{id} returns 200 and the product")
    void findById_returns200() throws Exception {
        when(productService.findById(1L)).thenReturn(sampleProduct());

        mockMvc.perform(get("/api/products/{id}", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Laptop Pro 14\""));
    }

    /**
     * When the product does not exist the API must answer 404 with a JSON body
     * (never the default HTML error page of Tomcat).
     */
    @Test
    @DisplayName("GET /api/products/{id} returns 404 with a JSON error when it does not exist")
    void findById_notFound_returns404Json() throws Exception {
        when(productService.findById(99L))
                .thenThrow(new ResourceNotFoundException("Product not found with id: 99"));

        mockMvc.perform(get("/api/products/{id}", 99))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Product not found with id: 99"))
                .andExpect(jsonPath("$.path").value("/api/products/99"));
    }

    /**
     * A non-numeric id is a CLIENT mistake, so the API must answer 400 and NOT 500.
     */
    @Test
    @DisplayName("GET /api/products/{id} returns 400 when the id is not a number")
    void findById_nonNumericId_returns400() throws Exception {
        mockMvc.perform(get("/api/products/{id}", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Parameter 'id' has an invalid value: abc"));
    }

    // ---------------------------------------------------------------- CREATE

    /**
     * POST /api/products must answer 201 with the created product (including the id).
     */
    @Test
    @DisplayName("POST /api/products returns 201 with the created product")
    void create_returns201() throws Exception {
        when(productService.create(any(ProductRequest.class))).thenReturn(sampleProduct());

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Laptop Pro 14\",\"description\":\"Laptop\",\"price\":1299.90}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Laptop Pro 14\""));
    }

    /**
     * An invalid body must be rejected with 400 by the Bean Validation (@Valid),
     * and the Service must NEVER be called.
     */
    @Test
    @DisplayName("POST /api/products returns 400 and never reaches the service when the body is invalid")
    void create_invalidBody_returns400AndSkipsTheService() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"description\":\"no name\",\"price\":-50}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(
                        "name: name is required; price: price cannot be negative"));

        // The validation stopped the request BEFORE the business logic.
        verify(productService, never()).create(any(ProductRequest.class));
    }

    /**
     * A broken JSON body must answer 400 (it is a client mistake, not a server error).
     */
    @Test
    @DisplayName("POST /api/products returns 400 when the body is not valid JSON")
    void create_brokenJson_returns400() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"broken\", "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("The request body is not valid JSON"));
    }

    /**
     * A duplicated name must answer 409 Conflict.
     */
    @Test
    @DisplayName("POST /api/products returns 409 when the name already exists")
    void create_duplicateName_returns409() throws Exception {
        when(productService.create(any(ProductRequest.class)))
                .thenThrow(new DuplicateResourceException("A product with the name already exists: Laptop Pro 14"));

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Laptop Pro 14\",\"price\":1299.90}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"));
    }

    // ---------------------------------------------------------------- UPDATE

    /**
     * PUT /api/products/{id} must answer 200 with the updated product.
     */
    @Test
    @DisplayName("PUT /api/products/{id} returns 200 with the updated product")
    void update_returns200() throws Exception {
        ProductResponse updated = new ProductResponse(1L, "Laptop Pro 14 updated", "Updated", new BigDecimal("1499.00"));
        when(productService.update(anyLong(), any(ProductRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/api/products/{id}", 1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Laptop Pro 14 updated\",\"description\":\"Updated\",\"price\":1499.00}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Laptop Pro 14 updated"));
    }

    /**
     * Updating a product that does not exist must answer 404.
     */
    @Test
    @DisplayName("PUT /api/products/{id} returns 404 when the product does not exist")
    void update_notFound_returns404() throws Exception {
        when(productService.update(anyLong(), any(ProductRequest.class)))
                .thenThrow(new ResourceNotFoundException("Product not found with id: 99"));

        mockMvc.perform(put("/api/products/{id}", 99)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Whatever\",\"price\":10.00}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    // ---------------------------------------------------------------- DELETE

    /**
     * DELETE /api/products/{id} must answer 204 with an empty body.
     */
    @Test
    @DisplayName("DELETE /api/products/{id} returns 204 with no content")
    void delete_returns204() throws Exception {
        mockMvc.perform(delete("/api/products/{id}", 1))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(productService).delete(1L);
    }

    /**
     * Deleting a product that does not exist must answer 404.
     */
    @Test
    @DisplayName("DELETE /api/products/{id} returns 404 when the product does not exist")
    void delete_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Product not found with id: 99"))
                .when(productService).delete(99L);

        mockMvc.perform(delete("/api/products/{id}", 99))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    // ---------------------------------------------------------------- UNKNOWN ROUTE

    /**
     * A route that matches no controller must answer 404 with a JSON body.
     */
    @Test
    @DisplayName("An unknown route returns 404 with a JSON body")
    void unknownRoute_returns404Json() throws Exception {
        mockMvc.perform(get("/api/totally-unknown"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(404));
    }

    // ---------------------------------------------------------------- CORS

    /**
     * The CORS preflight (OPTIONS) must be answered with 200 and the CORS headers,
     * otherwise the browser blocks every POST / PUT / DELETE from the frontend.
     */
    @Test
    @DisplayName("The CORS preflight (OPTIONS) is answered with 200 and the CORS headers")
    void corsPreflight_isAllowed() throws Exception {
        mockMvc.perform(options("/api/products")
                        .header("Origin", "http://localhost:5500")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5500"))
                .andExpect(header().string("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS"));
    }
}
