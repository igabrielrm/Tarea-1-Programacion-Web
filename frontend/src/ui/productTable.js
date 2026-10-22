/* =====================================================================================
 *  ui/productTable.js - View layer (the ONLY file allowed to touch the DOM)
 *
 *  Responsibility: read from and write to the HTML. This module never calls fetch():
 *  it receives data as arguments and paints it, and it reports user actions back
 *  through the callbacks that main.js registers with bindEvents().
 *
 *  Keeping the DOM here means the HTML ids are written in a single place. If an id
 *  changes, only this file needs to be updated.
 * ===================================================================================== */

// How long a status message stays on screen (ms).
const MESSAGE_TIMEOUT_MS = 4000;

// -------------------------------------------------------------------------------------
// DOM references. module scripts are deferred, so the HTML is always parsed by now.
// -------------------------------------------------------------------------------------
const form = document.getElementById('productForm');
const tableBody = document.getElementById('tableBody');
const statusMessage = document.getElementById('statusMessage');
const formTitle = document.getElementById('formTitle');
const saveButton = document.getElementById('saveButton');
const cancelButton = document.getElementById('cancelButton');
const searchInput = document.getElementById('search');
const counter = document.getElementById('counter');
const idInput = document.getElementById('id');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');

/**
 * Escapes the five characters that can break HTML or inject a script.
 *
 * Why it is needed: renderProducts() builds rows with innerHTML, and a product name
 * containing "<script>" would be executed by the browser. Escaping keeps the data
 * as text, which is the same protection Thymeleaf or React apply automatically.
 *
 * @param {*} value - any value coming from the API.
 * @returns {string} the value ready to be inserted inside HTML.
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/**
 * Renders a list of products in the table.
 *
 * @param {Array<object>} products - the products returned by the API.
 */
export function renderProducts(products) {
    // We clear the table in case a previous load had left rows behind.
    tableBody.innerHTML = '';

    // We walk the array and create one <tr> per product.
    products.forEach((product) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.description)}</td>
            <td>${escapeHtml(product.price)} &euro;</td>
            <td class="actions">
                <button type="button" class="btn-sec" data-action="edit" data-id="${product.id}">Edit</button>
                <button type="button" class="btn-danger" data-action="delete" data-id="${product.id}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    counter.textContent = products.length;
}

/**
 * Shows a status message (green = success, red = error).
 *
 * @param {string} text     - the text to display.
 * @param {boolean} isError - true to show the message in red.
 */
export function showMessage(text, isError = false) {
    statusMessage.textContent = text;
    statusMessage.className = isError ? 'error' : 'ok';
    statusMessage.style.display = 'block';

    // We hide it after 4 seconds. The previous timer is cleared so two messages
    // shown in a row do not hide each other earlier than expected.
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
        statusMessage.style.display = 'none';
    }, MESSAGE_TIMEOUT_MS);
}

/**
 * Switches the form to "edit" mode and fills it with the data of a product.
 *
 * @param {object} product - the product returned by GET /api/products/{id}.
 */
export function renderFormForEdit(product) {
    idInput.value = product.id;
    nameInput.value = product.name;
    descriptionInput.value = product.description ?? '';
    priceInput.value = product.price;

    formTitle.textContent = `Editing product #${product.id}`;
    saveButton.textContent = 'Update';

    // Brings the form into view and places the cursor in the first field.
    nameInput.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Clears the form and goes back to the "create new" mode.
 */
export function resetForm() {
    form.reset();
    idInput.value = '';
    formTitle.textContent = 'New product';
    saveButton.textContent = 'Save';
}

/**
 * Reads the current values of the form.
 *
 * @returns {{name: string, description: string, price: number}} the payload for the API.
 */
export function readForm() {
    return {
        name: nameInput.value,
        description: descriptionInput.value,
        // Number() converts the string of the input into a real number (or NaN if empty).
        price: Number(priceInput.value)
    };
}

/**
 * Returns the text typed in the search box, without surrounding spaces.
 *
 * @returns {string} the current search term.
 */
export function getSearchTerm() {
    return searchInput.value.trim();
}

/**
 * Asks the user to confirm a deletion.
 *
 * @returns {boolean} true when the user accepts.
 */
export function confirmDeletion() {
    return window.confirm('Are you sure you want to delete this product?');
}

/**
 * Wires every DOM event of the page to the callbacks provided by main.js.
 *
 * This is the "port" between the view and the application logic: the view knows
 * which element was clicked, main.js knows what to do with it.
 *
 * @param {object}   handlers            - the callbacks to invoke.
 * @param {Function} handlers.onSubmit   - receives the payload read from the form.
 * @param {Function} handlers.onCancel   - the Cancel button was pressed.
 * @param {Function} handlers.onSearch   - receives the current search term.
 * @param {Function} handlers.onEdit     - receives the id of the product to edit.
 * @param {Function} handlers.onDelete   - receives the id of the product to delete.
 */
export function bindEvents(handlers) {
    // The form is submitted with the Save/Update button or with the Enter key.
    form.addEventListener('submit', (event) => {
        // preventDefault stops the browser from reloading the page.
        event.preventDefault();
        handlers.onSubmit(readForm());
    });

    cancelButton.addEventListener('click', handlers.onCancel);

    // Every keystroke on the search box is forwarded; the debounce lives in main.js.
    searchInput.addEventListener('input', () => handlers.onSearch(getSearchTerm()));

    // EVENT DELEGATION: instead of adding a listener to every row button (they are
    // created after the page loads), we listen once on the table and read the
    // data-action / data-id attributes of the button that was clicked.
    tableBody.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        const id = Number(button.dataset.id);
        if (button.dataset.action === 'edit') {
            handlers.onEdit(id);
        } else if (button.dataset.action === 'delete') {
            handlers.onDelete(id);
        }
    });
}
