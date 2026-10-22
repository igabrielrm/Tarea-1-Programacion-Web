/* =====================================================================================
 *  main.js - Entry point (application / orchestration logic)
 *
 *  Responsibility: wire the HTTP layer (api/products.js) with the view layer
 *  (ui/productTable.js) and own the state of the screen. There is no fetch() and no
 *  direct DOM manipulation here: everything goes through the two modules above.
 *
 *  Loaded by index.html with:  <script type="module" src="src/main.js"></script>
 * ===================================================================================== */

import {
    getProducts,
    searchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} from './api/products.js';

import * as ui from './ui/productTable.js';

// How long the user must stop typing before the search request is fired (milliseconds).
const DEBOUNCE_DELAY_MS = 4000;

// Holds the id of the pending search timer. This is the state of the debounce.
let searchTimer = null;

// Id of the product being edited (null = the form is creating a new product).
let productBeingEdited = null;

/**
 * Loads the products from the API and paints them in the table.
 *
 * @param {string} term - optional search term. When empty the full list is loaded.
 */
async function loadProducts(term = '') {
    try {
        // "await" pauses only this function until the Promise settles.
        const products = term
            ? await searchProducts(term)
            : await getProducts();

        ui.renderProducts(products);
    } catch (error) {
        // If the API is not running or there is a CORS error, we land here.
        ui.showMessage(`Could not load the list: ${error.message}`, true);
    }
}

/**
 * DEBOUNCE: schedules the search request 4 seconds after the user stops typing.
 *
 * How it works:
 *   1. Every keystroke reaches this function.
 *   2. If a timer is already running we CANCEL it (clearTimeout).
 *   3. We start a brand new 4000 ms timer.
 *   4. Only when 4 full seconds pass WITHOUT a new keystroke does the timer fire and
 *      the request is actually sent.
 *
 * Why: typing "laptop" is 6 keystrokes. Without a debounce that is 6 HTTP requests;
 * with a debounce it is 1, sent 4 seconds after the last letter.
 *
 * @param {string} term - the current text of the search box.
 */
function scheduleSearch(term) {
    // Step 1: cancel the pending timer (if any). This is what makes it a "debounce"
    // and not a "throttle": every new keystroke pushes the deadline further away.
    if (searchTimer !== null) {
        clearTimeout(searchTimer);
    }

    // Step 2: start a new timer. setTimeout returns an id that we can cancel later.
    searchTimer = setTimeout(() => {
        // Step 3: the deadline was reached, so we finally ask the backend for the data.
        searchTimer = null;
        loadProducts(term);
    }, DEBOUNCE_DELAY_MS);
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
        await loadProducts(ui.getSearchTerm());
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
        await loadProducts(ui.getSearchTerm());
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
    onSearch: scheduleSearch,
    onEdit: handleEdit,
    onDelete: handleDelete
});

loadProducts();
