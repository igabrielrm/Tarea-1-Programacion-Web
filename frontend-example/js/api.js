/* =====================================================================================
 *  api.js - Communication layer with the REST API (pure Vanilla JS, no frameworks)
 *
 *  Every function in this file maps to one endpoint of the ProductController:
 *      getProducts()      ->  GET    /api/products
 *      searchProducts()   ->  GET    /api/products/search?q=term
 *      getProduct(id)     ->  GET    /api/products/{id}
 *      createProduct()    ->  POST   /api/products
 *      updateProduct()    ->  PUT    /api/products/{id}
 *      deleteProduct()    ->  DELETE /api/products/{id}
 * ===================================================================================== */

// Base URL of the API. NOTE: this is the BACKEND origin (localhost:8080), not the frontend one.
const API_URL = 'http://localhost:8080/api/products';

/**
 * Performs an HTTP request against the API and returns the data already parsed into a JS object.
 *
 * @param {string} url       - the full URL to call.
 * @param {object} options   - fetch options (method, headers, body).
 * @returns {Promise<object>} the response parsed as JSON.
 * @throws {Error} if the API answers with an error status (4xx / 5xx).
 */
async function request(url, options = {}) {
    // "fetch" is the native browser API to make HTTP requests (like curl).
    const response = await fetch(url, options);

    // We read the body of the response as JSON.
    const data = await response.json().catch(() => null);

    // If the HTTP status is not 2xx the request failed: we throw with the backend message.
    if (!response.ok) {
        throw new Error(data?.message || `Error ${response.status}`);
    }

    return data;
}

/**
 * GET /api/products - Retrieves the full list of products.
 */
function getProducts() {
    // The "Accept" header states that we expect JSON back.
    return request(API_URL, { headers: { 'Accept': 'application/json' } });
}

/**
 * GET /api/products/search?q=term - Searches products whose name contains the term.
 *
 * @param {string} term - the text fragment to search for.
 */
function searchProducts(term) {
    const query = encodeURIComponent(term ?? '');
    return request(`${API_URL}/search?q=${query}`, { headers: { 'Accept': 'application/json' } });
}

/**
 * GET /api/products/{id} - Retrieves a single product.
 */
function getProduct(id) {
    return request(`${API_URL}/${id}`, { headers: { 'Accept': 'application/json' } });
}

/**
 * POST /api/products - Creates a new product.
 *
 * @param {object} product - object shaped like { name, description, price }.
 */
function createProduct(product) {
    return request(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',   // We tell the backend the body is JSON
            'Accept': 'application/json'
        },
        body: JSON.stringify(product)            // We convert the JS object into a JSON string
    });
}

/**
 * PUT /api/products/{id} - Updates an existing product.
 *
 * @param {number} id       - the id of the product to update.
 * @param {object} product - the new data.
 */
function updateProduct(id, product) {
    return request(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(product)
    });
}

/**
 * DELETE /api/products/{id} - Deletes a product.
 */
function deleteProduct(id) {
    return request(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
    });
}
