package com.tienda.products.exception;

import com.tienda.products.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * GLOBAL EXCEPTION HANDLER.
 *
 * <p>Without this class, when the Service throws an exception, Spring returns the
 * default Tomcat error page (an HTML document with the stack trace), and the
 * Vanilla JS frontend would receive HTML where it expected JSON -> it could not
 * process the response.
 *
 * <p>With this handler, EVERY error leaves as JSON with the same shape (ApiError),
 * which makes the API predictable and easy to consume from the frontend.
 */
@RestControllerAdvice
// @RestControllerAdvice: it is a global @ControllerAdvice + @ResponseBody.
//   @ControllerAdvice -> catches the exceptions of every controller in the application.
//   @ResponseBody    -> the returned value is serialised to JSON (it is not an HTML view).
public class GlobalExceptionHandler {

    /**
     * Handles ResourceNotFoundException -> responds 404 Not Found.
     *
     * @param ex the exception thrown by the Service.
     * @param req the original request (to know which route failed).
     * @return 404 with the JSON error body.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    // @ExceptionHandler: declares which exception this method handles and the status it answers with.
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildError(HttpStatus.NOT_FOUND, ex.getMessage(), req));
    }

    /**
     * Handles DuplicateResourceException -> responds 409 Conflict.
     *
     * @param ex the duplicate exception.
     * @param req the original request.
     * @return 409 with the JSON error body.
     */
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiError> handleDuplicate(DuplicateResourceException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildError(HttpStatus.CONFLICT, ex.getMessage(), req));
    }

    /**
     * Handles MethodArgumentNotValidException -> responds 400 Bad Request.
     *
     * <p>Spring throws this exception when @Valid finds an invalid field. We walk
     * through all the validation errors and join them into a single readable message,
     * so the frontend knows exactly what to fix.
     *
     * <p>The messages are sorted alphabetically so the response is ALWAYS identical
     * for the same input: the order in which Bean Validation reports the fields is
     * not guaranteed, and a message that changes between calls would be a nuisance
     * for the frontend and for the tests.
     *
     * @param ex the validation exception.
     * @param req the original request.
     * @return 400 with the detail of every invalid field.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        String detail = ex.getBindingResult()               // the validation result
                .getFieldErrors()                           // the list of per-field errors
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .sorted()                                   // alphabetical order: the message is ALWAYS the same
                .collect(Collectors.joining("; "));          // "name: name is required; price: price cannot be negative"

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildError(HttpStatus.BAD_REQUEST, detail, req));
    }

    /**
     * Handles HttpMessageNotReadableException -> responds 400 Bad Request.
     *
     * <p>Spring throws this exception when the BODY of the request is not valid JSON
     * (for example, a missing brace, an extra comma or broken text).
     * It is a CLIENT mistake, so it must answer 400 and not 500.
     *
     * @param ex the body reading exception.
     * @param req the original request.
     * @return 400 with the JSON error body.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleInvalidJson(HttpMessageNotReadableException ex,
                                                      HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildError(HttpStatus.BAD_REQUEST,
                        "The request body is not valid JSON", req));
    }

    /**
     * Handles MethodArgumentTypeMismatchException -> responds 400 Bad Request.
     *
     * <p>Spring throws this exception when the value of a path variable or a query
     * parameter cannot be converted to the expected type. For example, when the
     * client asks for "/api/products/abc" and the controller expects a Long id.
     *
     * <p>It is a CLIENT mistake (the id is not a number), so it must answer 400 and
     * not 500. Without this handler the request would end up in the generic
     * "unexpected error" branch and the API would answer 500 for a simple typo.
     *
     * @param ex the type mismatch exception.
     * @param req the original request.
     * @return 400 with the JSON error body.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                        HttpServletRequest req) {
        String message = "Parameter '" + ex.getName() + "' has an invalid value: " + ex.getValue();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildError(HttpStatus.BAD_REQUEST, message, req));
    }

    /**
     * Handles MissingServletRequestParameterException -> responds 400 Bad Request.
     *
     * <p>It happens when a mandatory query parameter (?q=...) is not sent at all.
     *
     * @param ex the missing parameter exception.
     * @param req the original request.
     * @return 400 with the JSON error body.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingParam(MissingServletRequestParameterException ex,
                                                        HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildError(HttpStatus.BAD_REQUEST, ex.getMessage(), req));
    }

    /**
     * Handles NoResourceFoundException -> responds 404 Not Found.
     *
     * <p>Spring throws this exception when the requested URL does not match ANY
     * route of the application (for example "/api/does-not-exist"). Without this
     * handler the request would fall into the generic branch and answer 500,
     * which would be wrong: asking for a page that does not exist is a 404.
     *
     * @param ex the no-resource exception.
     * @param req the original request.
     * @return 404 with the JSON error body.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex,
                                                      HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildError(HttpStatus.NOT_FOUND,
                        "The requested endpoint does not exist: " + req.getRequestURI(), req));
    }

    /**
     * Handles HttpRequestMethodNotSupportedException -> responds 405 Method Not Allowed.
     *
     * <p>For example: doing a DELETE on /api/products without providing the {id}.
     *
     * @param ex the unsupported HTTP method exception.
     * @param req the original request.
     * @return 405 with the JSON error body.
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex,
                                                           HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(buildError(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage(), req));
    }

    /**
     * Handles any other unexpected exception -> responds 500 Internal Server Error.
     *
     * <p>Important: the technical detail is never leaked to the client, for security
     * reasons. The real error is written to the server log and the client only receives
     * a generic message.
     *
     * @param ex the unexpected exception.
     * @param req the original request.
     * @return 500 with the JSON error body.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest req) {
        // We print the real error in the server console so it can be debugged.
        System.err.println("[ERROR] " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                        "An unexpected error occurred on the server", req));
    }

    /**
     * Helper method: builds the ApiError object with the information of the request.
     *
     * @param status  the HTTP status code of the error.
     * @param message the human readable message.
     * @param req     the original request (the route is taken from it).
     * @return the error DTO, ready to be serialised.
     */
    private ApiError buildError(HttpStatus status, String message, HttpServletRequest req) {
        return new ApiError(
                LocalDateTime.now(),                 // moment of the error
                status.value(),                      // numeric code (404, 409...)
                status.getReasonPhrase(),             // text ("Not Found", "Conflict"...)
                message,                             // the specific message
                req.getRequestURI()                  // the failing route, e.g. "/api/products/99"
        );
    }
}
