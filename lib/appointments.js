/**
 * Pure appointment-filtering functions extracted from resources/background.js.
 * Works as a browser global (importScripts) and as a CJS module (tests).
 */

/**
 * Count appointment slots that have at least one non-empty label.
 * @param {Array<{slots: Array<{labels: string[]}>}>} appts
 * @returns {number}
 */
function count_appointment_slots(appts) {
	let count = 0;
	for (let x = 0; x < appts.length; x++) {
		for (let y = 0; y < appts[x].slots.length; y++) {
			if (appts[x].slots[y].labels.length !== 0) count++;
		}
	}
	return count;
}

/**
 * Return the first appointment slot that passes all filters.
 *
 * @param {Array<{day: string, slots: Array<{time: string, labels: string[]}>}>} appointment_data
 * @param {string|null}  start_date       earliest acceptable date  (YYYY-MM-DD)
 * @param {string|null}  start_time       earliest acceptable time  (HH:MM:SS)
 * @param {string|null}  last_date        latest acceptable date
 * @param {string|null}  last_time        latest acceptable time
 * @param {number[]|null} days            acceptable days-of-week (0=Sun … 6=Sat)
 * @param {boolean}       accept_prime    accept premium / labelled slots?
 * @param {{date: string, time: string}|null} current_booking  existing booking for reschedule mode
 * @returns {{out_date: string|null, out_time: string|null, out_type: string|null}}
 */
function get_first_viable_appointment(
	appointment_data,
	start_date,
	start_time,
	last_date,
	last_time,
	days,
	accept_prime,
	current_booking,
) {
	let out_date = null,
		out_time = null,
		out_type = null;

	for (let x = 0; x < appointment_data.length; x++) {
		if (out_date !== null) break;

		const cur_obj = appointment_data[x];
		const date = cur_obj.day;
		const appt_date_obj = new Date(date);

		if (days != null && days.length !== 0) {
			if (days.includes(appt_date_obj.getDay()) === false) continue;
		}

		if (start_date != null && start_date !== undefined) {
			const start_date_obj = new Date(start_date);
			if (appt_date_obj < start_date_obj) continue;
		}

		if (last_date != null && last_date !== undefined) {
			const last_date_obj = new Date(last_date);
			if (appt_date_obj > last_date_obj) continue;
		}

		// Reschedule mode: skip slots that aren't better than current booking
		if (current_booking != null && current_booking !== undefined) {
			const current_date_obj = new Date(current_booking.date);
			if (appt_date_obj > current_date_obj) continue;
		}

		const slots = cur_obj.slots;
		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i];
			const labels = slot.labels;
			if (labels.length === 0) continue;

			const appt_time = slot.time;
			if (start_time != null && start_time !== undefined)
				if (appt_time < start_time) continue;

			if (last_time != null && last_time !== undefined)
				if (appt_time > last_time) continue;

			// Reschedule mode: same date, skip if time isn't earlier
			if (current_booking != null && current_booking !== undefined) {
				const current_date_obj = new Date(current_booking.date);
				if (
					appt_date_obj.getTime() === current_date_obj.getTime() &&
					appt_time >= current_booking.time
				)
					continue;
			}

			if (labels[0] !== "") {
				if (accept_prime === false) continue;
			}

			out_date = date;
			out_time = appt_time;
			out_type = labels[0];
			break;
		}
	}

	return { out_date, out_time, out_type };
}

/**
 * Parse a pipe-delimited string of day numbers into an array of integers.
 * @param {string|null|undefined} pd  e.g. "1|3|5|"
 * @returns {number[]}               e.g. [1, 3, 5]
 */
function parse_premium_days(pd) {
	if (pd == null || pd === undefined || pd === "") return [];

	const parts = pd.split("|");
	const days = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i] !== "") days.push(Number(parts[i]));
	}
	return days;
}

if (typeof module !== "undefined")
	module.exports = {
		count_appointment_slots,
		get_first_viable_appointment,
		parse_premium_days,
	};
