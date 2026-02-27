// THIS file just handles the details/data in the extension popup
let scan_secs = document.getElementById("next_refresh")
let cur_time = 0, booking = false, scanning = false

get_val("refresh_rate").then((res) => {
    return res;
}).then((text) => {
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

tiers = ["Full Access"]
tier_descs = ["All features unlocked"]

function log(msg) {
    let time = new Date(Date.now())
    let ds = time.toLocaleTimeString();
    console.log("[VW] " + ds + " -- " + msg)
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

let logout_btn = document.getElementById("vwlogout")
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
        status_el.style = 'color:red';
        return;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chat, text: "Visa Warden test — Telegram notifications working!" })
        });
        if (res.ok) {
            status_el.innerText = "Test message sent!";
            status_el.style = 'color:green';
        } else {
            const err = await res.json();
            status_el.innerText = "Failed: " + (err.description || res.status);
            status_el.style = 'color:red';
        }
    } catch (e) {
        status_el.innerText = "Network error: " + e.message;
        status_el.style = 'color:red';
    }
})

logout_btn.addEventListener("click", async (e) => {
    clear_cache();
})

document.getElementById("copy_logs").addEventListener("click", async (e) => {
    let logs = (await get_val("vw_logs")).vw_logs || [];
    let recent = logs.slice(-50);
    let text = recent.join("\n");
    navigator.clipboard.writeText(text).then(() => {
        document.getElementById("log_status").innerText = `Copied ${recent.length} of ${logs.length} log entries`;
        document.getElementById("log_status").style = 'color:green';
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
    locs = {
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
    await store_val("vwrequest_close", false)
    set_status("Testing Details", "Yellow")
    if (domain.indexOf('diplomatie') != -1) {
        if (!login_belgium(domain)) {
            create_notification("failed_login", "Login details are incorrect, please double check!")
        }
    } else
        chrome.tabs.create({ url: domain, active: true, index: 0 })
})

///////////////////////////GETTERS + SETTERS//////////////////////////////////////

async function get_user_creds() {
}

async function get_is_scanning() {
    return (await get_val("scanning")).scanning
}

async function store_val(name, val) {
    obj = {}
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
        test_log.style = 'color:red';
    else
        test_log.style = 'color:green';
}

async function get_tested() {
    const detail_div = document.getElementById("tls_details");

    const val = (await get_val("vwtested")).vwtested
    if (val == 0) {
        detail_div.style = 'border-color: red';
        set_testing_message("You must test your details before you can begin scanning!", true);
    }
    else if (val == 1) {
        detail_div.style = 'border-color: green';
        set_testing_message("Details working fine!", false);
    }
    else if (val == -1) {
        detail_div.style = 'border-color: red';
        set_testing_message("Your details are incorrect, please check them!", true);
    }

    return val
}

async function set_tested(val) {
    const detail_div = document.getElementById("tls_details");

    if (val == 0) {
        detail_div.style = 'border-color: red';
        set_status("Awaiting Testing", "Red");
        set_testing_message("You must test your details before you can begin scanning!", true);

    }
    else if (val == 1) {
        detail_div.style = 'border-color: green';
        set_status("Idle", "Orange");
        set_testing_message("Details working fine!", false);

    }
    else if (val == -1) {
        detail_div.style = 'border-color: red';
        set_testing_message("Awaiting proper details", "Red");
        set_testing_message("Your details are incorrect, please check them!", true);
    }

    return (await store_val("vwtested", val))
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
    return (await get_val("vwarden_user")).vwarden_user
}

/////////////////////////////////////////////////////////////////

async function login_belgium(domain) {
    chrome.tabs.create({
        url: domain,
        active: false,
        index: 0
    })
}

async function can_toggle_scan() {
    const tu = await get_tu();
    const tp = await get_tp();
    if (tu == undefined || tp == undefined
        || tu == '' || tp == '')
        return false;

    const app_details = await get_stored_application_details();
    if (app_details == undefined || app_details == null)
        return false;

    const tested = await get_tested();
    if (tested != 1)
        return false;

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

async function do_vw_login(user, pass) {
    return 0;
}

async function disable_div_inputs(div_element) {
    div_element.querySelectorAll("input").forEach(element => {
        element.setAttribute("disabled", "")
    });
}

async function hide_div(div_element) {
    if (div_element.className.indexOf("deactivated") == -1)
        div_element.className = div_element.className + " deactivated"
}

async function check_functionality(membership) {
    store_val("vw_autobooking", 2);
    hide_div(document.getElementById('c2a'));
}

function set_stored_tls_details() {
    get_val("tu").then((res) => {
        return res;
    }).then((text) => {
        if (text.tu != undefined)
            tls_user.value = text.tu;
    })

    get_val("tp").then((res) => {
        return res;
    }).then((text) => {
        if (text.tp != undefined)
            tls_pass.value = text.tp;
    })

    get_val("ti").then((res) => {
        return res;
    }).then((text) => {
        if (text.ti != undefined)
            tls_id.value = text.ti;
    })

    get_val("td").then((res) => {
        return res;
    }).then((text) => {
        if (text.td != undefined) {
            let rb = document.getElementsByName("tlsdest")
            rb[0].value = text.td;
        }
    })

    get_val('premium_start_date').then((res) => {
        return res;
    }).then((sd) => {
        if (sd.premium_start_date != undefined) {
            premium_start_date.value = sd.premium_start_date
        }
    })

    get_val('premium_start_time').then((res) => {
        return res;
    }).then((st) => {
        if (st.premium_start_time != undefined) {
            premium_start_time.value = st.premium_start_time
        }
    })

    get_val('premium_last_date').then((res) => {
        return res;
    }).then((ld) => {
        if (ld.premium_last_date != undefined) {
            premium_last_date.value = ld.premium_last_date
        }
    })

    get_val('premium_last_time').then((res) => {
        return res;
    }).then((lt) => {
        if (lt.premium_last_time != undefined) {
            premium_last_time.value = lt.premium_last_time
        }
    })

    get_val('premium_accept_prime').then((res) => {
        return res;
    }).then((lt) => {
        if (lt.premium_accept_prime != undefined) {
            premium_slots.checked = lt.premium_accept_prime
        }
    })

    get_val("premium_days").then((res) => {
        return res;
    }).then((text) => {
        if (text.premium_days != undefined) {
            let premium_days = []
            pd_split = text.premium_days.split('|')
            for (i = 0; i < pd_split.length; i++) {
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
    let main_fn = document.getElementById('vwmain');
    let login_fn = document.getElementById('logindetails');
    if (logged_in) {
        hide_div(login_fn);
        main_fn.className = main_fn.className.replaceAll('deactivated', '');
    }
    else {
        hide_div(main_fn);
        login_fn.className = login_fn.className.replaceAll('deactivated', '');
    }
}

function clear_cache() {
    store_val("vwarden_user", null);
    store_val("vwarden_code", null);
    store_val("vw_autobooking", 0);
    store_val("vwarden_membership", -1);
    store_val("scanning", false);
    store_val("cred_refresh", false);
    store_val("tls_details", null);
    store_val("tp", null);
    store_val("tu", null);
    store_val("ti", null);
    store_val("td", null);
    store_val("vwtested", 0);
    store_val("user_creds", 0);
    store_val("vw_booking_attempt", null);
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
    store_val("vw_logs", []);
    // Telegram
    store_val("tg_enabled", false);
    store_val("tg_bot_token", null);
    store_val("tg_chat_id", null);
}

async function check_cf_blocked() {
    extension_settings = document.getElementById('ext_settings');
    extension_yap = document.getElementById('ext_yap');
    let blocked = (await get_val("cf_blocked")).cf_blocked

    if (blocked) {
        extension_yap.innerText = "Your refresh rate is too low or you opened TLS too much while we've been scanning, you've been blocked. Consider increasing it or letting the bot search alone. You will have to wait up to 24 hours until your block expires.";
        extension_yap.style = 'color:red';
        extension_settings.style = 'border-color: red';
    }
    else {
        extension_yap.innerText = "Your refresh rate is currently OK. We will inform you if you get blocked due to it being too low.";
        extension_yap.style = 'color:green';
        extension_settings.style = 'border-color: green';
    }
}

async function tick() {
    const membership = await get_membership();
    if (membership == -1) {
        await switch_windows(false);
        return;
    }

    await check_functionality(membership);
    get_username().then(async (res) => {
        document.getElementById("vwusername").innerText = res;
        let tt = document.getElementById('tier_type');
        tt.innerText = tiers[Math.min(membership, 5)];
        let td = document.getElementById('tier_desc');
        td.innerText = tier_descs[Math.min(membership, 5)];

        let gname = document.getElementById("gname");
        let gid = document.getElementById("gid");
        let glock = document.getElementById("gloc");

        details = await get_stored_application_details();
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
    let last_scan_el = document.getElementById("last_scan");
    last_scan_el.innerText = last_scan_time || "Not yet";

    find_count = (await get_val("found_count")).found_count
    if (find_count == undefined)
        find_count = 0;
    let ac = document.getElementById("apt_count");
    ac.innerText = `${find_count} appointment(s)`;
    if (find_count > 0)
        ac.style = 'color:cyan';
    else
        ac.style = 'color:red';

    ///// Current booking display
    let booking_display = document.getElementById("current_booking_display");
    let current_booking = (await get_val("current_booking")).current_booking;
    if (current_booking != null && current_booking != undefined) {
        booking_display.innerText = `Current booking: ${current_booking.date} at ${current_booking.time}`;
        booking_display.style = 'color:cyan';
    } else {
        booking_display.innerText = "No active booking";
        booking_display.style = 'color:gray';
    }

    ///// Status color

    let stat = document.getElementById("status");
    let status_stored = (await get_val("status")).status
    if (status_stored == undefined) {
        stat.innerText = "Idle";
        stat.style = `color:Yellow`
    }
    else {
        stat.innerText = status_stored.msg ?? "Active";
        stat.style = `color:${status_stored.color ?? "Green"}`
    }

    /// Agency stuff

    let agent = document.getElementById("agent_yap");
    if (membership == 5) {
        agent.className = 'fine_print';
        let creds = document.getElementById("cred_count");
        let u_creds = (await get_val("user_creds")).user_creds

        creds.innerText = u_creds;

        if (u_creds <= 0)
            set_scanning(false); // No scanning allowed!
    }
    else
        agent.className = 'fine_print deactivated';


    ////

    tu = await get_tu();
    tp = await get_tp();
    if (tu == undefined || tp == undefined
        || tu == '' || tp == '') {
        //TODO: Make button look disabled or flash red when they click Start without filled details
        ss.setAttribute("disabled", '');
        set_scanning(false);
        return;
    }
    else {
        if (await get_tested())
            ss.removeAttribute('disabled')
    }

    const can_scan = await can_toggle_scan();
    if (can_scan == false && !(await get_is_scanning())) {
        // Only disable the button — don't kill an active scan from the popup
        ss.setAttribute("disabled", '');
    }

    await check_cf_blocked();

    if (await get_is_scanning()) {
        scan_secs.innerText = await get_refresh_timer();
        if (ss.className.indexOf("scan_off") != -1)
            ss.className = ss.className.replace("scan_off", "scan_on");

        ss.innerText = "Stop Scanning"
    } else {
        scan_secs.innerText = await get_refresh_rate();
        if (ss.className.indexOf("scan_on") != -1)
            ss.className = ss.className.replace("scan_on", "scan_off");
        ss.innerText = "Start Scanning"
    }
}

store_val("vwarden_user", "Local User");
store_val("vwarden_membership", 0);
store_val("vw_autobooking", 2);
set_stored_tls_details();
setInterval(tick, 500);
switch_windows(true);

// TODO: Minify?