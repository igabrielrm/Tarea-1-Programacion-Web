package com.tienda.products.controller;

import com.tienda.products.dto.HealthResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * CONTROLLER: HealthController (liveness probe).
 *
 * <p>It exposes a single endpoint that an external infrastructure component uses to ask
 * "is this process alive and able to answer HTTP?". In this project the consumer is the
 * <b>Target Group</b> of an AWS Application Load Balancer, but the same idea is used by
 * Kubernetes (liveness/readiness probes), Docker (HEALTHCHECK) and any monitoring tool.
 *
 * <p><b>Endpoint</b>
 * <pre>
 *   GET /health  ->  200 OK  {"status":"UP"}
 * </pre>
 *
 * <p><b>Why it lives outside /api</b>: it is not a business resource. Keeping it at the
 * root ({@code /health}) means the ALB does not depend on the API prefix, and moving or
 * versioning the products endpoints never breaks the load balancer configuration.
 *
 * <p><b>Design rules for a health endpoint</b> (they matter in the defence):
 * <ul>
 *   <li>It must be <b>cheap</b>: no database query, no external call, no heavy object
 *       creation. The ALB calls it every few seconds, forever.</li>
 *   <li>It must be <b>fast</b>: if it takes longer than the health check timeout, the
 *       instance is marked unhealthy and removed from rotation.</li>
 *   <li>It must be <b>public but harmless</b>: no authentication (the load balancer has
 *       no user credentials) and it must not reveal internals (versions, IPs, secrets).</li>
 *   <li>It must be <b>deterministic</b>: 200 while the process can serve traffic,
 *       non-2xx otherwise. Nothing in between.</li>
 * </ul>
 *
 * <p>This is a <b>liveness</b> check: it only proves that the JVM and the HTTP server are
 * up. It does NOT check PostgreSQL on purpose, because a database failover should not
 * mark every instance unhealthy at once (that would turn one problem into a total
 * outage). A <b>readiness</b> check that includes the database would be a different
 * endpoint, for example {@code /health/ready}.
 */
@RestController
public class HealthController {

    /**
     * GET /health -> Reports that the application is up.
     *
     * <p>Returns a constant value, so the ALB receives the same tiny JSON on every call.
     * There is no logic here because there is nothing to decide: reaching this method
     * already proves that Spring MVC, the servlet container and the JVM are working.
     *
     * @return 200 OK with {@code {"status":"UP"}}.
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(new HealthResponse("UP"));
    }
}
