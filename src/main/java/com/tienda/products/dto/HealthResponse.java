package com.tienda.products.dto;

/**
 * DTO: HealthResponse.
 *
 * <p>The body returned by {@code GET /health}. It is a Java {@code record}, so it is
 * immutable and its only purpose is to carry the status: the compiler generates the
 * constructor, the accessor {@code status()} and {@code equals/hashCode/toString}, and
 * Jackson serialises it as {@code {"status":"UP"}}.
 *
 * <p>Why a DTO and not a {@code Map}: the JSON contract becomes explicit and typed. If
 * tomorrow the response grows (version, uptime, database status), a new field is added
 * here and every consumer sees it in the class definition.
 *
 * @param status the state of the application. AWS expects the endpoint to answer
 *               HTTP 200, so the value is always {@code "UP"} while the process is alive.
 */
public record HealthResponse(String status) {
}
