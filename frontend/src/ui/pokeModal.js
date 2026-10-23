/* =====================================================================================
 *  ui/pokeModal.js - Detail modal of page 2
 *
 *  Responsibility: paint the full detail of one Pokémon (including the evolutions that
 *  come from the third endpoint) inside a dialog and handle its three ways of closing:
 *  the X button, a click on the dark backdrop and the Escape key.
 *
 *  This module receives the entry already fetched by page2.js: it never calls fetch().
 * ===================================================================================== */

import { escapeHtml, formatLabel, setHidden } from './domUtils.js';
import { buildTypeBadges, formatDexNumber } from './pokemonMarkup.js';

// Readable names for the six stats. The API sends slugs such as "special-attack".
const STAT_LABELS = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed'
};

const modal = document.getElementById('pokemonModal');
const modalContent = document.getElementById('modalContent');
const modalPanel = document.getElementById('modalPanel');

// The element that had the focus before opening the modal, so we can give it back on close.
let lastFocusedElement = null;

/**
 * Picks the colour of a stat bar from its value.
 *
 * @param {number} value - the base stat (0-255).
 * @returns {string} the Tailwind class of the bar.
 */
function statBarColor(value) {
    if (value >= 100) return 'bg-emerald-500';
    if (value >= 70) return 'bg-indigo-500';
    if (value >= 50) return 'bg-amber-500';
    return 'bg-rose-400';
}

/**
 * Builds the list of stat bars.
 *
 * The width cannot be a Tailwind class because the value is dynamic at runtime, so it
 * goes in a style attribute. This is the only legitimate use of inline CSS here.
 *
 * @param {Array<object>} stats - the `stats` array of the Pokemon resource.
 * @returns {string} the HTML of the list.
 */
function buildStats(stats) {
    return (stats ?? [])
        .map(({ base_stat: baseStat, stat }) => {
            // The maximum base stat in the games is around 255, so 255 = 100 % bar.
            const percent = Math.min(100, Math.round((baseStat / 255) * 100));
            const label = STAT_LABELS[stat.name] ?? formatLabel(stat.name);

            return `
                <li>
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-medium text-slate-600">${escapeHtml(label)}</span>
                        <span class="font-semibold text-slate-900">${baseStat}</span>
                    </div>
                    <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div class="h-full rounded-full ${statBarColor(baseStat)}" style="width: ${percent}%"></div>
                    </div>
                </li>
            `;
        })
        .join('');
}

/**
 * Builds one small "chip" of the evolution chain.
 *
 * @param {object} evolution - { id, name, sprite, minLevel }.
 * @param {number} currentId - id of the Pokémon whose modal is open.
 * @returns {string} the HTML of the chip.
 */
function buildEvolutionChip(evolution, currentId) {
    // The Pokémon being viewed is highlighted so the user can locate it in the chain.
    const highlight = evolution.id === currentId
        ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
        : 'border-slate-200 bg-white';

    const sprite = evolution.sprite
        ? `<img src="${escapeHtml(evolution.sprite)}" alt="${escapeHtml(evolution.name)}"
                class="h-16 w-16 object-contain" loading="lazy">`
        : '<div class="h-16 w-16"></div>';

    const level = evolution.minLevel
        ? `<span class="text-[11px] text-slate-400">Lv. ${evolution.minLevel}</span>`
        : '<span class="text-[11px] text-slate-400">&nbsp;</span>';

    return `
        <div class="flex w-24 flex-col items-center rounded-xl border p-2 ${highlight}">
            ${sprite}
            <span class="mt-1 max-w-full truncate text-xs font-semibold capitalize text-slate-700">
                ${escapeHtml(evolution.name)}
            </span>
            ${level}
        </div>
    `;
}

/**
 * Builds the whole evolution section.
 *
 * The flattened list has one `depth` per evolution stage, so we paint one row per depth
 * and an arrow between rows. Branching families (Eevee) simply produce several chips in
 * the same row, which is exactly what they are.
 *
 * @param {Array<object>} evolutions - the flattened chain.
 * @param {number} currentId - id of the Pokémon whose modal is open.
 * @returns {string} the HTML of the section.
 */
function buildEvolutionChain(evolutions, currentId) {
    if (!evolutions || evolutions.length === 0) {
        return '<p class="text-sm text-slate-500">No evolution data available.</p>';
    }

    const maxDepth = Math.max(...evolutions.map((evolution) => evolution.depth));
    const rows = [];

    for (let depth = 0; depth <= maxDepth; depth += 1) {
        const stage = evolutions.filter((evolution) => evolution.depth === depth);
        if (stage.length === 0) {
            continue;
        }

        rows.push(`
            <div class="flex flex-wrap items-start justify-center gap-3">
                ${stage.map((evolution) => buildEvolutionChip(evolution, currentId)).join('')}
            </div>
        `);
    }

    // ↓ between stages
    return rows.join('<div class="my-2 text-center text-lg text-slate-300">&darr;</div>');
}

/**
 * Builds the inner HTML of the modal for one Pokémon.
 *
 * @param {object} entry - { pokemon, species, evolutions, genus, flavorText }.
 * @returns {string} the HTML to inject.
 */
function buildModalContent(entry) {
    const { pokemon, species, evolutions, genus, flavorText } = entry;

    // Official artwork when available, front sprite otherwise.
    const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default
        ?? pokemon.sprites?.front_default
        ?? '';

    // PokéAPI stores height in decimetres and weight in hectograms, so both are divided by 10.
    const heightInMetres = (pokemon.height / 10).toFixed(1);
    const weightInKilograms = (pokemon.weight / 10).toFixed(1);

    const abilities = (pokemon.abilities ?? [])
        .map(({ ability, is_hidden: isHidden }) => `
            <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                ${escapeHtml(formatLabel(ability.name))}${isHidden ? ' <span class="text-slate-400">(hidden)</span>' : ''}
            </span>
        `)
        .join('');

    const legendaryBadge = species.is_legendary
        ? '<span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Legendary</span>'
        : species.is_mythical
            ? '<span class="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-800">Mythical</span>'
            : '';

    return `
        <!-- ============ HEADER ============ -->
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-6 backdrop-blur">
            <div class="flex items-center gap-4">
                <img src="${escapeHtml(artwork)}" alt="${escapeHtml(pokemon.name)}"
                     class="h-24 w-24 shrink-0 object-contain">

                <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
                        ${formatDexNumber(pokemon.id)}${genus ? ` &middot; ${escapeHtml(genus)}` : ''}
                    </p>
                    <h2 id="modalTitle" class="truncate text-2xl font-bold capitalize text-slate-900">
                        ${escapeHtml(pokemon.name)}
                    </h2>
                    <div class="mt-2 flex flex-wrap items-center gap-1.5">
                        ${buildTypeBadges(pokemon.types)}
                        ${legendaryBadge}
                    </div>
                </div>
            </div>

            <button type="button" data-close-modal aria-label="Close the details"
                    class="shrink-0 rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18"></path>
                </svg>
            </button>
        </div>

        <!-- ============ BODY ============ -->
        <div class="grid gap-6 p-6 md:grid-cols-2">

            <!-- Physical data + stats -->
            <section>
                <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Measurements</h3>
                <dl class="mt-3 grid grid-cols-2 gap-3">
                    <div class="rounded-xl bg-slate-50 p-3">
                        <dt class="text-xs text-slate-500">Height</dt>
                        <dd class="text-lg font-semibold text-slate-900">${heightInMetres} m</dd>
                    </div>
                    <div class="rounded-xl bg-slate-50 p-3">
                        <dt class="text-xs text-slate-500">Weight</dt>
                        <dd class="text-lg font-semibold text-slate-900">${weightInKilograms} kg</dd>
                    </div>
                    <div class="rounded-xl bg-slate-50 p-3">
                        <dt class="text-xs text-slate-500">Base XP</dt>
                        <dd class="text-lg font-semibold text-slate-900">${pokemon.base_experience ?? '&mdash;'}</dd>
                    </div>
                    <div class="rounded-xl bg-slate-50 p-3">
                        <dt class="text-xs text-slate-500">Capture rate</dt>
                        <dd class="text-lg font-semibold text-slate-900">${species.capture_rate ?? '&mdash;'}</dd>
                    </div>
                </dl>

                <h3 class="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Abilities</h3>
                <div class="mt-3 flex flex-wrap gap-2">${abilities || '<span class="text-sm text-slate-500">None</span>'}</div>

                <h3 class="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Base stats</h3>
                <ul class="mt-3 space-y-2.5">${buildStats(pokemon.stats)}</ul>
            </section>

            <!-- Pokédex text -->
            <section>
                <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Pokédex entry</h3>
                <p class="mt-3 text-sm leading-relaxed text-slate-600">
                    ${escapeHtml(flavorText) || 'No Pokédex entry available in English.'}
                </p>

                <dl class="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <dt class="text-slate-500">Habitat</dt>
                        <dd class="font-medium capitalize text-slate-900">${escapeHtml(species.habitat?.name ?? 'Unknown')}</dd>
                    </div>
                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <dt class="text-slate-500">Growth rate</dt>
                        <dd class="font-medium capitalize text-slate-900">${escapeHtml(formatLabel(species.growth_rate?.name ?? 'Unknown'))}</dd>
                    </div>
                    <div class="flex items-center justify-between px-4 py-3 text-sm">
                        <dt class="text-slate-500">Base happiness</dt>
                        <dd class="font-medium text-slate-900">${species.base_happiness ?? '&mdash;'}</dd>
                    </div>
                </dl>

                <p class="mt-4 text-xs leading-relaxed text-slate-400">
                    Data source: PokéAPI &mdash; <code class="rounded bg-slate-100 px-1">/pokemon</code>,
                    <code class="rounded bg-slate-100 px-1">/pokemon-species</code> and
                    <code class="rounded bg-slate-100 px-1">/evolution-chain</code>.
                </p>
            </section>
        </div>

        <!-- ============ EVOLUTIONS (third endpoint) ============ -->
        <div class="border-t border-slate-100 bg-slate-50/70 p-6">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Evolution chain</h3>
            <div class="mt-4">${buildEvolutionChain(evolutions, pokemon.id)}</div>
        </div>
    `;
}

/**
 * Opens the modal with the detail of one Pokémon.
 *
 * @param {object} entry - the entry fetched by page2.js.
 */
export function openModal(entry) {
    lastFocusedElement = document.activeElement;

    modalContent.innerHTML = buildModalContent(entry);
    setHidden(modal, false);
    // Locking the body prevents the page behind the dialog from scrolling.
    document.body.classList.add('overflow-hidden');

    // The panel is scrollable, so a long modal always starts at the top.
    if (modalPanel) {
        modalPanel.scrollTop = 0;
    }

    // Moving the focus inside the dialog is what screen readers expect.
    modalContent.querySelector('[data-close-modal]')?.focus();
}

/**
 * Closes the modal and cleans the injected HTML.
 */
export function closeModal() {
    setHidden(modal, true);
    modalContent.replaceChildren();
    document.body.classList.remove('overflow-hidden');

    // Focus goes back to the card that opened the dialog.
    if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
    }
    lastFocusedElement = null;
}

/**
 * Tells whether the modal is currently visible.
 *
 * @returns {boolean} true when it is open.
 */
export function isModalOpen() {
    return !modal.classList.contains('hidden');
}

// -------------------------------------------------------------------------------------
// Listeners of the dialog. They are registered once, when this module is imported.
// The content is created dynamically, so we delegate on the modal container.
// -------------------------------------------------------------------------------------
modal.addEventListener('click', (event) => {
    // Both the X button and the backdrop carry data-close-modal.
    if (event.target.closest('[data-close-modal]')) {
        closeModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen()) {
        closeModal();
    }
});
