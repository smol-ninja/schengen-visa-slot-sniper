// TODO: PRETTIFY & COPY THE COPY

/**
 * 120 SECONDS PERFECT FOR GERMANY (Maybe 40/50)
 * 
 */
let tick_interval = null
let iteration = 0
const VW_MAX_LOGS = 500;
function log(msg) {
    let time = new Date(Date.now())
    let ds = time.toLocaleTimeString();
    let entry = ds + " [BG] " + msg;
    console.log("[VW] " + entry)
    chrome.storage.local.get("vw_logs").then((res) => {
        let logs = res.vw_logs || [];
        logs.push(entry);
        if (logs.length > VW_MAX_LOGS)
            logs = logs.slice(-VW_MAX_LOGS);
        chrome.storage.local.set({ "vw_logs": logs });
    })
}

function set_status(msg, color) {
    store_val("status", {
        msg: msg,
        color: color
    })
}

async function get_val(name) {
    return (await chrome.storage.local.get(name))
}

async function get_is_scanning() {
    return (await get_val("scanning")).scanning
}

async function get_tls_dest() {
    return (await get_val("td")).td
}

async function get_refresh_rate() {
    return (await get_val("refresh_rate")).refresh_rate
}

async function get_refresh_timer() {
    return (await get_val("current_time")).current_time
}

async function set_refresh_timer(num) {
    return (await chrome.storage.local.set({ "current_time": num }))
}

async function set_refreshing(val) {
    return (await store_val("cred_refresh", val))
}

async function set_scanning(val) {
    if (val == true)
        set_status("Active", "Green");
    return chrome.storage.local.set({ "scanning": val })
}

async function query_membership(user) {
    return 0;
}

async function get_user() {
    return (await get_val("vwarden_user")).vwarden_user;
}

async function log_error(msg) {
    log("ERROR: " + msg)
}

async function log_info(msg) {
    log("INFO: " + msg)
}

async function request_captcha($uri) {
    return '';
}

async function get_captcha_solution(url) {
    let captcha_response = await request_captcha(url);
    console.log("Captcha is " + captcha_response)
    return captcha_response
}

async function get_hash_for_action(actionName, book_url, domain) {
    let default_hash = ''
    if (actionName == 'bookAppointment')
        default_hash = '60177cf047fef72ae5708ac2ab4a41760601bc6862'
    //getBasketCost
    let hash_url = ''

    let hash_response = await fetch(book_url,
        {
            method: "GET",
            headers:
            {
                "RSC": 1,
            },
            referrer: book_url,
            host: domain,
            credentials: "include"
        }
    ).then((response) => {
        if (response.status == 200)
            return response.text()
        else {
            log_error(`Failed to get booking hash url from ${book_url} - ${response.status}`);
            return '';
        }
    })

    const find_text = hash_response.indexOf('appointment-booking/page-')
    if (find_text != -1) {
        start = find_text + "appointment-booking".length + 1
        end = hash_response.indexOf('"', start)
        let snippet = hash_response.substring(start, end)
        log('Hash snippet: ' + snippet)
        hash_url = `https://${domain}/_next/static/chunks/app/%5Blang%5D/%5BgroupId%5D/workflow/appointment-booking/${snippet}`
    }
    else
        return default_hash;

    if (hash_url == '') {
        log_error(`Failed to get booking hash url from ${book_url}`);
        return default_hash
    }

    const final_hash_response = await fetch(hash_url, { referrer: hash_url, host: domain }).then((response) => {
        if (response.status == 200)
            return response.text()
        else {
            log_error(`Failed to fetch booking hash page at ${hash_url} - ${response.status}`)
            return '';
        }
    })

    if (final_hash_response == '') {
        return default_hash
    }

    // Discovery log: extract all quoted action-like names from the chunk for Approach A research
    const action_matches = final_hash_response.match(/"[a-z][a-zA-Z]+(Appointment|Booking|Order|Cancel|Reschedule|Schedule|Basket|Cost)[a-zA-Z]*"/g);
    if (action_matches)
        log("DISCOVERY: Actions found in chunk: " + JSON.stringify(action_matches));

    let appt_pos = final_hash_response.indexOf(`"${actionName}"`)
    if (appt_pos == -1) {
        log_error(`Cannot find booking hash at ${hash_url}`)
        return default_hash
    }

    appt_pos -= 1
    end = appt_pos

    while (final_hash_response[end] != '"')
        end--;

    start = end - 2
    while (final_hash_response[start] != '"')
        start--

    const final_hash = final_hash_response.substring(start + 1, end);
    log_info("Dynamic Next-booking hash: " + final_hash)
    return final_hash;
}

async function autobook_appointment(check_uri, lang, centre, domain, date, time, appt_type) {
    wf = check_uri.indexOf('/workflow')
    wf_start = wf - 1
    while (check_uri[wf_start] != '/')
        wf_start--
    wf_start++
    const fgId = check_uri.substring(wf_start, wf)
    let book_url = check_uri
    const booking_api = {
        non_citizen: 0,
        citizen_one: 1,
        citizen_two: 2,
        citizen_v2: 3
    }

    // let booking_type = booking_api.non_citizen
    // if (book_url.indexOf("location=") == -1) { // Important to have location!!!!
    //     if (book_url.indexOf("?") == -1)
    //         book_url = `${book_url}?location=${centre}`
    //     else
    //         book_url = `${book_url}&location=${centre}`

    // }
    log_info(`Booking with url ${book_url}`)

    book_hash = await get_hash_for_action("bookAppointment", check_uri, domain)
    const book_object = {
        book_uri: book_url,
        hash: book_hash,
        body_data:
        {
            fgId,
            lang,
            centre,
            date,
            time,
            appt_type,
        }
    }

    await store_val("vw_booking_attempt", book_object)
    log("Spawning tab")
    let creating = chrome.tabs.create({ url: `https://${domain}`, active: false, index: 0 }) // Likely JUST the clearance needed to change.
}

async function send_telegram_msg(text) {
    const tg = await get_val("tg_enabled");
    if (!tg.tg_enabled) return;

    const token = (await get_val("tg_bot_token")).tg_bot_token;
    const chat_id = (await get_val("tg_chat_id")).tg_chat_id;
    if (!token || !chat_id) return;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id, text, parse_mode: "HTML" })
        });
    } catch (e) {
        log_error("Telegram send failed: " + e.message);
    }
}

async function create_notification(noti_name, msg, interaction) {
    return await chrome.notifications.create(noti_name, {
        type: "basic",
        iconUrl: chrome.runtime.getURL('resources/favicon.png'),
        title: "Visa Warden",
        message: msg,
        requireInteraction: noti_name == "Noti_Pipe" || interaction,
        priority: 2
    })
}

async function get_first_viable_appointment(appointment_data, start_date, start_time, last_date, last_time, days, accept_prime, current_booking) {
    let found = false;
    let out_date = null, out_time = null, out_type = null;
    // 2025-11-28
    for (x = 0; x < appointment_data.length; x++) {
        if (found)
            break;

        cur_obj = appointment_data[x]
        let date = cur_obj['day']
        const appt_date_obj = new Date(date)
        if (days != null && days.length != 0) {
            if (days.includes(appt_date_obj.getDay()) == false)
                continue;
        }

        if (start_date != null && start_date != undefined) {
            const start_date_obj = new Date(start_date);
            if (appt_date_obj < start_date_obj)
                continue;  // Not past the start date
        }

        if (last_date != null && last_date != undefined) {
            const last_date_obj = new Date(last_date);
            if (appt_date_obj > last_date_obj)
                continue; // past the last date
        }

        // Reschedule mode: skip slots that aren't better than current booking
        if (current_booking != null && current_booking != undefined) {
            const current_date_obj = new Date(current_booking.date);
            if (appt_date_obj > current_date_obj)
                continue; // new date is later, not better
            if (appt_date_obj.getTime() == current_date_obj.getTime()) {
                // same date — will check time per-slot below
            }
        }

        let slots = cur_obj['slots']
        for (i = 0; i < slots.length; i++) {
            slot = slots[i]
            labels = slot['labels']
            if (labels.length == 0)
                continue;
            // NOTE: Assume times are in 24 hour HH:MM:SS format. Otherwise convert.
            const appt_time = slot['time']
            if (start_time != null && start_time != undefined)
                if (appt_time < start_time)
                    continue;

            if (last_time != null && start_time != undefined)
                if (appt_time > last_time)
                    continue;

            // Reschedule mode: same date, skip if time isn't earlier
            if (current_booking != null && current_booking != undefined) {
                const current_date_obj = new Date(current_booking.date);
                if (appt_date_obj.getTime() == current_date_obj.getTime() && appt_time >= current_booking.time)
                    continue; // same date but not earlier time
            }

            if (labels[0] != '') {
                if (accept_prime == false)
                    continue;
            }

            log("CHOOSING THIS APPOINTMENT:")
            slot_data = JSON.stringify(slot)
            log(slot_data)
            log_info("Choosing slot: " + slot_data)
            // This is the one!
            out_date = date;
            out_time = appt_time;
            out_type = labels[0]
            found = true;
            break
        }
    }


    return { out_date, out_time, out_type }
}

async function get_premium_filtering() {
    let pd = (await get_val("premium_days")).premium_days;
    const last_date = (await get_val("premium_last_date")).premium_last_date;
    const start_date = (await get_val("premium_start_date")).premium_start_date;
    const last_time = (await get_val("premium_last_time")).premium_last_time;
    const start_time = (await get_val("premium_start_time")).premium_start_time;
    const accept_prime = (await get_val("premium_accept_prime")).premium_accept_prime;

    let premium_days = []
    if (pd == undefined || pd == null)
        pd = ''
    pd_split = pd.split('|')
    for (i = 0; i < pd_split.length; i++) {
        if (pd_split[i] != '')
            premium_days.push(Number(pd_split[i]))
    }

    return { premium_days, last_date, start_date, last_time, start_time, accept_prime }
}

async function count_appointments(appts) {
    let fc = (await get_val("found_count")).found_count
    count = 0;
    for (x = 0; x < appts.length; x++) {
        for (y = 0; y < appts[x].slots.length; y++) {
            if (appts[x].slots[y].labels.length != 0)
                count++;
        }
    }

    store_val("found_count", fc + count);
}

const max_fails = 2;
async function parse_appts(appt_info, check_uri, domain) {
    // Discovery log: check for cancel/reschedule references in RSC response
    const action_refs = appt_info.match(/(cancel|reschedule|modify|change)[\w]*/gi);
    if (action_refs)
        log("DISCOVERY: appt-booking RSC action refs: " + JSON.stringify(action_refs));

    av_start = appt_info.indexOf('availableAppointments')
    if (av_start == -1) {
        let failed_attempts = (await get_val('vw_failed_attempts')).vw_failed_attempts
        if (failed_attempts == undefined || failed_attempts == null)
            failed_attempts = 0;
        failed_attempts++;
        store_val('vw_failed_attempts', failed_attempts);
        log("Serverside failure. Likely need to relog, or application is purged")
        if (failed_attempts >= max_fails) {
            log("Repeat failure! Check account validity!")
            return 0;
        } else {
            return 0;
        }
    }

    store_val('vw_failed_attempts', 0);

    end = appt_info.indexOf(',"show', av_start)
    av_start = appt_info.indexOf('[', av_start)
    appts = appt_info.substring(av_start, end)
    j = JSON.parse(appts);
    let time = new Date(Date.now())
    let ds = time.toLocaleTimeString();
    store_val("find_time", ds);
    if (j.length == 0) {
        log(`No appointments available (checked ${check_uri})`)
    }
    if (j.length != 0) {
        log_info("Appointment found.");
        await create_notification("appt_found", "An appointment has been found!", true);

        let slot_count = j.reduce((sum, day) => sum + day.slots.filter(s => s.labels.length > 0).length, 0);
        let dates = j.map(d => d.day).join(", ");
        send_telegram_msg(`<b>Visa Warden</b>\nAppointment found! ${slot_count} slot(s) on: ${dates}`);

        log("Found an appointment!")
        const is_autobook = await get_val("vw_autobooking")
        if (is_autobook.vw_autobooking > 0) {
            // let start_date = null, start_time = null, last_date = null, last_time = null, days = null;
            let premium_obj = await get_premium_filtering();
            let current_booking = (await get_val("current_booking")).current_booking || null;

            let chosen_appt = await get_first_viable_appointment(j,
                premium_obj.start_date, premium_obj.start_time, premium_obj.last_date,
                premium_obj.last_time, premium_obj.premium_days, premium_obj.accept_prime,
                current_booking)

            if (chosen_appt.out_date == null) {
                if (current_booking != null)
                    log("No slots better than current booking (" + current_booking.date + " " + current_booking.time + ")")
                else
                    await create_notification("appt_found", "No appointments match filtered settings");
                return 2;
            }

            centre_start = appt_info.indexOf("selectedLocation")
            centre_end = appt_info.indexOf(',"', centre_start)
            centre = appt_info.substring(centre_start + 19, centre_end - 1)
            lang_start = appt_info.indexOf("lang")
            lang_end = appt_info.indexOf(',"', lang_start + '"lang",'.length)
            lang = appt_info.substring(lang_start + '"lang",'.length, lang_end - 1)

            autobook_appointment(check_uri, lang, centre, domain,
                chosen_appt.out_date, chosen_appt.out_time, chosen_appt.out_type); // auto book here (always for 1, sometimes for 2)
        }

        count_appointments(j);
    }

    return 1;
}

let close_tab_timeout = null
let cred_refresh_counter = 0;
async function close_tls_tab() {
    if (close_tab_timeout != null) {
        clearTimeout(close_tab_timeout);
        close_tab_timeout = null;
    }

    let captcha_interact = (await get_val("captcha_interact")).captcha_interact;
    if (captcha_interact == true)
        return false; // Don't auto clap.


    chrome.tabs.query({ url: "*://*.tlscontact.com/*" }).then((res) => { // remove first tlscontact url tab
        if (res[0] != undefined)
            chrome.tabs.remove(res[0].id)
    })

    return true;
}

async function get_tp() {
    return (await get_val("tp")).tp
}

async function get_tu() {
    return (await get_val("tu")).tu
}

async function get_belgian_onboarding() {
    res = await fetch('https://visaonweb.diplomatie.be/VisaApplication/MyList?draw=1&columns%5B0%5D%5Bdata%5D=VOWId&columns%5B0%5D%5Bname%5D=VOWUniqueId&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=AppNum&columns%5B1%5D%5Bname%5D=ApplicationNumber&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=St&columns%5B3%5D%5Bname%5D=Status&columns%5B3%5D%5Bsearchable%5D=false&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D%5BId%5D=Id&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=false&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=desc&start=0&length=10&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1769785962449',
        { method: "GET" }
    ).then(async (result) => {
        if (result.status != 200) {
            // TODO: Trigger Fail! Cannot read application info!!
            set_status("Error vwb.003", "red");
            return false;
        }

        j = await result.json()
        data = j.data
        id = data[0].Id

        return await fetch(`https://visaonweb.diplomatie.be/VisaApplication/CreateRdv?Id=${id}`,
            { method: "POST" }
        ).then(async (result) => {
            j = await result.json()
            onboarding_token = j.infoToSent;
            return onboarding_token
        })
    })

    return res;
}

async function login_belgium(domain) {
    resp = await fetch(domain, {
        method: "GET",
    }).then(async (result) => {
        res_text = await result.text()
        start = res_text.indexOf('__RequestVerificationToken')
        end = start + "__RequestVerificationToken' type='hidden' value='".length
        let token = res_text.slice(end, res_text.indexOf('"', end)) // Got request token.

        const user = await get_tu();
        const pass = await get_tp();

        login_attempt = await fetch(domain, {
            method: "POST",
            body: new URLSearchParams({
                '__RequestVerificationToken': token,
                'UserName': user,
                'Password': pass
            })
        }).then(async (result) => {
            text = await result.text()
            if (result.status != 302) {
                if (text.indexOf('Invalid username') != -1) {
                    log("Failed to login 1...");
                    // TODO: Trigger Fail
                    set_status("Error vwb.004", "red");
                    return false;
                }
            }

            token = await get_belgian_onboarding();
            if (token == false) {
                log("Failed to login 2...");
                //TRIGGER FAIL
                set_status("Error vwb.005", "red");
                return false;
            }

            log(`Dest: https://welcome.visas-be.tlscontact.com/?onboarding_token=${token}`)
            chrome.tabs.create({
                url: `https://welcome.visas-be.tlscontact.com/?onboarding_token=${token}`,
                active: false,
                index: 0
            })

            return true;
        })

        return login_attempt;
    });

    return resp;
}

async function refresh_creds(domain) {
    set_refreshing(true);
    let old_tab = chrome.tabs.getCurrent();
    chrome.storage.local.set({ "scanning": false })
    if (domain.indexOf('visas-be') != -1) {
        login_belgium("https://visaonweb.diplomatie.be/Account/Login?ReturnUrl=%2Fen")
    }
    else {
        let creating = chrome.tabs.create({ url: `https://${domain}`, active: false, index: 0 }) // Likely JUST the clearance needed to change.
        close_tab_timeout = setTimeout(async () => {
            if (cred_refresh_counter < 15) {
                log("Retrying cred refresh!")
                if ((await close_tls_tab())) {
                    refresh_creds(domain);
                    cred_refresh_counter++;
                }
            }
            else {
                set_status("Error vwb.001", "red")
                log("Cannot refresh creds! Figure it out!!!")
                create_notification("captcha_noti", "Please open up the TLSContact website!", true)
            }
        }, 30 * 1000);
    }
}

/**Check appointments for both this month and next month */
async function check_appts(domain, app_id) {
    const cur_month_url = `https://${domain}/en-us/${app_id}/workflow/appointment-booking`;
    const cur_date = new Date(Date.now())
    store_val("found_count", 0); // Set to 0 each loop.

    log(`Checking current month appointments...`)
    let res = await fetch(cur_month_url,
        {
            method: "GET",
            headers: {
                'RSC': 1,
                "Referer": cur_month_url,
            },
            host: domain,
            referrer: cur_month_url,
            credentials: 'include',
            priority: "high",
        }
    ).then(response => {
        if (response.status == 403 || response.status == 429 || response.url.indexOf("expired-session") != -1) {
            if (response.headers.has('retry-after')) {
                log("Rate limited");
                let length = Number(response.headers.get('retry-after')) / 60;

                let time = new Date(Date.now())
                time.setMinutes(time.getMinutes() + length);
                let ds = time.toLocaleTimeString();

                set_status(`Rate Limited until ${ds}`, "red")
                return 429;
            } else {
                log("Session expired");
                return 403;
            }
        } else {
            return response.text();
        }
    })

    if (res == 429) {
        store_val("cf_blocked", true);
        store_val("scanning", false);
        rr = await get_refresh_rate()
        log_error(`Rate limit at ${rr}`)
        create_notification("rate_limit", "You have been rate limited. Your refresh rate is too low or you're opening the site too much while the bot is searching. Consider increasing it and trying again in a few hours and letting the bot work alone.", true);
        // set_status("Error vwb.002", "red");
        return false;
    }
    else if (res == 403 || (await parse_appts(res, cur_month_url, domain) == 0)) {
        set_status("Refreshing Credentials", "yellow")
        refresh_creds(domain);
        return false;
    }

    // Repeat but with +1 month (getMonth is 0 indexed, tls is 1 indexed)
    let next_month = cur_date.getMonth() + 2
    let year = cur_date.getFullYear()
    if (next_month > 12) {
        year += 1
        next_month = 1
    }

    log(`Current month: no appointments. Checking next month (${next_month}-${year})...`)
    next_month_url = `${cur_month_url}?month=${next_month}-${year}`
    res = await fetch(next_month_url,
        {
            method: "GET",
            headers: {
                'RSC': 1,
            },
            host: domain,
            referrer: next_month_url,
            credentials: 'include',
            priority: "high",
        }
    ).then(response => {
        if (response.status == 403 || response.status == 429 || response.url.indexOf("expired-session") != -1) {
            if (response.headers.has('retry-after')) {
                log("Rate limited");
                let length = Number(response.headers.get('retry-after')) / 60;

                let time = new Date(Date.now())
                time.setMinutes(time.getMinutes() + length);
                let ds = time.toLocaleTimeString();

                set_status(`Rate Limited for until ${ds}`)
                return 429;
            }
            log("Session expired. Give it a go!");
            return 403;
        }
        else {
            return response.text();
        }
    })

    if (res == 403) {
        set_status("Refreshing Credentials", "yellow")
        refresh_creds(domain);
        return false;
    }
    if (res != 429) {
        let next_parse = await parse_appts(res, next_month_url, domain);
        if (next_parse == 0)
            log(`Next month (${next_month}-${year}) has no appointment data — skipping`)
    }
    log("Scan complete — both months checked.")
    return true;
}

async function begin_search() {
    // check our shite
    tls_obj = (await get_val('tls_details')).tls_details
    if (tls_obj == undefined) {
        set_status("Error vwb.006", "red");
        return (await chrome.storage.local.set({ "vwtested": 0 }))
    }
    else {
        set_status("Active", "green");
        let scan_time = new Date(Date.now()).toLocaleTimeString();
        store_val("last_scan_time", scan_time);
        log(`Iteration ${iteration} - Scanning with domain [${tls_obj.domain}] and app_id [${tls_obj.app_id}]`)
        const res = await check_appts(tls_obj.domain, tls_obj.app_id);
    }
}

async function store_val(name, val) {
    obj = {}
    obj[name] = val
    return await chrome.storage.local.set(obj)
}

async function check_noti_pipe() {
    const noti_pipe = get_val("noti_pipe");
    return noti_pipe;
}

async function check_sub() {
    return true;
}

let _bg_last_scanning = null;
async function tick() {
    let same_sub = await check_sub();
    if (!same_sub) {
        set_scanning(false);
        set_status("Idle", "Yellow");
        await create_notification("expired", "Your membership has expired!")
    }

    let noti_obj = await check_noti_pipe()
    if (noti_obj.noti_pipe != null) {
        await create_notification("Noti_Pipe", noti_obj.noti_pipe)
        store_val("noti_pipe", null);
    }

    let request_close = (await get_val("vwrequest_close")).vwrequest_close
    let cred_refresh = (await get_val("cred_refresh")).cred_refresh

    if (request_close && cred_refresh == false) {
        chrome.storage.local.set({ "vwrequest_close": false })
        await close_tls_tab()
        // We have been requested to close by vwarden.js
        set_scanning(true);
        cred_refresh_counter = 0;
    }

    let scanning = await get_is_scanning();
    // Log scanning state transitions
    if (scanning !== _bg_last_scanning) {
        log(`Scanning state changed: ${_bg_last_scanning} -> ${scanning}`);
        _bg_last_scanning = scanning;
    }
    if (scanning) {
        let cur_time = await get_refresh_timer();
        if (cur_time == undefined)
            cur_time = await get_refresh_rate();
        cur_time -= 1
        store_val("current_time", cur_time)

        if (cur_time % 60 == 0 && cur_time > 0)
            log(`Next search in ${cur_time}s`);

        if (cur_time <= 0) {
            iteration++;
            await set_refresh_timer(await get_refresh_rate())
            await begin_search();
        }
    }
    else
        iteration = 0;
}


async function logURL(request) {
    request.responseHeaders.forEach(async (element) => {
        if (element.name != "set-cookie")
            return

        val = element.value
        cookies = val.split("\n");
        cookies.forEach(async (cookie) => {
            if (cookie.indexOf("cf_clearance") != -1) {
                clearance = cookie

                log("Snatched clearance")
                details = clearance.split(';')
                cf = details[0]
                cf = cf.slice('cf_clearance='.length)
                domain = details[6] // Can this be in a different order? Doubt it.
                raw_domain = domain.slice(' Domain='.length)
                domain = `https://${raw_domain}`
                res = await chrome.cookies.set(
                    {
                        name: "cf_clearance",
                        value: cf,
                        url: domain,
                        domain: `.${raw_domain}`
                    }
                )
            }
            else if (cookie.indexOf("cfwaitingroom") != -1) {
                waitingroom = cookie
                details = waitingroom.split(';')
                cf_wait = details[0]
                cf_wait = cf_wait.slice('__cfwaitingroom='.length)
                domain = details[1] // Can this be in a different order? Doubt it.
                raw_domain = domain.slice(' Domain='.length)
                domain = `https://${raw_domain}`
                // res = await chrome.cookies.set(
                //     {
                //         name: "__cfwaitingroom",
                //         value: cf_wait,
                //         url: domain,
                //         domain: `.${raw_domain}`
                //     }
                // )
            }
        });
    });

    return { responseHeaders: request.responseHeaders }
}

async function initialize_listeners() {
    chrome.runtime.onInstalled.addListener(async () => {
        const rules = [{
            id: 1,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [{
                    header: 'Referer',
                    operation: 'set',
                    value: 'tlscontact.com',
                }],
            },
            condition: {
                domains: [chrome.runtime.id],
                urlFilter: '|https://*.tlscontact.com/',
                resourceTypes: ['xmlhttprequest'],
            },
        }];
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: rules.map(r => r.id),
            addRules: rules,
        });
    });

    // Do we need blocking?
    chrome.webRequest.onHeadersReceived.addListener(logURL, { urls: ["*://*.tlscontact.com/*"] }, ["responseHeaders", 'extraHeaders'])


    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message == "request_focus") {
            // Focus!
            chrome.tabs.query({}).then((all_tabs) => {
                chosen = null
                for (i = 0; i < all_tabs.length; i++) {
                    cur = all_tabs[i]
                    if (cur.url.indexOf("tlscontact") != -1) {
                        chosen = cur;
                        break
                    }
                }

                if (chosen == null)
                    log_error("No tab/window to request focus of!");

                chrome.tabs.update(chosen.id,
                    {
                        active: true
                    }
                )

                chrome.windows.update(chosen.windowId,
                    {
                        focused: true,
                        state: "normal"
                    }
                )
            })
            return;
        }
        return false;
    })
}

initialize_listeners().then(() => {
    log("VWarden Background Listeners Initialized. Ready to Operate")
    store_val("vwarden_membership", 0);
    store_val("vw_autobooking", 2);
    setInterval(tick, 1000);
})
// Can then slim our DB on server