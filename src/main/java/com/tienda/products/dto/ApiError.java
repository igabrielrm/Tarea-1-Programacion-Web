package com.tienda.products.dto;

import java.time.LocalDateTime;

/**
 * ERROR DTO: ApiError.
 *
 * <p>This is the standard error shape returned by the API.
 * When a request fails, the frontend always receives a JSON with this structure:
 * <pre>
 *   {
 *     "timestamp": "2026-10-21T10:15:30.123",
 *     "status": 404,
 *     "error": "Not Found",
 *     "message": "Product not found with id: 99",
 *     "path": "/api/products/99"
 *   }
 * </pre>
 * This way the frontend can display the message directly instead of parsing loose text.
 */
public class ApiError {

    /** Exact moment when the error was generated. */
    private LocalDateTime timestamp;

    /** HTTP status code (400, 404, 409, 500...). */
    private int status;

    /** Short error name (Bad Request, Not Found, Conflict...). */
    private String error;

    /** Human readable message. */
    private String message;

    /** Path of the request that failed. */
    private String path;

    /** Empty constructor: Jackson needs it to deserialise. */
    public ApiError() {
    }

    /**
     * Constructor with every field.
     */
    public ApiError(LocalDateTime timestamp, int status, String error, String message, String path) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }

    /** Returns the date and time of the error. */
    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    /** Sets the date and time of the error. */
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    /** Returns the HTTP status code of the error. */
    public int getStatus() {
        return status;
    }

    /** Sets the HTTP status code of the error. */
    public void setStatus(int status) {
        this.status = status;
    }

    /** Returns the short error name. */
    public String getError() {
        return error;
    }

    /** Sets the short error name. */
    public void setError(String error) {
        this.error = error;
    }

    /** Returns the human readable message. */
    public String getMessage() {
        return message;
    }

    /** Sets the human readable message. */
    public void setMessage(String message) {
        this.message = message;
    }

    /** Returns the path that failed. */
    public String getPath() {
        return path;
    }

    /** Sets the path that failed. */
    public void setPath(String path) {
        this.path = path;
    }
}
