/* =====================================================================================
 *  ui/domUtils.js - Small helpers shared by the view modules
 *
 *  Only DOM-related utilities live here. There is no fetch and no application logic,
 *  so importing this file never creates a side effect.
 * ===================================================================================== */

/**
 * Escapes the five characters that can break HTML or inject a script.
 *
 * Why it is needed: several views build their markup with innerHTML/template strings,
 * and a value coming from an API could contain "<script>". Escaping keeps the data as
 * text, which is the same protection React or Thymeleaf apply automatically (anti-XSS).
 *
 * @param {*} value - any value, usually a string from an API.
 * @returns {string} the value ready to be inserted inside HTML.
 */
export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/**
 * Turns an API slug into a readable label: "special-attack" -> "Special Attack".
 *
 * @param {string} value - the slug to prettify.
 * @returns {string} the capitalized label.
 */
export function formatLabel(value) {
    return String(value ?? '')
        .replaceAll('-', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Toggles the `hidden` class of an element.
 *
 * @param {HTMLElement} element - the element to show or hide.
 * @param {boolean} shouldHide - true to hide it.
 */
export function setHidden(element, shouldHide) {
    element.classList.toggle('hidden', shouldHide);
}
