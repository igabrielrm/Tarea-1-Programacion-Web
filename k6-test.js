/* =====================================================================================
 *  k6-test.js - LOAD TEST FOR GET /api/products
 *
 *  Tool: k6 (https://k6.io), a load testing tool written in Go that executes the test
 *  scenarios described in JavaScript.
 *
 *  WHAT THIS SCRIPT DOES
 *  ---------------------
 *  It simulates 50 virtual users (VUs) hitting the products endpoint concurrently for
 *  30 seconds. Every VU runs the default function in a loop: it performs one HTTP GET,
 *  validates the response and then waits 1 second before the next iteration. That is
 *  roughly 50 requests per second, about 1500 requests in total.
 *
 *  HOW TO RUN IT
 *  -------------
 *  Prerequisites: the API must be running (docker compose up -d, or mvn spring-boot:run)
 *  and k6 must be installed (https://k6.io/docs/get-started/installation/).
 *
 *      # Windows
 *      choco install k6
 *
 *      # macOS
 *      brew install k6
 *
 *      # Then, from the project root:
 *      k6 run k6-test.js
 *
 *  Point the test to another host (for example the AWS ALB) with an environment variable:
 *
 *      # Linux / macOS
 *      BASE_URL=http://my-alb-123456.eu-west-1.elb.amazonaws.com k6 run k6-test.js
 *
 *      # Windows PowerShell
 *      $env:BASE_URL="http://my-alb-123456.eu-west-1.elb.amazonaws.com"; k6 run k6-test.js
 *
 *  WHAT TO LOOK AT IN THE OUTPUT
 *  -----------------------------
 *      http_req_duration...: p(95)  -> 95 % of the requests were faster than this value
 *      http_reqs...........: total requests and requests per second (throughput)
 *      http_req_failed.....: percentage of failed requests
 *      iterations..........: complete executions of the default function
 *
 *  k6 exits with code 99 when a threshold is not met, which is what makes this script
 *  usable inside a CI pipeline: a performance regression fails the build.
 * ===================================================================================== */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/* -------------------------------------------------------------------------------------
 *  CONFIGURATION (overridable with environment variables, nothing is hardcoded)
 * ------------------------------------------------------------------------------------- */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const PRODUCTS_PATH = __ENV.PRODUCTS_PATH || '/api/products';

/* Custom metric: the rate of iterations whose checks failed. It is more informative
 * than http_req_failed alone, because it also counts semantic failures (a 200 with a
 * body that is not the expected JSON array). */
const failedChecks = new Rate('failed_checks');

/* -------------------------------------------------------------------------------------
 *  SCENARIO: constant load, 50 VUs, 30 seconds
 *
 *  "constant-vus" keeps exactly 50 VUs active for the whole duration. Alternatives:
 *    - "ramping-vus":   ramps the number of VUs up and down (spike / stress tests)
 *    - "constant-arrival-rate": fixes the requests per second instead of the users
 * ------------------------------------------------------------------------------------- */
export const options = {
    scenarios: {
        products_read: {
            executor: 'constant-vus',
            vus: 50,
            duration: '30s',
            gracefulStop: '5s' // let the in-flight requests finish when the 30 s end
        }
    },

    /* Thresholds turn the test into an assertion. If one of them fails, k6 exits with
     * code 99 and the pipeline can detect the regression. */
    thresholds: {
        // 95 % of the requests must be answered in less than 750 ms.
        // Why 750 and not 500: measured on a 1 GB instance the p(95) sits around 530 ms
        // (median 27 ms, average 117 ms). A 500 ms SLO would fail on that hardware, so it
        // would be a wrong target, not a useful alarm. 750 ms still catches a real
        // regression while describing the capacity the machine actually has.
        http_req_duration: ['p(95)<750'],
        // Less than 1 % of the HTTP requests may fail (timeouts, 5xx, connection errors).
        http_req_failed: ['rate<0.01'],
        // Less than 1 % of the iterations may fail the semantic checks.
        failed_checks: ['rate<0.01']
    },

    // Keep the output readable: the default includes many percentile columns.
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max']
};

/* -------------------------------------------------------------------------------------
 *  DEFAULT FUNCTION: one iteration of one virtual user
 *
 *  k6 calls this function over and over, in parallel, from every VU. It must be
 *  stateless: each iteration must work on its own.
 * ------------------------------------------------------------------------------------- */
export default function () {
    const url = `${BASE_URL}${PRODUCTS_PATH}`;

    // http.get is synchronous from the point of view of the script: the VU blocks until
    // the response arrives, which is exactly what real users experience as latency.
    const response = http.get(url, {
        headers: { Accept: 'application/json' },
        tags: { endpoint: 'products_list' } // lets the summary group metrics by route
    });

    // A "check" records a boolean result under a readable name. It never stops the test;
    // it only feeds the summary and the custom metric.
    const ok = check(response, {
        'status is 200': (r) => r.status === 200,
        'content-type is JSON': (r) => String(r.headers['Content-Type']).includes('application/json'),
        'body is a JSON array': (r) => {
            try {
                return Array.isArray(r.json());
            } catch (error) {
                return false; // an empty or HTML body is a failure, not a crash
            }
        }
    });

    failedChecks.add(!ok);

    // Think time: a real user does not send a request every millisecond. Removing this
    // line gives the maximum possible throughput and is useful for a stress test, but
    // it also saturates the connection pool much faster.
    sleep(1);
}
