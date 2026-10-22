package com.tienda.products.exception;

/**
 * DOMAIN EXCEPTION: DuplicateResourceException.
 *
 * <p>It is thrown when a product is created with a name that already exists.
 * It is translated into a 409 Conflict, which tells the frontend "that value is already taken".
 */
public class DuplicateResourceException extends RuntimeException {

    /**
     * Constructor with the error message.
     */
    public DuplicateResourceException(String message) {
        super(message);
    }
}
