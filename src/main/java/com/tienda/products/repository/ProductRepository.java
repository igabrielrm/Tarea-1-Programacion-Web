package com.tienda.products.repository;

import com.tienda.products.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * REPOSITORY: ProductRepository (Data Access layer).
 *
 * <p>Spring Data JPA generates the implementation of this interface AUTOMATICALLY at
 * runtime (this is what is known as a "dynamic proxy"). That is why:
 * <ul>
 *   <li>You do NOT have to write "implements ProductRepository" anywhere.</li>
 *   <li>You do NOT have to write SQL by hand for the basic CRUD operations.</li>
 * </ul>
 *
 * <p>By extending {@link JpaRepository} you get for free: save(), findById(),
 * findAll(), deleteById(), existsById(), count(), and so on.
 */
@Repository
// @Repository: marks the interface as the component that talks to the database.
//              (Spring Data creates the bean anyway because it extends Repository,
//              but the annotation documents the intent and enables the translation of
//              JPA exceptions into Spring Data's own exception hierarchy.)
public interface ProductRepository extends JpaRepository<Product, Long> {
    // JpaRepository<Product, Long> = the managed Entity (Product) and the type of its @Id (Long).

    /**
     * Returns every product sorted alphabetically by name.
     *
     * <p>This method is never implemented by hand: Spring Data derives the SQL from the
     * method name ("findAll" + "By" + "OrderBy" + "Name" + "Asc") automatically.
     * Generated SQL: SELECT * FROM products ORDER BY name ASC
     */
    List<Product> findAllByOrderByNameAsc();

    /**
     * Finds the products whose name CONTAINS the given text, ignoring case.
     *
     * <p>It is the query behind the search box of the frontend.
     * Generated SQL: SELECT * FROM products WHERE LOWER(name) LIKE LOWER('%text%')
     *
     * @param term the text fragment to look for.
     * @return the matching products (an empty list when nothing matches).
     */
    List<Product> findByNameContainingIgnoreCaseOrderByNameAsc(String term);

    /**
     * Finds a single product by its exact name, ignoring case.
     *
     * <p>It returns Optional<Product> because the product may NOT exist:
     * Optional forces you to handle the "not found" case (it avoids the classic
     * NullPointerException).
     * Generated SQL: SELECT * FROM products WHERE LOWER(name) = LOWER(?)
     */
    Optional<Product> findByNameIgnoreCase(String name);

    /**
     * Checks whether a product with that name already exists (without loading the object).
     * It is used by the Service to prevent duplicates on create.
     */
    boolean existsByNameIgnoreCase(String name);
}
