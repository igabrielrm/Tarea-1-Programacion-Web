/* =====================================================================================
 *  page2.js - Entry point of the Pokédex page (application / orchestration logic)
 *
 *  Responsibility: wire the HTTP layer (api/pokeApi.js) with the view layer
 *  (ui/pokeGrid.js + ui/pokeModal.js) and own the state of the screen:
 *    - the debounce timer (4000 ms),
 *    - the list of Pokémon already fetched,
 *    - the "generation" counter that discards stale answers.
 *
 *  There is no fetch() and no direct DOM manipulation in this file.
 * ===================================================================================== */

import { getPokemonWithEvolutions } from './api/pokeApi.js';
import * as ui from './ui/pokeGrid.js';
import * as modal from './ui/pokeModal.js';

/**
 * The delay of the debounce, in milliseconds.
 *
 * Written as "4 * 1000" instead of "4000" so the unit is explicit at a glance:
 * setTimeout() works in milliseconds, and 4000 ms = 4 s.
 */
const DEBOUNCE_DELAY_MS = 4 * 1000;

/** Pokémon already fetched, newest first. It is the data behind the grid. @type {Array<object>} */
let results = [];

/** Handle returned by setTimeout(). It is null when no search is pending. */
let debounceTimer = null;

/**
 * Counter that identifies the current search.
 *
 * Every keystroke increments it. When a request finishes, we compare the generation it
 * was started with against the current one: if they differ, a newer search exists and
 * the answer is stale, so it is thrown away. This is the guard that prevents an old,
 * slower request from overwriting a newer result (a "race condition").
 */
let searchGeneration = 0;

/**
 * Cancels any pending debounced search.
 */
function cancelPendingSearch() {
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
}

/**
 * Handles one keystroke in the search box.
 *
 * THIS IS THE DEBOUNCE. It does not fetch anything: it only (re)starts a 4 second timer.
 * Every new keystroke clears the previous timer, so the request can only run when the
 * user has been quiet for the whole delay.
 *
 * @param {string} term - the text currently in the input.
 */
function handleSearch(term) {
    // A new keystroke invalidates any request that is already in flight.
    const generation = searchGeneration + 1;
    searchGeneration = generation;

    // Restart the timer from zero. If the user types again, this timer dies with clearTimeout.
    cancelPendingSearch();

    if (term === '') {
        ui.showStatus('Type a Pokémon name to search.', 'info');
        return;
    }

    // The input event fires on every key; we inform the user that nothing is being sent yet.
    ui.showStatus(
        `Waiting for you to stop typing... the request will be sent in ${DEBOUNCE_DELAY_MS / 1000} seconds.`,
        'waiting'
    );

    // setTimeout returns an id that clearTimeout() can cancel later.
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        runSearch(term, generation);
    }, DEBOUNCE_DELAY_MS);
}

/**
 * Runs the chain of three requests and paints the result.
 *
 * @param {string} term - the text to search for.
 * @param {number} generation - the search this request belongs to.
 */
async function runSearch(term, generation) {
    ui.showStatus('Loading...', 'loading');

    try {
        // One await, three HTTP requests inside (see api/pokeApi.js).
        const entry = await getPokemonWithEvolutions(term);

        // The user typed again while this request was travelling: the answer is obsolete.
        if (generation !== searchGeneration) {
            return;
        }

        // The newest search goes first and duplicates are replaced instead of repeated.
        results = [entry, ...results.filter((item) => item.pokemon.id !== entry.pokemon.id)];
        ui.renderResults(results);

        ui.showStatus(`${entry.pokemon.name} added to the grid. Click its card to see the details.`, 'info');
    } catch (error) {
        // Also ignore errors from a search the user already replaced.
        if (generation !== searchGeneration) {
            return;
        }

        // 404 (unknown Pokémon), offline, timeout and CORS land here with a readable message.
        ui.showStatus(error.message, 'error');
    }
}

/**
 * Opens the modal of the selected card.
 *
 * @param {number} index - position of the card in the results array.
 */
function handleSelect(index) {
    const entry = results[index];
    if (!entry) {
        return;
    }

    modal.openModal(entry);
}

/**
 * Empties the grid and the search box.
 */
function handleClear() {
    // Incrementing the generation cancels the effect of any answer still in flight.
    searchGeneration += 1;
    cancelPendingSearch();

    results = [];
    ui.renderResults(results);
    ui.clearSearchInput();
    ui.showStatus('Results cleared. Type a Pokémon name to search again.', 'info');
}

// -------------------------------------------------------------------------------------
// Bootstrap
// -------------------------------------------------------------------------------------
ui.bindEvents({
    onSearch: handleSearch,
    onClear: handleClear,
    onSelect: handleSelect
});

ui.renderResults([]);
ui.showStatus('Type a Pokémon name and wait 4 seconds without typing to search.', 'info');
