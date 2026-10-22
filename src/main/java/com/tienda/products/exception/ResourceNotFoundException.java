package com.tienda.products.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * DOMAIN EXCEPTION: ResourceNotFoundException.
 *
 * <p>It is thrown when a resource (a product) does not exist in the database.
 * The GlobalExceptionHandler intercepts it and returns a 404 Not Found in JSON.
 *
 * <p>This is a "checked" business exception: it is not a programming mistake,
 * it is an expected situation of the API (the client asked for something that is not there).
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
// @ResponseStatus: tells Spring that this exception corresponds to a 404.
//                  Spring Boot turns it into an HTTP response with that status code.
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Constructor with the error message.
     *
     * @param message the text that will be sent to the client in the "message" field.
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }

    /**
     * Constructor with message and cause (to wrap another original error).
     */
    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
