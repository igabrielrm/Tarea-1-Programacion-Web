/* =====================================================================================
 *  api/pokeApi.js - HTTP layer for the public PokéAPI (the ONLY file that calls fetch)
 *
 *  Responsibility: talk to https://pokeapi.co and return plain JavaScript objects.
 *  Nothing here touches the DOM, so this module could be reused in Node.js.
 *
 *  THE CHAIN OF THREE ENDPOINTS (this is the core of page 2):
 *
 *      STEP 1  GET /pokemon/{name}              -> basic data + the numeric id
 *      STEP 2  GET /pokemon-species/{id}        -> species data + the evolution chain URL
 *      STEP 3  GET /evolution-chain/{id}        -> the evolution tree
 *
 *  They are strictly sequential because each one needs data produced by the previous
 *  one: without the id there is no species, and without the species URL there is no
 *  evolution chain. That is exactly what async/await expresses best.
 * ===================================================================================== */

// Root of the public API. It is a different origin than our own backend, so CORS matters.
const POKE_API_BASE_URL = 'https://pokeapi.co/api/v2';

// If PokéAPI does not answer in 12 seconds we abort the request instead of waiting forever.
const REQUEST_TIMEOUT_MS = 12000;

/**
 * Performs one HTTP request against PokéAPI and returns the body parsed as JSON.
 *
 * Every public function of this module goes through here, so the error handling and the
 * timeout are written exactly once.
 *
 * @param {string} url - the full URL to call.
 * @returns {Promise<object>} the response body as a JavaScript object.
 * @throws {Error} with a message ready to be shown to the user.
 */
async function request(url) {
    // AbortSignal.timeout() makes fetch reject by itself when the timer expires.
    // The optional chaining keeps the code working on browsers without that API.
    const signal = typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        : undefined;

    let response;
    try {
        response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal
        });
    } catch (error) {
        // fetch() does NOT reject on a 4xx/5xx status: it only rejects when the request
        // itself could not be completed (offline, DNS failure, CORS block, timeout).
        if (error.name === 'TimeoutError') {
            throw new Error('PokéAPI took too long to answer. Please try again.');
        }
        if (error instanceof TypeError) {
            throw new Error('Could not reach PokéAPI. Check your internet connection.');
        }
        throw error;
    }

    // 404 is the answer PokéAPI gives for an unknown Pokémon name or id.
    if (response.status === 404) {
        throw new Error('No Pokémon was found with that name or id.');
    }

    // Any other non-2xx status is a real failure of the API.
    if (!response.ok) {
        throw new Error(`PokéAPI answered with status ${response.status}.`);
    }

    // response.json() also returns a Promise: reading and parsing the body is asynchronous.
    return response.json();
}

/**
 * Turns whatever the user typed into a name PokéAPI understands.
 *
 * PokéAPI only accepts lowercase names: "Pikachu" -> "pikachu", "Mr. Mime" -> "mr-mime".
 *
 * @param {string|number} value - the raw input.
 * @returns {string} the normalized name or id.
 */
export function normalizePokemonName(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')  // spaces, dots and accents become a hyphen
        .replace(/^-+|-+$/g, '');      // no leading or trailing hyphens
}

/**
 * Reads the numeric id out of a PokéAPI resource URL.
 *
 * PokéAPI gives URLs such as "https://pokeapi.co/api/v2/pokemon-species/25/".
 * The trailing slash produces one empty piece, hence `filter(Boolean)`.
 *
 * @param {string} url - the resource URL.
 * @returns {number|null} the id, or null when the URL has no number.
 */
export function extractIdFromUrl(url) {
    const pieces = String(url ?? '').split('/').filter(Boolean);
    const lastPiece = pieces.at(-1);
    const id = Number(lastPiece);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/* -------------------------------------------------------------------------------------
 *  STEP 1 - GET /pokemon/{name}
 * ------------------------------------------------------------------------------------- */

/**
 * STEP 1 of the chain: retrieves the basic data of a Pokémon.
 *
 * @param {string|number} nameOrId - the name typed by the user or a numeric id.
 * @returns {Promise<object>} the raw Pokemon resource (id, name, types, stats, sprites...).
 * @throws {Error} if the name is empty or the Pokémon does not exist.
 */
export async function getPokemon(nameOrId) {
    const name = normalizePokemonName(nameOrId);

    if (name === '') {
        throw new Error('Type a Pokémon name first.');
    }

    return request(`${POKE_API_BASE_URL}/pokemon/${name}`);
}

/* -------------------------------------------------------------------------------------
 *  STEP 2 - GET /pokemon-species/{id}
 * ------------------------------------------------------------------------------------- */

/**
 * STEP 2 of the chain: retrieves the species data of a Pokémon.
 *
 * The species resource is where PokéAPI keeps the "story" information (genus, flavour
 * text, habitat, legendary flag) and, more importantly for us, the evolution chain URL.
 *
 * @param {number} speciesId - the id returned by step 1.
 * @returns {Promise<object>} the raw PokemonSpecies resource.
 */
export async function getPokemonSpecies(speciesId) {
    if (!Number.isInteger(speciesId) || speciesId <= 0) {
        throw new Error('The Pokémon data did not include a valid id.');
    }

    return request(`${POKE_API_BASE_URL}/pokemon-species/${speciesId}`);
}

/* -------------------------------------------------------------------------------------
 *  STEP 3 - GET /evolution-chain/{id}
 * ------------------------------------------------------------------------------------- */

/**
 * STEP 3 of the chain: retrieves the evolution chain.
 *
 * Note that this function receives the FULL URL that came inside the species payload
 * (`species.evolution_chain.url`) and calls it as-is. Building the URL by hand from an
 * id would be guessing: the URL is data that the API already gave us, so we trust it.
 *
 * @param {string} chainUrl - the evolution chain URL found in the species resource.
 * @returns {Promise<object>} the raw EvolutionChain resource (a recursive `chain` tree).
 */
export async function getEvolutionChain(chainUrl) {
    // Validating the data BEFORE using it avoids a request to "undefined".
    if (typeof chainUrl !== 'string' || !chainUrl.startsWith('http')) {
        throw new Error('The species data did not include a valid evolution chain URL.');
    }

    return request(chainUrl);
}

/* -------------------------------------------------------------------------------------
 *  The full chain, plus two small transformations so the UI does not have to think
 * ------------------------------------------------------------------------------------- */

/**
 * Flattens the recursive evolution tree into a plain array.
 *
 * The API returns a nested structure:
 *   { species: bulbasaur, evolves_to: [ { species: ivysaur, evolves_to: [ venusaur ] } ] }
 *
 * A recursive function turns that into a flat list, keeping the `depth` so the UI can
 * draw the rows (one row per evolution stage). Branching evolutions such as Eevee work
 * naturally: several nodes simply share the same depth.
 *
 * @param {object} chain - the `chain` node of the EvolutionChain resource.
 * @param {number} depth - current stage, 0 for the base form.
 * @returns {Array<object>} one item per evolution, in tree order.
 */
function flattenEvolutionChain(chain, depth = 0) {
    if (!chain?.species?.name) {
        return [];
    }

    // evolution_details is an array (a species can evolve in several ways) and it is
    // empty for the base form. We keep the first detail as the "how it evolves" label.
    const details = chain.evolution_details?.[0] ?? null;

    const current = {
        id: extractIdFromUrl(chain.species.url),
        name: chain.species.name,
        depth,
        minLevel: details?.min_level ?? null,
        trigger: details?.trigger?.name ?? null
    };

    const children = (chain.evolves_to ?? []).flatMap((child) => flattenEvolutionChain(child, depth + 1));

    return [current, ...children];
}

/**
 * Picks the English entry of a localized PokéAPI list.
 *
 * @param {Array<object>} entries - list with a `language` object on each entry.
 * @param {string} language - ISO code of the language, 'en' by default.
 * @returns {object|null} the matching entry, or null.
 */
function pickEnglishEntry(entries, language = 'en') {
    return (entries ?? []).find((entry) => entry?.language?.name === language) ?? null;
}

/**
 * Asks PokéAPI for the sprite of every evolution, IN PARALLEL.
 *
 * This is not part of the three-endpoint chain: it is an enrichment that reuses step 1
 * (the same endpoint, in parallel) so the evolution chain can be drawn with pictures.
 * `Promise.all` waits for all of them at once instead of one after another, and each
 * promise catches its own error so a single missing sprite cannot break the modal.
 *
 * @param {Array<object>} evolutions - the flattened evolution list.
 * @returns {Promise<Array<object>>} the same list, each item with a `sprite` field.
 */
async function attachSprites(evolutions) {
    return Promise.all(
        evolutions.map(async (evolution) => {
            try {
                const data = await getPokemon(evolution.name);
                return { ...evolution, sprite: data.sprites?.front_default ?? null };
            } catch {
                // A failed sprite must not cancel the whole modal.
                return { ...evolution, sprite: null };
            }
        })
    );
}

/**
 * Runs the whole chain and returns everything the page needs in one object.
 *
 * This is the function page2.js calls. It hides the three steps behind a single
 * Promise, but the steps are still visible and sequential inside.
 *
 * @param {string|number} nameOrId - the name typed by the user or a numeric id.
 * @returns {Promise<{pokemon: object, species: object, evolutions: Array<object>, genus: string, flavorText: string}>}
 * @throws {Error} if any step of the chain fails.
 */
export async function getPokemonWithEvolutions(nameOrId) {
    // ---- STEP 1: basic data + id ----------------------------------------------------
    const pokemon = await getPokemon(nameOrId);

    // ---- STEP 2: species, using the id returned by step 1 ---------------------------
    const species = await getPokemonSpecies(pokemon.id);

    // ---- STEP 3: evolution chain, using the URL returned by step 2 ------------------
    const evolutionChain = await getEvolutionChain(species.evolution_chain?.url);

    const evolutions = await attachSprites(flattenEvolutionChain(evolutionChain.chain));

    // The two localized texts are resolved here, so the view receives plain strings and
    // never has to know how PokéAPI structures its translations.
    return {
        pokemon,
        species,
        evolutions,
        genus: getGenus(species),
        flavorText: getFlavorText(species)
    };
}

/**
 * Returns the English genus of a species ("Seed Pokémon").
 *
 * @param {object} species - the PokemonSpecies resource.
 * @returns {string} the genus or an empty string.
 */
function getGenus(species) {
    return pickEnglishEntry(species?.genera)?.genus ?? '';
}

/**
 * Returns the English Pokédex text of a species, with the line breaks removed.
 *
 * @param {object} species - the PokemonSpecies resource.
 * @returns {string} the flavour text or an empty string.
 */
function getFlavorText(species) {
    const entry = pickEnglishEntry(species?.flavor_text_entries);
    // The API embeds \n and \f inside the text; both become a normal space.
    return (entry?.flavor_text ?? '').replace(/[\n\f\r]+/g, ' ').trim();
}
