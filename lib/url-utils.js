/**
 * Pure URL utility functions extracted from content.js.
 * Works as a browser global (content script) and as a CJS module (tests).
 */

/**
 * Extract the numeric application ID from a TLSContact URL.
 * Expects the 7-character segment immediately before "/workflow".
 *
 * @param {string} url
 * @returns {number|null}
 */
function extract_application_id_from_url(url) {
	const end = url.indexOf("/workflow");
	if (end === -1) return null;

	const id = url.substring(end - 7, end);
	return Number(id);
}

if (typeof module !== "undefined")
	module.exports = { extract_application_id_from_url };
