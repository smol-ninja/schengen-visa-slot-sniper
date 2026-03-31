function setTextColor(el, cls) {
    el.classList.remove('text-red-400','text-green-400','text-cyan-400','text-slate-400','text-yellow-400','text-orange-400','text-gray-400');
    el.classList.add(cls);
}
function setBorderColor(el, cls) {
    el.classList.remove('border-red-500','border-green-500','border-slate-700');
    el.classList.add(cls);
}
const STATUS_COLOR_MAP = {
    'green':'text-green-400', 'Green':'text-green-400',
    'red':'text-red-400', 'Red':'text-red-400',
    'yellow':'text-yellow-400', 'Yellow':'text-yellow-400',
    'orange':'text-orange-400', 'Orange':'text-orange-400',
    'cyan':'text-cyan-400', 'Cyan':'text-cyan-400',
};

// THIS file just handles the details/data in the extension popup
let scan_secs = document.getElementById("next_refresh")
let cur_time = 0, booking = false, scanning = false

get_val("refresh_rate").then((text) => {
    if (text.refresh_rate == undefined) {
        chrome.storage.local.set({ "refresh_rate": 600 });
        rr.value = 600;
    }
    else
        rr.value = text.refresh_rate;
})

get_val('scanning').then((res) => {
    scanning = res.scanning
    if (scanning == undefined)
        scanning = false;

    if (scanning) {
        ss.innerText = "Stop Scanning"
    }
    else {
        ss.innerText = "Start Scanning"
    }
})

const tiers = ["Full Access"]
const tier_descs = ["All features unlocked"]

function log(msg) {
    let time = new Date(Date.now())
    let ds = time.toLocaleTimeString();
    console.log("[SSS] " + ds + " -- " + msg)
}

function set_status(msg, color) {
    store_val("status", {
        msg: msg,
        color: color
    })
}
///////////////////////////ELEMENT DEFINITIONS////////////////////////////////////
let tls_user = document.getElementById("tlsuser")
let tls_pass = document.getElementById("tlspass")
let tls_id = document.getElementById("tlsid")
let premium_start_date = document.getElementById('start_date')
let premium_start_time = document.getElementById('start_time')
let premium_last_date = document.getElementById('last_date')
let premium_last_time = document.getElementById('last_time')
let premium_slots = document.getElementById('prime_slots')
let premium_days = document.getElementsByName('days');


let tg_enabled = document.getElementById('tg_enabled')
let tg_bot_token = document.getElementById('tg_bot_token')
let tg_chat_id = document.getElementById('tg_chat_id')
let tg_test_btn = document.getElementById('tg_test')

let rr = document.getElementById('refresh_rate')
let ss = document.getElementById('start_scan')
let tls_dest = document.getElementById('tlsdest')
let test_details = document.getElementById("tls_test");

let logout_btn = document.getElementById("sss_logout")
let reschedule_toggle = document.getElementById("reschedule_mode")


///////////////////////////EVENT HANDLERS/////////////////////////////////////////

tls_user.addEventListener("input", store_tls_details);
tls_pass.addEventListener("input", store_tls_details);
tls_id.addEventListener("input", store_tls_details);
tls_dest.addEventListener("input", store_tls_details);
premium_slots.addEventListener("click", store_tls_details)
reschedule_toggle.addEventListener("click", (e) => {
    store_val("reschedule_mode", e.target.checked)
    if (!e.target.checked)
        store_val("current_booking", null)
})
premium_start_date.addEventListener("input", store_tls_details)
premium_start_time.addEventListener("input", store_tls_details)
premium_last_date.addEventListener("input", store_tls_details)
premium_last_time.addEventListener("input", store_tls_details)
premium_start_date.addEventListener("click", (e) => {
    e.target.value = ''
    store_val("premium_start_date", null)
})
premium_start_time.addEventListener("click", (e) => {
    e.target.value = ''
    store_val("premium_start_time", null)
})
premium_last_date.addEventListener("click", (e) => {
    e.target.value = ''
    store_val("premium_last_date", null)
})
premium_last_time.addEventListener("click", (e) => {
    e.target.value = ''
    store_val("premium_last_time", null)
})
premium_days.forEach((e) => {
    e.addEventListener("input", store_tls_details);
})

tg_enabled.addEventListener("click", (e) => {
    store_val("tg_enabled", e.target.checked)
})
tg_bot_token.addEventListener("input", (e) => {
    store_val("tg_bot_token", e.target.value)
})
tg_chat_id.addEventListener("input", (e) => {
    store_val("tg_chat_id", e.target.value)
})
tg_test_btn.addEventListener("click", async () => {
    const status_el = document.getElementById("tg_status");
    const token = tg_bot_token.value;
    const chat = tg_chat_id.value;
    if (!token || !chat) {
        status_el.innerText = "Enter bot token and chat ID first";
        setTextColor(status_el, 'text-red-400');
        return;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chat, text: "SSS test — Telegram notifications working!" })
        });
        if (res.ok) {
            status_el.innerText = "Test message sent!";
            setTextColor(status_el, 'text-green-400');
        } else {
            const err = await res.json();
            status_el.innerText = "Failed: " + (err.description || res.status);
            setTextColor(status_el, 'text-red-400');
        }
    } catch (e) {
        status_el.innerText = "Network error: " + e.message;
        setTextColor(status_el, 'text-red-400');
    }
})

logout_btn.addEventListener("click", async (e) => {
    clear_cache();
})

document.getElementById("copy_logs").addEventListener("click", async (e) => {
    let logs = (await get_val("sss_logs")).sss_logs || [];
    let recent = logs.slice(-50);
    let text = recent.join("\n");
    navigator.clipboard.writeText(text).then(() => {
        document.getElementById("log_status").innerText = `Copied ${recent.length} of ${logs.length} log entries`;
        setTextColor(document.getElementById("log_status"), 'text-green-400');
    })
})


rr.addEventListener("input", store_tls_details)
ss.addEventListener('click', async (e) => {
    let scanning = (await get_val('scanning')).scanning
    if ((await can_toggle_scan()) == false)
        return;

    if (scanning == undefined)
        scanning = false;
    else
        scanning = !scanning;

    if (scanning) {
        log("Starting scanning")
        chrome.storage.local.set({ 'scanning': true });
        await set_refresh_timer(await get_refresh_rate());
        ss.innerText = "Stop Scanning"
        set_status("Active", "green");
    }
    else {
        log("Scanning stopped ")
        chrome.storage.local.set({ 'scanning': false });
        ss.innerText = "Start Scanning"
        set_status("Idle", "orange");
    }
})

test_details.addEventListener("click", async (e) => {
    const locs = {
        'de': 'https://visas-de.tlscontact.com',
        'fr': 'https://visas-fr.tlscontact.com',
        'be': 'https://visaonweb.diplomatie.be/Account/Login?ReturnUrl=%2Fen',
        'nl': 'https://visas-nl.tlscontact.com',
        'it': 'https://visas-it.tlscontact.com'
    }
    let domain = locs[tls_dest.value];

    if (domain == null)
        return;

    set_tested(0);
    set_refreshing(true);
    await store_val("sss_request_close", false)
    set_status("Testing Details", "Yellow")
    if (domain.indexOf('diplomatie') != -1)
        login_belgium(domain)
    else
        chrome.tabs.create({ url: domain, active: true, index: 0 })
})

///////////////////////////GETTERS + SETTERS//////////////////////////////////////

async function get_is_scanning() {
    return (await get_val("scanning")).scanning
}

async function store_val(name, val) {
    const obj = {}
    obj[name] = val
    return await chrome.storage.local.set(obj)
}

async function get_val(name) {
    return (await chrome.storage.local.get(name))
}

async function set_scanning(val) {
    return chrome.storage.local.set({ "scanning": val })
}

async function get_stored_application_details() {
    return (await get_val("tls_details")).tls_details
}

async function set_testing_message(msg, is_error) {
    const test_log = document.getElementById("tls_test_log");
    test_log.innerText = msg;
    if (is_error)
        setTextColor(test_log, 'text-red-400');
    else
        setTextColor(test_log, 'text-green-400');
}

async function get_tested() {
    const detail_div = document.getElementById("tls_details");

    const val = (await get_val("sss_tested")).sss_tested
    if (val == 0) {
        setBorderColor(detail_div, 'border-red-500');
        set_testing_message("You must test your details before you can begin scanning!", true);
    }
    else if (val == 1) {
        setBorderColor(detail_div, 'border-green-500');
        set_testing_message("Details working fine!", false);
    }
    else if (val == -1) {
        setBorderColor(detail_div, 'border-red-500');
        set_testing_message("Your details are incorrect, please check them!", true);
    }

    return val
}

async function set_tested(val) {
    const detail_div = document.getElementById("tls_details");

    if (val == 0) {
        setBorderColor(detail_div, 'border-red-500');
        set_status("Awaiting Testing", "Red");
        set_testing_message("You must test your details before you can begin scanning!", true);

    }
    else if (val == 1) {
        setBorderColor(detail_div, 'border-green-500');
        set_status("Idle", "Orange");
        set_testing_message("Details working fine!", false);

    }
    else if (val == -1) {
        setBorderColor(detail_div, 'border-red-500');
        set_status("Awaiting Testing", "Red");
        set_testing_message("Your details are incorrect, please check them!", true);
    }

    return (await store_val("sss_tested", val))
}

async function set_refreshing(val) {
    return (await store_val("cred_refresh", val))
}

async function get_refresh_rate() {
    return (await get_val("refresh_rate")).refresh_rate
}

async function get_tp() {
    return (await get_val("tp")).tp
}

async function get_tu() {
    return (await get_val("tu")).tu
}

async function get_refresh_timer() {
    return (await get_val("current_time")).current_time
}

async function set_refresh_timer(num) {
    return (await chrome.storage.local.set({ "current_time": num }))
}

async function set_refresh_rate(num) {
    return (await chrome.storage.local.set({ "refresh_rate": num }))
}

async function get_membership() {
    return 0;
}

async function get_username() {
    return (await get_val("sss_user")).sss_user
}

/////////////////////////////////////////////////////////////////

async function login_belgium(domain) {
    chrome.tabs.create({
        url: domain,
        active: false,
        index: 0
    })
}

function showScanHint(msg, fields) {
    const hint = document.getElementById("scan_hint");
    hint.innerText = msg;
    hint.classList.remove('hidden');

    // Clear any previous highlights
    for (const el of [tls_user, tls_pass]) {
        setBorderColor(el, 'border-slate-700');
    }

    // Highlight the offending fields
    for (const el of fields) {
        setBorderColor(el, 'border-red-500');
        el.addEventListener('input', function handler() {
            setBorderColor(el, 'border-slate-700');
            el.removeEventListener('input', handler);
        });
    }

    setTimeout(() => { hint.classList.add('hidden'); }, 4000);
}

function clearScanHint() {
    const hint = document.getElementById("scan_hint");
    hint.innerText = '';
    hint.classList.add('hidden');
}

async function can_toggle_scan() {
    const tu = await get_tu();
    const tp = await get_tp();
    const missing = [];
    if (!tu) missing.push(tls_user);
    if (!tp) missing.push(tls_pass);

    if (missing.length > 0) {
        showScanHint("Enter your TLSContact email and password first", missing);
        return false;
    }

    const app_details = await get_stored_application_details();
    if (app_details == undefined || app_details == null) {
        showScanHint("Test your details first — click 'Test Details' below", []);
        return false;
    }

    const tested = await get_tested();
    if (tested != 1) {
        showScanHint("Test your details first — click 'Test Details' below", []);
        return false;
    }

    clearScanHint();
    return true;
}

async function store_tls_details(e) {
    if (e.currentTarget.id == 'tlsuser') {
        store_val("tu", e.currentTarget.value)
        set_tested(0);
    }
    else if (e.currentTarget.id == 'tlspass') {
        store_val("tp", e.currentTarget.value)
        set_tested(0);
    }
    else if (e.currentTarget.name == 'tlsdest') {
        store_val("td", e.target.value)
        set_tested(0);
    }
    else if (e.currentTarget.id == 'tlsid') {
        store_val("ti", e.currentTarget.value)
        set_tested(0);
    }
    else if (e.currentTarget.id == "refresh_rate") {
        store_val("refresh_rate", e.currentTarget.value)
        store_val("current_time", e.currentTarget.value)
        store_val("cf_blocked", false)
        cur_time = e.currentTarget.value;
    }
    else if (e.currentTarget.id == 'start_date') {
        store_val("premium_start_date", e.target.value)
    } else if (e.currentTarget.id == 'start_time') {
        store_val("premium_start_time", e.target.value)
    } else if (e.currentTarget.id == 'last_date') {
        store_val("premium_last_date", e.target.value)
    } else if (e.currentTarget.id == 'last_time') {
        store_val("premium_last_time", e.target.value)
    } else if (e.currentTarget.id == 'prime_slots') {
        store_val("premium_accept_prime", e.target.checked)
    }

    else if (e.currentTarget.name == 'days') {
        let out_days = ''
        premium_days.forEach(element => {
            if (element.checked)
                out_days += `${element.value}|`
        });

        store_val("premium_days", out_days);
    }
}

async function check_functionality(membership) {
    store_val("sss_autobooking", 2);
    document.getElementById('c2a').classList.add('hidden');
}

function set_stored_tls_details() {
    get_val("tu").then((text) => {
        if (text.tu != undefined)
            tls_user.value = text.tu;
    })

    get_val("tp").then((text) => {
        if (text.tp != undefined)
            tls_pass.value = text.tp;
    })

    get_val("ti").then((text) => {
        if (text.ti != undefined)
            tls_id.value = text.ti;
    })

    get_val("td").then((text) => {
        if (text.td != undefined) {
            let rb = document.getElementsByName("tlsdest")
            rb[0].value = text.td;
        }
    })

    get_val('premium_start_date').then((sd) => {
        if (sd.premium_start_date != undefined)
            premium_start_date.value = sd.premium_start_date
    })

    get_val('premium_start_time').then((st) => {
        if (st.premium_start_time != undefined)
            premium_start_time.value = st.premium_start_time
    })

    get_val('premium_last_date').then((ld) => {
        if (ld.premium_last_date != undefined)
            premium_last_date.value = ld.premium_last_date
    })

    get_val('premium_last_time').then((lt) => {
        if (lt.premium_last_time != undefined)
            premium_last_time.value = lt.premium_last_time
    })

    get_val('premium_accept_prime').then((res) => {
        if (res.premium_accept_prime != undefined)
            premium_slots.checked = res.premium_accept_prime
    })

    get_val("premium_days").then((text) => {
        if (text.premium_days != undefined) {
            const pd_split = text.premium_days.split('|')
            for (let i = 0; i < pd_split.length; i++) {
                if (pd_split[i] != '') {
                    let rb = document.getElementById(`d${pd_split[i]}`)
                    rb.checked = true;
                }
            }
        }
    })

    get_val("reschedule_mode").then((res) => {
        if (res.reschedule_mode != undefined)
            reschedule_toggle.checked = res.reschedule_mode
    })

    get_val("tg_enabled").then((res) => {
        if (res.tg_enabled != undefined)
            tg_enabled.checked = res.tg_enabled
    })
    get_val("tg_bot_token").then((res) => {
        if (res.tg_bot_token != undefined)
            tg_bot_token.value = res.tg_bot_token
    })
    get_val("tg_chat_id").then((res) => {
        if (res.tg_chat_id != undefined)
            tg_chat_id.value = res.tg_chat_id
    })
}


async function switch_windows(logged_in) {
    let main_fn = document.getElementById('sss_main');
    let login_fn = document.getElementById('logindetails');
    if (logged_in) {
        login_fn.classList.add('hidden');
        main_fn.classList.remove('hidden');
    }
    else {
        main_fn.classList.add('hidden');
        login_fn.classList.remove('hidden');
    }
}

function clear_cache() {
    store_val("sss_user", null);
    store_val("sss_code", null);
    store_val("sss_autobooking", 0);
    store_val("sss_membership", -1);
    store_val("scanning", false);
    store_val("cred_refresh", false);
    store_val("tls_details", null);
    store_val("tp", null);
    store_val("tu", null);
    store_val("ti", null);
    store_val("td", null);
    store_val("sss_tested", 0);
    store_val("user_creds", 0);
    store_val("sss_booking_attempt", null);
    store_val("cf_blocked", false);
    store_val("status", null);
    // Premium settings
    store_val("premium_last_date", null);
    store_val("premium_last_time", null);
    store_val("premium_start_date", null);
    store_val("premium_start_time", null);
    store_val("premium_days", null);
    store_val("premium_accept_prime", false);
    store_val("reschedule_mode", false);
    store_val("current_booking", null);
    store_val("sss_logs", []);
    // Telegram
    store_val("tg_enabled", false);
    store_val("tg_bot_token", null);
    store_val("tg_chat_id", null);
}

async function check_cf_blocked() {
    let extension_settings = document.getElementById('ext_settings');
    let extension_yap = document.getElementById('ext_yap');
    let blocked = (await get_val("cf_blocked")).cf_blocked

    if (blocked) {
        extension_yap.innerText = "Your refresh rate is too low or you opened TLS too much while we've been scanning, you've been blocked. Consider increasing it or letting the bot search alone. You will have to wait up to 24 hours until your block expires.";
        setTextColor(extension_yap, 'text-red-400');
        setBorderColor(extension_settings, 'border-red-500');
    }
    else {
        extension_yap.innerText = "Your refresh rate is currently OK. We will inform you if you get blocked due to it being too low.";
        setTextColor(extension_yap, 'text-green-400');
        setBorderColor(extension_settings, 'border-green-500');
    }
}

async function tick() {
    await check_functionality(0);
    get_username().then(async (res) => {
        document.getElementById("sss_username").innerText = res;
        document.getElementById('tier_type').innerText = tiers[0];
        document.getElementById('tier_desc').innerText = tier_descs[0];

        let gname = document.getElementById("gname");
        let gid = document.getElementById("gid");
        let glock = document.getElementById("gloc");

        let details = await get_stored_application_details();
        if (details == undefined) {
            gname.innerText = "Not Set";
            gid.innerText = "Not Set";
            glock.innerText = "Not Set";
            set_scanning(false);
        }
        else {
            gname.innerText = details.name;
            gid.innerText = details.app_id;
            glock.innerText = details.location;
        }
    })

    let last_scan_time = (await get_val("last_scan_time")).last_scan_time;
    document.getElementById("last_scan").innerText = last_scan_time || "Not yet";

    let find_count = (await get_val("found_count")).found_count
    if (find_count == undefined)
        find_count = 0;
    let ac = document.getElementById("apt_count");
    ac.innerText = `${find_count} appointment(s)`;
    setTextColor(ac, find_count > 0 ? 'text-cyan-400' : 'text-red-400');

    ///// Current booking display
    let booking_display = document.getElementById("current_booking_display");
    let current_booking = (await get_val("current_booking")).current_booking;
    if (current_booking != null && current_booking != undefined) {
        booking_display.innerText = `Current booking: ${current_booking.date} at ${current_booking.time}`;
        setTextColor(booking_display, 'text-cyan-400');
    } else {
        booking_display.innerText = "No active booking";
        setTextColor(booking_display, 'text-gray-400');
    }

    ///// Status color

    let stat = document.getElementById("status");
    let status_stored = (await get_val("status")).status
    if (status_stored == undefined) {
        stat.innerText = "Idle";
        setTextColor(stat, 'text-yellow-400');
    }
    else {
        stat.innerText = status_stored.msg ?? "Active";
        setTextColor(stat, STATUS_COLOR_MAP[status_stored.color] || 'text-green-400');
    }

    document.getElementById("agent_yap").classList.add('hidden');

    // Always keep the button enabled so users get feedback on click
    ss.removeAttribute('disabled');

    await check_cf_blocked();

    if (await get_is_scanning()) {
        scan_secs.innerText = await get_refresh_timer();
        if (ss.classList.contains("scan-off")) {
            ss.classList.remove("scan-off");
            ss.classList.add("scan-on");
        }

        ss.innerText = "Stop Scanning"
    } else {
        scan_secs.innerText = await get_refresh_rate();
        if (ss.classList.contains("scan-on")) {
            ss.classList.remove("scan-on");
            ss.classList.add("scan-off");
        }
        ss.innerText = "Start Scanning"
    }
}

store_val("sss_user", "Local User");
store_val("sss_membership", 0);
store_val("sss_autobooking", 2);
set_stored_tls_details();
setInterval(tick, 500);
switch_windows(true);

// TODO: Minify?