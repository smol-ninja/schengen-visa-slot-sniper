import { describe, expect, it } from "vitest";
import { extract_application_id_from_url } from "../lib/url-utils.js";

describe("extract_application_id_from_url", () => {
	it("extracts numeric ID from a standard TLSContact URL", () => {
		const url =
			"https://visas-fr.tlscontact.com/en-us/24958323/workflow/appointment-booking";
		expect(extract_application_id_from_url(url)).toBe(4958323);
	});

	it("extracts ID when URL has query params", () => {
		const url =
			"https://visas-de.tlscontact.com/en-us/12345678/workflow/appointment-booking?month=3-2026";
		expect(extract_application_id_from_url(url)).toBe(2345678);
	});

	it("returns null when URL has no /workflow segment", () => {
		const url = "https://visas-fr.tlscontact.com/en-us/login";
		expect(extract_application_id_from_url(url)).toBeNull();
	});

	it("handles URL ending with /workflow", () => {
		const url = "https://visas-fr.tlscontact.com/en-us/24958323/workflow";
		expect(extract_application_id_from_url(url)).toBe(4958323);
	});
});
