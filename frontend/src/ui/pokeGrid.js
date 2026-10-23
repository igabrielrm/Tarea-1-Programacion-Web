/* =====================================================================================
 *  ui/pokeGrid.js - View layer for the Pokédex grid (cards + status bar)
 *
 *  Responsibility: read from and write to the HTML of page2.html. This module never
 *  calls fetch(): it receives an array of already-fetched entries and paints one card
 *  per entry. Clicks are reported back through the callbacks registered with
 *  bindEvents(), so this file never decides what to do with a product or a Pokémon.
 * ===================================================================================== */

import { escapeHtml, formatLabel, setHidden } from './domUtils.js';
import { buildTypeBadges, formatDexNumber } from './pokemonMarkup.js';

// -------------------------------------------------------------------------------------
// DOM references. Module scripts are deferred, so the HTML is already parsed here.
// -------------------------------------------------------------------------------------
const grid = document.getElementById('pokemonGrid');
const emptyState = document.getElementById('emptyState');
const counter = document.getElementById('counter');
const searchStatus = document.getElementById('searchStatus');
const statusText = document.getElementById('statusText');
const statusSpinner = document.getElementById('statusSpinner');
const searchInput = document.getElementById('search');
const clearButton = document.getElementById('clearButton');

// -------------------------------------------------------------------------------------
// Tailwind class strings
// -------------------------------------------------------------------------------------
const CARD_CLASSES = [
    'group flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5',
    'shadow-sm transition duration-200',
    'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2'
].join(' ');

// Visual style of the status bar, one per state.
const STATUS_CLASSES = {
    info: 'bg-slate-100 text-slate-700',
    waiting: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    loading: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200',
    error: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
};

/**
 * Builds the DOM node of a single Pokémon card.
 *
 * @param {object} entry - { pokemon, species, evolutions, genus }.
 * @param {number} index - position in the results array, used to identify the card.
 * @returns {HTMLElement} the <article> ready to be inserted in the grid.
 */
function buildCard(entry, index) {
    const { pokemon, genus } = entry;

    // The official artwork looks better than the tiny game sprite, but it is not present
    // for every Pokémon, so we fall back to the front sprite.
    const sprite = pokemon.sprites?.other?.['official-artwork']?.front_default
        ?? pokemon.sprites?.front_default
        ?? '';

    const card = document.createElement('article');
    card.className = CARD_CLASSES;
    card.dataset.index = String(index);
    // A div with a click handler is not reachable with the keyboard; these attributes
    // make the card behave like a button for screen readers and for the Tab key.
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open the details of ${pokemon.name}`);

    card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
                <h3 class="truncate text-base font-semibold capitalize text-slate-900">${escapeHtml(pokemon.name)}</h3>
                <p class="mt-0.5 truncate text-xs text-slate-400">${escapeHtml(genus || 'Pokémon')}</p>
            </div>
            <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                ${formatDexNumber(pokemon.id)}
            </span>
        </div>

        <img src="${escapeHtml(sprite)}" alt="${escapeHtml(pokemon.name)}"
             class="mx-auto my-4 h-28 w-28 object-contain transition duration-200 group-hover:scale-105"
             loading="lazy">

        <div class="mt-auto flex flex-wrap gap-1.5">${buildTypeBadges(pokemon.types)}</div>
    `;

    return card;
}

/**
 * Renders a list of Pokémon as cards inside the responsive grid.
 *
 * The grid classes live in page2.html:
 *   grid-cols-1  -> 1 column on phones
 *   sm:grid-cols-2 -> 2 columns from 640 px
 *   lg:grid-cols-3 -> exactly 3 columns on desktop (from 1024 px)
 *
 * @param {Array<object>} entries - the Pokémon to display.
 */
export function renderResults(entries) {
    const fragment = document.createDocumentFragment();
    entries.forEach((entry, index) => fragment.appendChild(buildCard(entry, index)));

    // One single DOM operation instead of one per card.
    grid.replaceChildren(fragment);

    counter.textContent = String(entries.length);
    setHidden(emptyState, entries.length > 0);
    setHidden(clearButton, entries.length === 0);
}

/**
 * Shows a message in the status bar below the search box.
 *
 * The 'loading' variant also displays a spinner, which is the visible "Loading..."
 * state required by the exercise.
 *
 * @param {string} message - the text to display.
 * @param {'info'|'waiting'|'loading'|'error'} variant - the visual style.
 */
export function showStatus(message, variant = 'info') {
    const text = String(message ?? '').trim();

    if (text === '') {
        setHidden(searchStatus, true);
        return;
    }

    statusText.textContent = text;
    searchStatus.className = `mt-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${STATUS_CLASSES[variant] ?? STATUS_CLASSES.info}`;
    // The spinner is only meaningful while a request is in flight.
    setHidden(statusSpinner, variant !== 'loading');
    // aria-busy tells assistive technology that the content is being updated.
    searchStatus.setAttribute('aria-busy', String(variant === 'loading'));
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
 * Clears the search box.
 */
export function clearSearchInput() {
    searchInput.value = '';
    searchInput.focus();
}

/**
 * Wires the DOM events of the page to the callbacks provided by page2.js.
 *
 * @param {object}   handlers          - the callbacks to invoke.
 * @param {Function} handlers.onSearch - receives the term on EVERY keystroke.
 * @param {Function} handlers.onClear  - the Clear button was pressed.
 * @param {Function} handlers.onSelect - receives the index of the clicked card.
 */
export function bindEvents(handlers) {
    // Every change of the value fires this event: a letter, a backspace, a paste...
    // The debounce itself lives in page2.js, not here: the view only reports the event.
    searchInput.addEventListener('input', () => handlers.onSearch(getSearchTerm()));

    clearButton.addEventListener('click', handlers.onClear);

    // EVENT DELEGATION: the cards are created after the page loads, so we listen once
    // on the grid and read the data-index attribute of the card that was clicked.
    grid.addEventListener('click', (event) => {
        const card = event.target.closest('article[data-index]');
        if (card) {
            handlers.onSelect(Number(card.dataset.index));
        }
    });

    // Same behaviour with the keyboard: Enter and Space open the card when it has focus.
    grid.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        const card = event.target.closest('article[data-index]');
        if (card) {
            // Space would scroll the page down, so we cancel the browser default action.
            event.preventDefault();
            handlers.onSelect(Number(card.dataset.index));
        }
    });
}
