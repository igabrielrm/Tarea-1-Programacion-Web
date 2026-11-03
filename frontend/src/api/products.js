/* =====================================================================================
 *  api/products.js - HTTP layer (the ONLY file allowed to call fetch)
 *
 *  Responsibility: talk to the Spring Boot REST API and return plain JavaScript
 *  objects. Nothing in this file touches the DOM, so it can be reused or unit-tested
 *  without a browser. The single browser API it reads is `window.location`, and only
 *  to find out WHERE the page is running (see API_BASE_URL below).
 *
 *  Every exported function maps to exactly one endpoint of ProductController:
 *      getProducts()      ->  GET    /api/products
 *      searchProducts()   ->  GET    /api/products/search?q=term
 *      getProduct(id)     ->  GET    /api/products/{id}
 *      createProduct()    ->  POST   /api/products
 *      updateProduct()    ->  PUT    /api/products/{id}
 *      deleteProduct()    ->  DELETE /api/products/{id}
 * ===================================================================================== */

/* -------------------------------------------------------------------------------------
 *  BASE URL OF THE API - built at runtime, never hardcoded
 *
 *  `window.location.hostname` is the host the page was loaded from:
 *      - "localhost" or "127.0.0.1" when the frontend runs on your machine,
 *      - "54.12.34.56" (or your domain) when the page is served from the EC2 instance.
 *
 *  Because the browser already knows where it is, ONE file works in both places with
 *  no rebuild and no hardcoded IP. This is what kills the "localhost trap": a URL
 *  pointing to localhost always means "the machine of the visitor", so on a remote
 *  server it would point to the server itself and never to the developer's laptop.
 *
 *  The protocol is reused too, so an HTTPS page calls an HTTPS API and the browser
 *  does not block the request as "mixed content". (On file:// modules do not run at
 *  all, so serving the folder over HTTP is still required.)
 * ------------------------------------------------------------------------------------- */

// Port where the Spring Boot API is published by Docker Compose (host port 8080).
const API_PORT = 8080;

// Example result on the EC2 instance: "http://54.12.34.56:8080/api/products"
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api/products`;

/**
 * Performs an HTTP request against the API and returns the body already parsed as JSON.
 *
 * This is the single private helper of the module: every public function goes through
 * it, so the error handling is written once instead of six times.
 *
 * @param {string} url      - the full URL to call.
 * @param {object} options  - fetch options (method, headers, body).
 * @returns {Promise<object|Array<object>|null>} the response parsed as JSON.
 * @throws {Error} if the API answers with an error status (4xx / 5xx).
 */
async function request(url, options = {}) {
    // "fetch" is the native browser API to make HTTP requests (like curl).
    const response = await fetch(url, options);

    // We read the body as JSON. A 204 (DELETE) has no body, so we fall back to null.
    const data = await response.json().catch(() => null);

    // If the HTTP status is not 2xx the request failed: we throw with the backend message.
    if (!response.ok) {
        throw new Error(data?.message || `Error ${response.status}`);
    }

    return data;
}

/**
 * GET /api/products - Retrieves the full list of products.
 *
 * @returns {Promise<Array<object>>} every product in the database.
 */
export function getProducts() {
    // The "Accept" header states that we expect JSON back.
    return request(API_BASE_URL, { headers: { Accept: 'application/json' } });
}

/**
 * GET /api/products/search?q=term - Searches products whose name contains the term.
 *
 * @param {string} term - the text fragment to search for.
 * @returns {Promise<Array<object>>} the matching products, ordered by name.
 */
export function searchProducts(term) {
    // encodeURIComponent protects characters such as spaces, "&" or "ñ" in the query string.
    const query = encodeURIComponent(term ?? '');
    return request(`${API_BASE_URL}/search?q=${query}`, { headers: { Accept: 'application/json' } });
}

/**
 * GET /api/products/{id} - Retrieves a single product.
 *
 * @param {number} id - the id of the product.
 * @returns {Promise<object>} the product.
 */
export function getProduct(id) {
    return request(`${API_BASE_URL}/${id}`, { headers: { Accept: 'application/json' } });
}

/**
 * POST /api/products - Creates a new product.
 *
 * @param {object} product - object shaped like { name, description, price }.
 * @returns {Promise<object>} the created product, already with its generated id.
 */
export function createProduct(product) {
    return request(API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // We tell the backend the body is JSON
            Accept: 'application/json'
        },
        body: JSON.stringify(product) // We convert the JS object into a JSON string
    });
}

/**
 * PUT /api/products/{id} - Updates an existing product.
 *
 * @param {number} id      - the id of the product to update.
 * @param {object} product - the new data.
 * @returns {Promise<object>} the updated product.
 */
export function updateProduct(id, product) {
    return request(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(product)
    });
}

/**
 * DELETE /api/products/{id} - Deletes a product.
 *
 * @param {number} id - the id of the product to delete.
 * @returns {Promise<null>} nothing, because the API answers 204 with an empty body.
 */
export function deleteProduct(id) {
    return request(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' }
    });
}
