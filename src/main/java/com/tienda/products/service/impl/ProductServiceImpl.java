package com.tienda.products.service.impl;

import com.tienda.products.dto.ProductRequest;
import com.tienda.products.dto.ProductResponse;
import com.tienda.products.entity.Product;
import com.tienda.products.exception.DuplicateResourceException;
import com.tienda.products.exception.ResourceNotFoundException;
import com.tienda.products.repository.ProductRepository;
import com.tienda.products.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * SERVICE (implementation): ProductServiceImpl.
 *
 * <p>This is where the BUSINESS LOGIC lives: what a valid product is, which error to
 * throw, how to transform an entity into a DTO, and so on.
 *
 * <p>The @Service annotation together with the ProductService interface makes Spring
 * create this class as a bean and inject it into the Controller. Implementing an
 * interface is called "programming to a contract" and it is the standard Spring pattern.
 */
@Service
// @Service: marks the class as a business layer component.
//           Spring registers it in the container and makes it available for injection.
//           (Semantically it is a @Component with a meaningful name: it adds meaning to the name.)
public class ProductServiceImpl implements ProductService {

    /**
     * Injected repository: this is the component that really talks to PostgreSQL.
     */
    private final ProductRepository productRepository;

    /**
     * Constructor injection (the recommended approach in Spring).
     *
     * <p>With @Autowired we tell Spring: "look for a bean of type ProductRepository in the
     * container and hand it over here". Being "final", the object stays immutable and it
     * is also easier to test (you pass a mock to the constructor).
     *
     * <p>Note: since Spring 4.3, when a class has a SINGLE constructor, @Autowired is
     * optional. It is kept here so the intent is explicit and easier to study.
     */
    @Autowired
    public ProductServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /**
     * Lists every product, sorted by name.
     *
     * <p>@Transactional(readOnly = true): opens a READ-ONLY transaction. Hibernate uses a
     * pooled connection in read mode and does not prepare the write flush: it is faster and
     * PostgreSQL does not lock rows.
     */
    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> findAll() {
        // findAllByOrderByNameAsc() -> Spring Data generates: SELECT * FROM products ORDER BY name ASC
        return productRepository.findAllByOrderByNameAsc()   // 1) Talk to the database
                .stream()                                   // 2) Turn the list into a stream
                .map(ProductResponse::from)                 // 3) Convert every entity into a DTO
                .collect(Collectors.toList());              // 4) Collect them back into a list
    }

    /**
     * Searches products by name.
     *
     * <p>The empty term returns every product, so the frontend can reuse the same
     * endpoint when the search box is cleared.
     *
     * @Transactional(readOnly = true): the query does not modify anything, so the
     * transaction is flagged as read-only.
     */
    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> search(String term) {
        // A blank term means "no filter", so we simply list everything.
        if (term == null || term.isBlank()) {
            return findAll();
        }

        // findByNameContainingIgnoreCaseOrderByNameAsc() -> Spring Data generates:
        // SELECT * FROM products WHERE LOWER(name) LIKE LOWER('%term%') ORDER BY name ASC
        return productRepository.findByNameContainingIgnoreCaseOrderByNameAsc(term)
                .stream()
                .map(ProductResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Finds a product by id.
     *
     * @Transactional(readOnly = true): the query does not modify anything.
     */
    @Override
    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        // findById returns an Optional: when the id does not exist, the Optional is empty.
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));
        // orElseThrow: when the Optional is empty it throws the exception (which the
        // GlobalExceptionHandler converts into a 404 Not Found in JSON).
        return ProductResponse.from(product);
    }

    /**
     * Creates a new product.
     *
     * @Transactional: opens a transaction. If anything fails inside, the ROLLBACK happens
     * automatically and the database is left untouched (integrity guaranteed).
     */
    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        // Business rule: there cannot be two products with the same name.
        if (productRepository.existsByNameIgnoreCase(request.getName())) {
            throw new DuplicateResourceException(
                    "A product with the name already exists: " + request.getName());
        }

        // We build the entity from the validated DTO.
        Product product = new Product();
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());

        // save(): when the id is null -> INSERT and PostgreSQL returns the generated id.
        //         when the id exists -> UPDATE.
        Product saved = productRepository.save(product);

        return ProductResponse.from(saved);
    }

    /**
     * Updates (PUT) an existing product.
     *
     * @Transactional: the write (UPDATE) must be atomic.
     */
    @Override
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        // We locate the entity; if it does not exist, the 404 error is raised right here.
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + id));

        // We check the new name is not taken by ANOTHER product.
        boolean nameTaken = productRepository.existsByNameIgnoreCase(request.getName());
        if (nameTaken && !request.getName().equalsIgnoreCase(product.getName())) {
            throw new DuplicateResourceException(
                    "Another product with that name already exists: " + request.getName());
        }

        // We apply the changes onto the entity.
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());

        // Since the entity has an id, save() executes an UPDATE.
        Product updated = productRepository.save(product);

        return ProductResponse.from(updated);
    }

    /**
     * Deletes a product.
     *
     * @Transactional: the DELETE must also be atomic.
     */
    @Override
    @Transactional
    public void delete(Long id) {
        // If the product does not exist, we return 404 instead of a silent 200.
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found with id: " + id);
        }
        // deleteById -> DELETE FROM products WHERE id = ?
        productRepository.deleteById(id);
    }
}
