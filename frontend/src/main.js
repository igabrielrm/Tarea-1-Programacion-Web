/* =====================================================================================
 *  main.js - Entry point (application / orchestration logic)
 *
 *  Responsibility: wire the HTTP layer (api/products.js) with the view layer
 *  (ui/productGrid.js) and own the state of the screen. There is no fetch() and no
 *  direct DOM manipulation here: everything goes through the two modules above.
 *
 *  Loaded by index.html with:  <script type="module" src="src/main.js"></script>
 * ===================================================================================== */

import {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} from './api/products.js';

import * as ui from './ui/productGrid.js';

/**
 * The full list of products as it was last read from the API.
 *
 * This is the "source of truth" of the instant search: the filter NEVER asks the
 * server again, it just walks this array. That is why typing is instantaneous and why
 * the search box produces zero HTTP requests.
 *
 * @type {Array<object>}
 */
let allProducts = [];

/**
 * Id of the product being edited (null = the form is creating a new product).
 */
let productBeingEdited = null;

/**
 * Loads the full list from the API, keeps it in memory and repaints the grid using the
 * search term that is currently written in the input.
 */
async function loadProducts() {
    try {
        allProducts = await getProducts();
        applyFilter(ui.getSearchTerm());
    } catch (error) {
        // If the API is not running or there is a CORS error, we land here.
        ui.showMessage(`Could not load the list: ${error.message}`, true);
    }
}

/**
 * Pure function: given a list and a term, returns the products whose name contains it.
 *
 * "Pure" means it has no side effects: it does not touch the DOM, it does not call the
 * network and it does not modify the array it receives (filter returns a NEW array).
 * Being pure makes it trivial to test and to reason about.
 *
 * @param {Array<object>} products - the full list.
 * @param {string} term            - what the user typed.
 * @returns {Array<object>} the matching products (the same list when the term is empty).
 */
function filterProducts(products, term) {
    const needle = term.trim().toLowerCase();

    // An empty search must show everything, not an empty grid.
    if (needle === '') {
        return products;
    }

    // includes() is a case-insensitive "contains" because both sides were lowercased.
    return products.filter((product) =>
        String(product.name ?? '').toLowerCase().includes(needle)
    );
}

/**
 * Repaints the grid with the products that match the term.
 *
 * Called on EVERY keystroke. No setTimeout, no debounce, no request: it only reads the
 * in-memory array and rebuilds the DOM nodes, which takes microseconds.
 *
 * @param {string} term - the current text of the search box.
 */
function applyFilter(term) {
    ui.renderProducts(filterProducts(allProducts, term));
}

/**
 * Asks the backend for a product and switches the form to edit mode.
 *
 * @param {number} id - the id of the product to edit.
 */
async function handleEdit(id) {
    try {
        const product = await getProduct(id);

        // We remember the id to decide later between POST (create) and PUT (update).
        productBeingEdited = product.id;
        ui.renderFormForEdit(product);
    } catch (error) {
        ui.showMessage(error.message, true);
    }
}

/**
 * Deletes a product after asking for confirmation.
 *
 * @param {number} id - the id of the product to delete.
 */
async function handleDelete(id) {
    if (!ui.confirmDeletion()) {
        return;
    }

    try {
        await deleteProduct(id);
        ui.showMessage('Product deleted successfully');
        // We reload the full list so the in-memory copy stays in sync with the database.
        await loadProducts();
    } catch (error) {
        ui.showMessage(error.message, true);
    }
}

/**
 * Handles the form submit: it decides between creating (POST) and updating (PUT).
 *
 * @param {{name: string, description: string, price: number}} product - the form data.
 */
async function handleSubmit(product) {
    try {
        if (productBeingEdited === null) {
            // CREATE: the backend generates the id.
            await createProduct(product);
            ui.showMessage('Product created successfully');
        } else {
            // UPDATE: the id travels in the URL and the body carries the new data.
            await updateProduct(productBeingEdited, product);
            ui.showMessage('Product updated successfully');
        }

        handleCancel();
        await loadProducts();
    } catch (error) {
        // Here we receive the 400 (validation) and 409 (duplicate) answers of the API.
        ui.showMessage(error.message, true);
    }
}

/**
 * Leaves the edit mode and clears the form.
 */
function handleCancel() {
    productBeingEdited = null;
    ui.resetForm();
}

// -------------------------------------------------------------------------------------
// Bootstrap: connect the view with the logic above and paint the first load.
// module scripts are deferred, so the DOM already exists at this point and there is
// no need for a DOMContentLoaded listener.
// -------------------------------------------------------------------------------------
ui.bindEvents({
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    onSearch: applyFilter,
    onEdit: handleEdit,
    onDelete: handleDelete
});

loadProducts();
