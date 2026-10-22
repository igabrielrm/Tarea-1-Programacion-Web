package com.tienda.products.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * INPUT DTO: ProductRequest.
 *
 * <p>This is the "form" the API accepts. It is kept separate from the entity on purpose:
 * <ul>
 *   <li>The client can NOT send the "id" (the database generates it).</li>
 *   <li>It allows declaring validations (@NotBlank, @DecimalMin...) that are checked
 *       with @Valid in the Controller, before reaching the Service.</li>
 *   <li>If the entity changes in the future (for example, it gains an internal field),
 *       the public API can stay exactly the same without breaking its clients.</li>
 * </ul>
 */
public class ProductRequest {

    /**
     * Product name. Mandatory and it cannot be blank.
     */
    @NotBlank(message = "name is required")
    // @NotBlank: the validation fails when the value is null, "" or only spaces.
    //             (Spring Boot 3 uses Jakarta Validation, not javax)
    @Size(max = 120, message = "name cannot be longer than 120 characters")
    // @Size: caps the length of the text.
    private String name;

    /**
     * Product description. Optional (it may arrive as null).
     */
    @Size(max = 500, message = "description cannot be longer than 500 characters")
    private String description;

    /**
     * Product price. Mandatory, greater than or equal to 0, with at most 2 decimal places.
     */
    @NotNull(message = "price is required")
    // @NotNull: fails when the value is null (unlike @NotBlank, a number is expected here).
    @DecimalMin(value = "0.0", message = "price cannot be negative")
    // @DecimalMin: declares the minimum accepted value (0 in this case).
    @Digits(integer = 8, fraction = 2, message = "price accepts up to 8 digits and 2 decimal places")
    // @Digits: matches the NUMERIC(10,2) column in PostgreSQL.
    private BigDecimal price;

    /** Empty constructor: Jackson needs it to deserialise the JSON. */
    public ProductRequest() {
    }

    /** Constructor with every field (useful in tests). */
    public ProductRequest(String name, String description, BigDecimal price) {
        this.name = name;
        this.description = description;
        this.price = price;
    }

    /** Returns the name received in the JSON. */
    public String getName() {
        return name;
    }

    /** Sets the name received in the JSON. */
    public void setName(String name) {
        this.name = name;
    }

    /** Returns the description received in the JSON. */
    public String getDescription() {
        return description;
    }

    /** Sets the description received in the JSON. */
    public void setDescription(String description) {
        this.description = description;
    }

    /** Returns the price received in the JSON. */
    public BigDecimal getPrice() {
        return price;
    }

    /** Sets the price received in the JSON. */
    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}
