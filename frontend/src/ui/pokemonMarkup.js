/* =====================================================================================
 *  ui/pokemonMarkup.js - Small markup builders shared by the Pokédex views
 *
 *  The type badge and the "#025" number are painted both in the card grid and in the
 *  detail modal, so they are defined once here instead of being duplicated (and drifting
 *  apart) in two files.
 * ===================================================================================== */

import { escapeHtml } from './domUtils.js';

// The colour of a type badge depends on the type. Unknown types fall back to slate.
const TYPE_BADGES = {
    normal: 'bg-slate-100 text-slate-700',
    fire: 'bg-orange-100 text-orange-800',
    water: 'bg-sky-100 text-sky-800',
    electric: 'bg-yellow-100 text-yellow-800',
    grass: 'bg-emerald-100 text-emerald-800',
    ice: 'bg-cyan-100 text-cyan-800',
    fighting: 'bg-red-100 text-red-800',
    poison: 'bg-purple-100 text-purple-800',
    ground: 'bg-amber-100 text-amber-900',
    flying: 'bg-indigo-100 text-indigo-800',
    psychic: 'bg-pink-100 text-pink-800',
    bug: 'bg-lime-100 text-lime-800',
    rock: 'bg-stone-200 text-stone-800',
    ghost: 'bg-violet-100 text-violet-800',
    dragon: 'bg-blue-100 text-blue-800',
    dark: 'bg-neutral-200 text-neutral-800',
    steel: 'bg-zinc-200 text-zinc-800',
    fairy: 'bg-rose-100 text-rose-800'
};

/**
 * Builds the badges of the types of a Pokémon.
 *
 * @param {Array<object>} types - the `types` array of the Pokemon resource.
 * @returns {string} the HTML of the badges.
 */
export function buildTypeBadges(types) {
    return (types ?? [])
        .map(({ type }) => {
            const colors = TYPE_BADGES[type.name] ?? TYPE_BADGES.normal;
            return `<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors}">${escapeHtml(type.name)}</span>`;
        })
        .join('');
}

/**
 * Adds leading zeros to a Pokédex number: 25 -> "#025".
 *
 * @param {number} id - the Pokémon id.
 * @returns {string} the formatted number.
 */
export function formatDexNumber(id) {
    return `#${String(id).padStart(3, '0')}`;
}
