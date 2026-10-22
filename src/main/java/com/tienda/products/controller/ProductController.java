package com.tienda.products.controller;

import com.tienda.products.dto.ProductRequest;
import com.tienda.products.dto.ProductResponse;
import com.tienda.products.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * CONTROLLER: ProductController (Presentation layer / REST API).
 *
 * <p>It is the "front door" of the API. It receives HTTP requests (JSON),
 * delegates them to the Service and returns the HTTP response with the matching JSON.
 *
 * <p>Golden rule of this layer: the controller must NOT contain business logic
 * nor SQL. It should only translate HTTP &lt;-&gt; Java.
 *
 * <p>Endpoints exposed under the /api/products prefix:
 * <pre>
 *   GET    /api/products         -> list all
 *   GET    /api/products/search  -> search by name (?q=term)
 *   GET    /api/products/{id}    -> find one
 *   POST   /api/products         -> create one
 *   PUT    /api/products/{id}    -> update one
 *   DELETE /api/products/{id}    -> delete one
 * </pre>
 */
@RestController
// @RestController: combination of @Controller + @ResponseBody.
//   @Controller    -> the class is registered as a Spring MVC handler.
//   @ResponseBody  -> whatever each method returns is serialised to JSON with Jackson
//                     and written into the BODY of the HTTP response.
//   (If we only used @Controller, the returned value would be interpreted as the name
//   of an HTML view.)
@RequestMapping("/api/products")
// @RequestMapping: common prefix for every route of this controller.
//                  (With @RequestMapping("/api/products") + @GetMapping without a value,
//                   the full route is GET /api/products)
public class ProductController {

    /**
     * Injected service: the Controller talks to the Service, never to the Repository.
     */
    private final ProductService productService;

    /**
     * Constructor injection of the service.
     *
     * @Autowired tells Spring to resolve the dependency on its own: it looks in its
     * container for a bean implementing ProductService (the ProductServiceImpl) and
     * injects it here. That is why there is no "new ProductServiceImpl()" anywhere.
     */
    @Autowired
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    /**
     * GET /api/products -> Retrieves the list of every product.
     *
     * @return ResponseEntity with status 200 and the JSON array of products.
     */
    @GetMapping
    // @GetMapping: maps an HTTP GET request onto this method.
    //               Without a value () it uses the route of the class @RequestMapping.
    public ResponseEntity<List<ProductResponse>> findAll() {
        // We delegate the logic to the Service and return 200 OK with the body.
        return ResponseEntity.ok(productService.findAll());
    }

    /**
     * GET /api/products/search?q=term -> Searches products whose name contains the term.
     *
     * <p>This is the endpoint behind the search box of the frontend. The frontend
     * applies a 4 second debounce so the request is only fired once the user stops typing.
     *
     * @param q the text fragment to search for.
     * @return ResponseEntity with status 200 and the JSON array of matching products.
     */
    @GetMapping("/search")
    // @GetMapping("/search"): maps an HTTP GET request onto this method with that route.
    public ResponseEntity<List<ProductResponse>> search(
            @RequestParam(name = "q", required = false, defaultValue = "") String q) {
        // @RequestParam: reads a query string parameter (?q=term).
        //                required = false and a default value mean the parameter is optional.
        return ResponseEntity.ok(productService.search(q));
    }

    /**
     * GET /api/products/{id} -> Retrieves a single product by its identifier.
     *
     * @param id the product id, extracted from the URL.
     * @return ResponseEntity with 200 OK and the product in JSON.
     */
    @GetMapping("/{id}")
    // @GetMapping("/{id}"): adds a path variable. The {id} of the URL
    //                        is injected into the parameter marked with @PathVariable.
    public ResponseEntity<ProductResponse> findById(@PathVariable Long id) {
        // @PathVariable: extracts the {id} value from the URL and converts it to Long.
        //                If the id does not exist, the Service throws the exception and
        //                the GlobalExceptionHandler returns 404.
        return ResponseEntity.ok(productService.findById(id));
    }

    /**
     * POST /api/products -> Creates a new product.
     *
     * @param request the product data, already converted from JSON and validated.
     * @return ResponseEntity with 201 Created and the created product (with its id).
     */
    @PostMapping
    // @PostMapping: maps an HTTP POST request onto this method.
    public ResponseEntity<ProductResponse> create(
            @Valid @RequestBody ProductRequest request) {
        // @RequestBody: takes the BODY of the HTTP request (the JSON) and converts it
        //               into a ProductRequest object using Jackson.
        // @Valid: activates the validation of the DTO. If a field fails (@NotBlank,
        //         @DecimalMin...), MethodArgumentNotValidException is thrown and the
        //         handler returns 400.
        ProductResponse created = productService.create(request);

        // 201 Created is the correct status code for a newly created resource.
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/products/{id} -> Fully updates an existing product.
     *
     * @param id      the id of the product to update (it comes in the URL).
     * @param request the new data (it comes in the JSON body).
     * @return ResponseEntity with 200 OK and the already updated product.
     */
    @PutMapping("/{id}")
    // @PutMapping: maps an HTTP PUT request onto this method (it replaces the resource).
    public ResponseEntity<ProductResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    /**
     * DELETE /api/products/{id} -> Deletes a product.
     *
     * @param id the id of the product to delete (it comes in the URL).
     * @return ResponseEntity with 204 No Content (empty response, which is correct for a DELETE).
     */
    @DeleteMapping("/{id}")
    // @DeleteMapping: maps an HTTP DELETE request onto this method.
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);

        // 204 No Content: the operation succeeded but there is nothing to return.
        return ResponseEntity.noContent().build();
    }
}
