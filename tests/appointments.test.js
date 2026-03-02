import { describe, expect, it } from "vitest";
import {
	count_appointment_slots,
	get_first_viable_appointment,
	parse_premium_days,
} from "../lib/appointments.js";

// ---------------------------------------------------------------------------
// parse_premium_days
// ---------------------------------------------------------------------------
describe("parse_premium_days", () => {
	it("parses pipe-delimited day numbers", () => {
		expect(parse_premium_days("1|3|5|")).toEqual([1, 3, 5]);
	});

	it("handles string without trailing pipe", () => {
		expect(parse_premium_days("0|6")).toEqual([0, 6]);
	});

	it("returns [] for null", () => {
		expect(parse_premium_days(null)).toEqual([]);
	});

	it("returns [] for undefined", () => {
		expect(parse_premium_days(undefined)).toEqual([]);
	});

	it("returns [] for empty string", () => {
		expect(parse_premium_days("")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// count_appointment_slots
// ---------------------------------------------------------------------------
describe("count_appointment_slots", () => {
	it("returns 0 for empty array", () => {
		expect(count_appointment_slots([])).toBe(0);
	});

	it("counts only slots with non-empty labels", () => {
		const appts = [
			{
				slots: [
					{ labels: ["Premium"] },
					{ labels: [] },
					{ labels: ["Standard"] },
				],
			},
			{
				slots: [{ labels: [] }],
			},
		];
		expect(count_appointment_slots(appts)).toBe(2);
	});

	it("counts all slots when all have labels", () => {
		const appts = [{ slots: [{ labels: ["A"] }, { labels: ["B"] }] }];
		expect(count_appointment_slots(appts)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// get_first_viable_appointment
// ---------------------------------------------------------------------------
describe("get_first_viable_appointment", () => {
	const slot = (time, labels = [""]) => ({ time, labels });
	const day = (date, slots) => ({ day: date, slots });

	it("returns nulls for empty appointment data", () => {
		const result = get_first_viable_appointment(
			[],
			null,
			null,
			null,
			null,
			null,
			true,
			null,
		);
		expect(result).toEqual({ out_date: null, out_time: null, out_type: null });
	});

	it("returns first match with no filters", () => {
		const data = [day("2025-06-15", [slot("09:00:00")])];
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			null,
			true,
			null,
		);
		expect(result).toEqual({
			out_date: "2025-06-15",
			out_time: "09:00:00",
			out_type: "",
		});
	});

	it("skips slots with empty labels array", () => {
		const data = [
			day("2025-06-15", [{ time: "09:00:00", labels: [] }, slot("10:00:00")]),
		];
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			null,
			true,
			null,
		);
		expect(result.out_time).toBe("10:00:00");
	});

	// --- Date range filtering ---
	it("skips dates before start_date", () => {
		const data = [
			day("2025-06-10", [slot("09:00:00")]),
			day("2025-06-20", [slot("10:00:00")]),
		];
		const result = get_first_viable_appointment(
			data,
			"2025-06-15",
			null,
			null,
			null,
			null,
			true,
			null,
		);
		expect(result.out_date).toBe("2025-06-20");
	});

	it("skips dates after last_date", () => {
		const data = [
			day("2025-06-10", [slot("09:00:00")]),
			day("2025-06-20", [slot("10:00:00")]),
		];
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			"2025-06-15",
			null,
			null,
			true,
			null,
		);
		expect(result.out_date).toBe("2025-06-10");
	});

	it("returns null when all dates outside range", () => {
		const data = [day("2025-06-01", [slot("09:00:00")])];
		const result = get_first_viable_appointment(
			data,
			"2025-07-01",
			null,
			null,
			null,
			null,
			true,
			null,
		);
		expect(result.out_date).toBeNull();
	});

	// --- Day-of-week filtering ---
	it("filters by day of week", () => {
		// 2025-06-16 is Monday (1), 2025-06-17 is Tuesday (2)
		const data = [
			day("2025-06-16", [slot("09:00:00")]),
			day("2025-06-17", [slot("10:00:00")]),
		];
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			[2],
			true,
			null,
		);
		expect(result.out_date).toBe("2025-06-17");
	});

	// --- Time range filtering ---
	it("skips slots before start_time", () => {
		const data = [day("2025-06-15", [slot("08:00:00"), slot("10:00:00")])];
		const result = get_first_viable_appointment(
			data,
			null,
			"09:00:00",
			null,
			null,
			null,
			true,
			null,
		);
		expect(result.out_time).toBe("10:00:00");
	});

	it("skips slots after last_time", () => {
		const data = [day("2025-06-15", [slot("08:00:00"), slot("14:00:00")])];
		// Note: last_time check requires start_time to be non-null (mirrors original code behavior)
		const result = get_first_viable_appointment(
			data,
			null,
			"07:00:00",
			null,
			"12:00:00",
			null,
			true,
			null,
		);
		expect(result.out_time).toBe("08:00:00");
	});

	// --- Premium slot filtering ---
	it("rejects premium slots when accept_prime is false", () => {
		const data = [
			day("2025-06-15", [
				{ time: "09:00:00", labels: ["Premium"] },
				{ time: "10:00:00", labels: [""] },
			]),
		];
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			null,
			false,
			null,
		);
		expect(result.out_time).toBe("10:00:00");
		expect(result.out_type).toBe("");
	});

	it("accepts premium slots when accept_prime is true", () => {
		const data = [
			day("2025-06-15", [{ time: "09:00:00", labels: ["Premium"] }]),
		];
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			null,
			true,
			null,
		);
		expect(result.out_type).toBe("Premium");
	});

	// --- Reschedule mode ---
	it("skips dates later than current booking", () => {
		const data = [
			day("2025-06-20", [slot("09:00:00")]),
			day("2025-06-10", [slot("10:00:00")]),
		];
		const current = { date: "2025-06-15", time: "12:00:00" };
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			null,
			true,
			current,
		);
		expect(result.out_date).toBe("2025-06-10");
	});

	it("on same date, skips slots with later or equal time", () => {
		const data = [day("2025-06-15", [slot("14:00:00"), slot("10:00:00")])];
		const current = { date: "2025-06-15", time: "12:00:00" };
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			null,
			true,
			current,
		);
		expect(result.out_time).toBe("10:00:00");
	});

	it("returns null when no slots are better than current booking", () => {
		const data = [day("2025-06-15", [slot("14:00:00")])];
		const current = { date: "2025-06-15", time: "12:00:00" };
		const result = get_first_viable_appointment(
			data,
			null,
			null,
			null,
			null,
			null,
			true,
			current,
		);
		expect(result.out_date).toBeNull();
	});
});
