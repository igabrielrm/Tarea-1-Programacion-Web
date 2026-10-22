/* =====================================================================================
 *  app.js - User interface logic (View layer) of the Vanilla JS frontend
 *
 *  There are NO direct fetch calls here: the functions of api.js are used instead.
 *  This separation keeps the UI independent from the HTTP details.
 * ===================================================================================== */

// How long the user must stop typing before the search request is fired (in milliseconds).
const DEBOUNCE_DELAY_MS = 4000;

// Holds the id of the pending search timer. It is the "state" of the debounce.
let searchTimer = null;

// Variable that holds the current state of the screen.
let productBeingEdited = null;   // Id of the product being edited (null = creating a new one)

/** References to the HTML elements we are going to manipulate. */
const form = document.getElementById('productForm');
const tableBody = document.getElementById('tableBody');
const statusMessage = document.getElementById('statusMessage');
const formTitle = document.getElementById('formTitle');
const saveButton = document.getElementById('saveButton');
const cancelButton = document.getElementById('cancelButton');
const searchInput = document.getElementById('search');

/**
 * Shows a status message (green = success, red = error).
 *
 * @param {string} text    - the text to display.
 * @param {boolean} isError - true to show the message in red.
 */
function showMessage(text, isError = false) {
    statusMessage.textContent = text;
    statusMessage.className = isError ? 'error' : 'ok';
    // We hide it after 4 seconds.
    setTimeout(() => { statusMessage.style.display = 'none'; }, 4000);
}

/**
 * Renders a list of products in the table.
 *
 * @param {Array<object>} products - the products returned by the API.
 */
function renderProducts(products) {
    // We clear the table in case a previous load had left rows behind.
    tableBody.innerHTML = '';

    // We walk the array of products and create one <tr> for each of them.
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.description ?? ''}</td>
            <td>${product.price} €</td>
            <td class="actions">
                <button class="btn-sec" onclick="handleEditProduct(${product.id})">Edit</button>
                <button class="btn-danger" onclick="handleDeleteProduct(${product.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('counter').textContent = products.length;
}

/**
 * Loads the products from the API and paints them in the table.
 *
 * @param {string} term - optional search term. When it is empty the full list is loaded.
 */
async function loadProducts(term = '') {
    try {
        // "await" waits until the fetch promise is resolved.
        const products = term
            ? await searchProducts(term)
            : await getProducts();

        renderProducts(products);
    } catch (error) {
        // If the API is not running or there is a CORS error, we land here.
        showMessage(`Could not load the list: ${error.message}`, true);
    }
}

/**
 * DEBOUNCE: schedules the search request 4 seconds after the user stops typing.
 *
 * <p>THE CORE LOGIC:
 * <ol>
 *   <li>Every keystroke reaches this function.</li>
 *   <li>If a timer was already running, we CANCEL it (clearTimeout).</li>
 *   <li>We start a brand new timer of 4000 ms.</li>
 *   <li>Only when 4 full seconds pass WITHOUT a new keystroke does the timer fire
 *       and the request is actually sent.</li>
 * </ol>
 *
 * <p>Why: typing "laptop" is 6 keystrokes. Without a debounce that would be 6 HTTP
 * requests. With a debounce it is just 1, sent 4 seconds after the last letter.
 *
 * @param {string} term - the current text of the search box.
 */
function scheduleSearch(term) {
    // Step 1: cancel the pending timer (if any). This is what makes it a "debounce"
    // instead of a "throttle": every new keystroke pushes the deadline further away.
    if (searchTimer !== null) {
        clearTimeout(searchTimer);
    }

    // Step 2: start a new timer. setTimeout returns an id that we can cancel later.
    searchTimer = setTimeout(() => {
        // Step 3: the deadline was reached, so now we finally ask the backend for the data.
        searchTimer = null;
        loadProducts(term);
    }, DEBOUNCE_DELAY_MS);
}

/**
 * Asks the backend for the product to edit and fills the form with its data.
 *
 * @param {number} id - the id of the product to edit.
 */
async function handleEditProduct(id) {
    try {
        const product = await getProduct(id);

        // We store the id so we know if we must POST (create) or PUT (update) later.
        productBeingEdited = product.id;

        // We fill in the form fields.
        document.getElementById('id').value = product.id;
        document.getElementById('name').value = product.name;
        document.getElementById('description').value = product.description ?? '';
        document.getElementById('price').value = product.price;

        // We change the labels to show that we are editing.
        formTitle.textContent = `Editing product #${product.id}`;
        saveButton.textContent = 'Update';
    } catch (error) {
        showMessage(error.message, true);
    }
}

/**
 * Deletes a product (it asks for confirmation first).
 *
 * <p>The name is prefixed with "handle" on purpose: api.js already exports a global
 * "deleteProduct" function that performs the HTTP request, and two global functions
 * with the same name would overwrite each other.
 *
 * @param {number} id - the id of the product to delete.
 */
async function handleDeleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        await deleteProduct(id);
        showMessage('Product deleted successfully');
        await loadProducts(searchInput.value.trim());
    } catch (error) {
        showMessage(error.message, true);
    }
}

/**
 * Clears the form and goes back to the "create new" mode.
 */
function resetForm() {
    productBeingEdited = null;
    form.reset();
    document.getElementById('id').value = '';
    formTitle.textContent = 'New product';
    saveButton.textContent = 'Save';
}

/**
 * Submit event of the form: decides whether it is a create (POST) or an edit (PUT).
 */
form.addEventListener('submit', async (event) => {
    // preventDefault stops the browser from reloading the page when the form is submitted.
    event.preventDefault();

    // We build the object that will be sent as JSON.
    const product = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('price').value)
    };

    try {
        if (productBeingEdited === null) {
            // CREATE: the backend generates the id.
            await createProduct(product);
            showMessage('Product created successfully');
        } else {
            // EDIT: we send the id in the URL and the backend runs the UPDATE.
            await updateProduct(productBeingEdited, product);
            showMessage('Product updated successfully');
        }

        resetForm();
        await loadProducts(searchInput.value.trim());
    } catch (error) {
        // Here we receive the validation errors (400) and the duplicates (409) from the backend.
        showMessage(error.message, true);
    }
});

// The "Cancel" button clears the form and leaves the edit mode.
cancelButton.addEventListener('click', resetForm);

// Every keystroke on the search box RESETS the 4 second countdown.
searchInput.addEventListener('input', (event) => {
    scheduleSearch(event.target.value.trim());
});

// When the page loads, we ask the backend for the list of products.
document.addEventListener('DOMContentLoaded', () => loadProducts());
