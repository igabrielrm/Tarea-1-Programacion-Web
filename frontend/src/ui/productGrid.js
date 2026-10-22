/* =====================================================================================
 *  ui/productGrid.js - View layer (the ONLY file allowed to touch the DOM)
 *
 *  Responsibility: read from and write to the HTML. This module never calls fetch():
 *  it receives an array of products as an argument and paints one card per product.
 *  It also reports user actions back through the callbacks that main.js registers
 *  with bindEvents().
 *
 *  Why "productGrid" and not "productTable": the products are no longer rows of a
 *  table, they are cards inside a CSS grid. The name of the file must describe what
 *  the file really does.
 * ===================================================================================== */

// How long a status message stays on screen (ms).
const MESSAGE_TIMEOUT_MS = 4000;

// -------------------------------------------------------------------------------------
// Tailwind class strings.
// They live in constants so the "look" of the message is defined once, and so the
// JavaScript does not become a wall of class names that is impossible to read.
// -------------------------------------------------------------------------------------
const MESSAGE_BASE = 'mt-4 rounded-xl px-4 py-3 text-sm font-medium';
const MESSAGE_SUCCESS = 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
const MESSAGE_ERROR = 'bg-rose-50 text-rose-800 ring-1 ring-rose-200';

// Full class list of one card. Kept together so the card design can be tuned in one place.
const CARD_CLASSES = [
    'group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5',
    'shadow-sm transition duration-200',
    'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg'
].join(' ');

// -------------------------------------------------------------------------------------
// DOM references. module scripts are deferred, so the HTML is always parsed by now.
// -------------------------------------------------------------------------------------
const form = document.getElementById('productForm');
const productGrid = document.getElementById('productGrid');
const emptyState = document.getElementById('emptyState');
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
 * Currency formatter. It is built ONCE, outside the render loop, because creating an
 * Intl.NumberFormat is expensive and the filter re-renders on every keystroke.
 * en-US + EUR prints the symbol first and always with two decimals: €1,299.90
 */
const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
});

/**
 * Escapes the five characters that can break HTML or inject a script.
 *
 * Why it is needed: the card is built with innerHTML, and a product name containing
 * "<script>" would be executed by the browser. Escaping keeps the data as text, which
 * is the same protection React or Thymeleaf apply automatically.
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
 * Formats a price coming from the API (a JSON number) as a euro string.
 *
 * @param {number} value - the price.
 * @returns {string} something like "€1,299.90", or "—" if the value is not a number.
 */
function formatPrice(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? priceFormatter.format(amount) : '—';
}

/**
 * Builds the DOM node of a single product card.
 *
 * @param {object} product - { id, name, description, price }.
 * @returns {HTMLElement} the <article> ready to be inserted in the grid.
 */
function buildProductCard(product) {
    const card = document.createElement('article');
    card.className = CARD_CLASSES;

    // An empty description would leave a blank gap, so we paint a subtle placeholder.
    const description = product.description
        ? `<p class="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">${escapeHtml(product.description)}</p>`
        : '<p class="mt-2 text-sm italic text-slate-400">No description</p>';

    card.innerHTML = `
        <div>
            <div class="flex items-start justify-between gap-3">
                <h3 class="text-base font-semibold leading-snug text-slate-900">${escapeHtml(product.name)}</h3>
                <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    #${escapeHtml(product.id)}
                </span>
            </div>
            ${description}
        </div>

        <div class="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span class="text-lg font-bold tracking-tight text-slate-900">${formatPrice(product.price)}</span>

            <div class="flex gap-2">
                <button type="button" data-action="edit" data-id="${escapeHtml(product.id)}"
                        class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300">
                    Edit
                </button>
                <button type="button" data-action="delete" data-id="${escapeHtml(product.id)}"
                        class="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300">
                    Delete
                </button>
            </div>
        </div>
    `;

    return card;
}

/**
 * Renders a list of products as cards inside the grid.
 *
 * It replaces the whole content of the grid on every call. That is intentional: the
 * search box calls it on every keystroke, and replacing a few nodes is cheaper and much
 * simpler than diffing them. With thousands of cards the right move would be
 * pagination on the server, not a smarter DOM update.
 *
 * @param {Array<object>} products - the products to display (already filtered or not).
 */
export function renderProducts(products) {
    // A DocumentFragment lets the browser lay out the cards only once, not once per card.
    const fragment = document.createDocumentFragment();
    products.forEach((product) => fragment.appendChild(buildProductCard(product)));

    // replaceChildren swaps the old cards for the new ones in a single operation.
    productGrid.replaceChildren(fragment);

    counter.textContent = String(products.length);
    emptyState.classList.toggle('hidden', products.length > 0);
}

/**
 * Shows a status message (green = success, red = error).
 *
 * @param {string} text     - the text to display.
 * @param {boolean} isError - true to show the message in red.
 */
export function showMessage(text, isError = false) {
    statusMessage.textContent = text;
    // "hidden" is dropped here, which is what makes the message appear.
    statusMessage.className = `${MESSAGE_BASE} ${isError ? MESSAGE_ERROR : MESSAGE_SUCCESS}`;

    // The previous timer is cleared so two messages in a row do not hide each other early.
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
        statusMessage.className = `${MESSAGE_BASE} hidden`;
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
    saveButton.textContent = 'Update product';

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
    saveButton.textContent = 'Save product';
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
 * @param {Function} handlers.onSearch   - receives the current search term, on EVERY keystroke.
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

    // === INSTANT SEARCH: no timer, no debounce, no network ===
    // The "input" event fires on EVERY change of the value: a letter, the backspace,
    // a paste, or the native "x" of <input type="search">. We forward it immediately.
    searchInput.addEventListener('input', () => handlers.onSearch(getSearchTerm()));

    // EVENT DELEGATION: instead of adding a listener to every card button (the cards
    // are created after the page loads), we listen once on the grid and read the
    // data-action / data-id attributes of the button that was clicked.
    productGrid.addEventListener('click', (event) => {
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
