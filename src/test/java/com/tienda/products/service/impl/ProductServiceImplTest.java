package com.tienda.products.service.impl;

import com.tienda.products.dto.ProductRequest;
import com.tienda.products.dto.ProductResponse;
import com.tienda.products.entity.Product;
import com.tienda.products.exception.DuplicateResourceException;
import com.tienda.products.exception.ResourceNotFoundException;
import com.tienda.products.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * UNIT TEST of ProductServiceImpl.
 *
 * <p>It does not need a database: thanks to Mockito the ProductRepository is "simulated".
 * This proves why the business logic must live in the Service and not in the Controller:
 * it can be tested without starting PostgreSQL nor Tomcat.
 *
 * <p>Run it with: mvn test
 */
@ExtendWith(MockitoExtension.class)
// MockitoExtension: initialises the mocks and validates them automatically on every test.
class ProductServiceImplTest {

    /** Repository mock: it simulates PostgreSQL without touching the real database. */
    @Mock
    private ProductRepository productRepository;

    /** The service under test, with the mock already injected by Mockito. */
    @InjectMocks
    private ProductServiceImpl productService;

    /** Sample product used across the tests. */
    private Product sampleProduct;

    /**
     * @BeforeEach: runs BEFORE each test.
     * It prepares the starting data of every test case.
     */
    @BeforeEach
    void setUp() {
        sampleProduct = new Product("Laptop Pro 14\"", "Laptop with 16 GB RAM", new BigDecimal("1299.90"));
        sampleProduct.setId(1L);
    }

    /**
     * Verifies that findAll returns the list of products coming from the repository.
     */
    @Test
    @DisplayName("findAll returns the products sorted by name")
    void findAll_returnsList() {
        // We prepare the answer of the simulated repository.
        when(productRepository.findAllByOrderByNameAsc()).thenReturn(List.of(sampleProduct));

        // We run the service method.
        List<ProductResponse> result = productService.findAll();

        // We assert that the result is the expected one.
        assertEquals(1, result.size());
        assertEquals("Laptop Pro 14\"", result.get(0).getName());
        assertEquals(new BigDecimal("1299.90"), result.get(0).getPrice());
    }

    /**
     * Verifies that search returns the products whose name contains the term.
     */
    @Test
    @DisplayName("search returns the products matching the term")
    void search_matchingProducts() {
        when(productRepository.findByNameContainingIgnoreCaseOrderByNameAsc("Lap"))
                .thenReturn(List.of(sampleProduct));

        List<ProductResponse> result = productService.search("Lap");

        assertEquals(1, result.size());
        assertEquals("Laptop Pro 14\"", result.get(0).getName());
    }

    /**
     * Verifies that a blank search term returns every product (no filter applied).
     */
    @Test
    @DisplayName("search with a blank term returns all the products")
    void search_blankTerm_returnsAll() {
        when(productRepository.findAllByOrderByNameAsc()).thenReturn(List.of(sampleProduct));

        List<ProductResponse> result = productService.search("   ");

        assertEquals(1, result.size());
        verify(productRepository, never()).findByNameContainingIgnoreCaseOrderByNameAsc(any());
    }

    /**
     * Verifies that findById returns the product when it EXISTS.
     */
    @Test
    @DisplayName("findById returns the product when it exists")
    void findById_productExists() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));

        ProductResponse result = productService.findById(1L);

        assertEquals(1L, result.getId());
        assertEquals("Laptop Pro 14\"", result.getName());
    }

    /**
     * Verifies that findById throws a 404 (ResourceNotFoundException) when it does NOT exist.
     */
    @Test
    @DisplayName("findById throws ResourceNotFoundException when the product does not exist")
    void findById_productNotFound() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(
                ResourceNotFoundException.class,
                () -> productService.findById(99L)
        );

        assertTrue(ex.getMessage().contains("99"));
    }

    /**
     * Verifies that create saves the product and returns the generated id.
     */
    @Test
    @DisplayName("create saves the product and returns the DTO with the generated id")
    void create_persistsTheProduct() {
        ProductRequest request = new ProductRequest("Monitor 27\"", "QHD monitor", new BigDecimal("349.00"));

        // We simulate the repository saving the entity and returning it with an id assigned.
        when(productRepository.existsByNameIgnoreCase(any())).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product saved = invocation.getArgument(0);
            saved.setId(10L);   // We simulate the id generated by PostgreSQL
            return saved;
        });

        ProductResponse result = productService.create(request);

        assertEquals(10L, result.getId());
        assertEquals("Monitor 27\"", result.getName());
        // verify() checks that the repository was invoked once with the expected data.
        verify(productRepository, org.mockito.Mockito.times(1)).save(any(Product.class));
    }

    /**
     * Verifies that create fails with 409 when the name is already in use.
     */
    @Test
    @DisplayName("create throws DuplicateResourceException when the name already exists")
    void create_duplicateName() {
        ProductRequest request = new ProductRequest("Laptop Pro 14\"", null, new BigDecimal("1299.90"));
        when(productRepository.existsByNameIgnoreCase("Laptop Pro 14\"")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> productService.create(request));

        // We verify that nothing was saved in the database.
        verify(productRepository, never()).save(any(Product.class));
    }

    /**
     * Verifies that delete removes the product when it exists.
     */
    @Test
    @DisplayName("delete removes the existing product")
    void delete_productExists() {
        when(productRepository.existsById(1L)).thenReturn(true);

        productService.delete(1L);

        verify(productRepository).deleteById(1L);
    }

    /**
     * Verifies that delete throws a 404 when the product does not exist.
     */
    @Test
    @DisplayName("delete throws ResourceNotFoundException when the product does not exist")
    void delete_productNotFound() {
        when(productRepository.existsById(99L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> productService.delete(99L));

        verify(productRepository, never()).deleteById(any());
    }
}
