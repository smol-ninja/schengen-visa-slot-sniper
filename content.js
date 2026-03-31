console.log("SSS Content Script Initialized.")
const SSS_MAX_LOGS = 500;
function log(msg) {
    let time = new Date(Date.now())
    let ds = time.toLocaleTimeString();
    let entry = ds + " [CS] " + msg;
    console.log("[SSS] " + entry)
    chrome.storage.local.get("sss_logs").then((res) => {
        let logs = res.sss_logs || [];
        logs.push(entry);
        if (logs.length > SSS_MAX_LOGS)
            logs = logs.slice(-SSS_MAX_LOGS);
        chrome.storage.local.set({ "sss_logs": logs });
    })
}

async function set_tested(val) {
    return (await chrome.storage.local.set({ "sss_tested": val }))
}

async function get_tested() {
    return (await chrome.storage.local.get("sss_tested")).sss_tested
}

async function get_membership() {
    return 0;
}

async function get_booking_attempt() {
    return (await get_val("sss_booking_attempt")).sss_booking_attempt
}

async function set_cs_done(val) {
    return (await chrome.storage.local.set({ "sss_cs_done": val }))
}

async function set_request_close(val) {
    return (await chrome.storage.local.set({ "sss_request_close": val }))
}

async function check_logged_in() {
    return true;
}

async function set_scanning(val) {
    if (val === true)
        set_status("Active", "Green");
    return await store_val("scanning", val)
}

async function get_val(name) {
    return (await chrome.storage.local.get(name))
}

async function store_val(name, val) {
    const obj = {}
    obj[name] = val
    return await chrome.storage.local.set(obj)
}

async function request_notification(noti) {
    store_val("noti_pipe", noti);
}

async function get_user() {
    return (await get_val("sss_user")).sss_user;
}

function set_status(msg, color) {
    store_val("status", {
        msg: msg,
        color: color
    })
}

async function set_refresh_timer(num) {
    return (await chrome.storage.local.set({ "current_time": num }))
}

async function get_application_details() {
    return (await chrome.storage.local.get('tls_details')).tls_details
}

async function request_captcha(uri, type = 1) {
    return '';
}

async function log_error(msg) {
    log("ERROR: " + msg)
}

async function log_info(msg) {
    log("INFO: " + msg)
}
// extract_application_id_from_url is loaded from lib/url-utils.js via manifest

async function extract_application_id_from_groups() {
    const elements = document.getElementsByClassName('p-4 text-on-surface-variant')
    // const blocked_element = document.getElementsByClassName('rounded-lg bg-white shadow-primary')
    // TODO: Potentially store them all and have a dropdown

    let result = get_val("ti").then((ti) => {
        const desired_id = ti.ti;
        // if (blocked_element.length >= 1) {
        //     // Assume blocked for 2 hours
        //     set_status("Rate Limited - Try again in an hour")
        // }
        // else {
        for (let i = 0; i < elements.length; i += 4) {
            const name = elements[i].textContent
            const app_id = elements[i + 1].textContent
            const location = elements[i + 2].textContent
            const submitted = elements[i + 3].textContent

            // Too many languages, need to FORCE english if  icare
            let parent = elements[i + 3].parentNode;
            let buttons_td = parent.childNodes[parent.childNodes.length - 1];
            let buttons = buttons_td.childNodes[0];

            let is_submitted = (submitted == "Submitted") || (buttons.childNodes[0].hasAttribute('disabled') && buttons.childNodes[1].hasAttribute('disabled'));

            if (is_submitted) {
                if (desired_id != undefined && desired_id != "")
                    if (Number(app_id) != Number(desired_id)) {
                        // log(`Desired ID ${desired_id} does not match ${app_id}`)
                        continue
                    }
                const app_num = Number(app_id)
                return { app_num, name, location };
            }
        }
        set_status("Error sss_cs.001", "red")
        // }
        return null;
    })

    return result;
}

async function get_tls_account_details() {
    let tu = (await get_val("tu")).tu
    let tp = (await get_val("tp")).tp
    return { tu, tp };
}

async function get_refreshing() {
    return (await get_val("cred_refresh")).cred_refresh
}

async function set_refreshing(val) {
    if (val == false)
        log("Creds refreshed.")
    return (await store_val("cred_refresh", val))
}

async function handle_potential_cloudflare() {
    const is_cap = (document.body.innerText.indexOf("Ray ID") != -1) || (document.URL.indexOf("__cf_chl") != -1)

    if (is_cap) {
        let ca = (await get_val("captcha_attempts")).captcha_attempts
        if (ca == undefined || ca == null)
            ca = 1;
        ca += 1
        setTimeout(() => {
            set_status(`Solving CF Captcha Attempt ${ca}`, "Yellow")
            store_val("captcha_attempts", ca);
            window.close()
            location.reload()
        }, 10000)
        // dont need to clear timeout because it will clear as soon as we change pages.
        return true; // Let cloudflare do its thing!
    }

    return false;
}

async function get_captcha_solution(url) {
    let captcha_response = await request_captcha(url, 0);
    console.log("Captcha is " + captcha_response)
    return captcha_response
}

async function handle_site_down(domain_lang, cur_title) {
    let da = (await get_val("down_attempts")).down_attempts
    if (da == undefined || da == null)
        da = 1;
    da += 1

    set_status(`TLSContact Down. Refreshing in 30s. Attempt ${da}`, "Orange");
    store_val("down_attempts", da);
    if (cur_title == '' || cur_title.indexOf("Service Unavailable") != -1 || document.body.className.indexOf("neterror") != -1) {
        setTimeout(() => {
            window.location.href = `https://${domain_lang}/login`
        }, 30 * 1000) // Refresh page in 30s.
    }
    else {
        setTimeout(() => {
            location.reload();
        }, 30 * 1000) // Refresh page in 30s.
    }
}

async function get_citizen_two_body(booking_info) {
    const fgId = booking_info.body_data.fgId;
    const lang = booking_info.body_data.lang;
    const centre = booking_info.body_data.centre;
    const date = booking_info.body_data.date;
    const time = booking_info.body_data.time;
    const appt_type = booking_info.body_data.appt_type;
    const captcha_token = await get_captcha_solution(booking_info.book_uri);

    const form_data = new FormData()
    form_data.append('1_formGroupId', fgId)
    form_data.append('1_lang', lang)
    form_data.append('1_process', 'APPOINTMENT')
    form_data.append('1_location', centre)
    form_data.append('1_date', date)
    form_data.append('1_time', time)
    form_data.append('1_appointmentLabel', appt_type)
    if (centre.indexOf("2fr") != -1)
        form_data.append('1_captchaToken', captcha_token)
    else
        form_data.append('1_captcha_token', captcha_token)

    form_data.append('0', '[{"status":"IDLE"},"$K1"]')
    return form_data
}

async function alert_successful_booking(booking_info) {
    let reschedule = (await get_val("reschedule_mode")).reschedule_mode;
    let current = (await get_val("current_booking")).current_booking;

    let has_body = booking_info && booking_info.body_data;
    if (has_body) {
        let new_date = booking_info.body_data.date;
        let new_time = booking_info.body_data.time;
        store_val("current_booking", { date: new_date, time: new_time });
    }

    if (has_body && current != null) {
        request_notification(`Rescheduled! ${current.date} ${current.time} → ${booking_info.body_data.date} ${booking_info.body_data.time}`);
        set_status("Rescheduled!", "Green");
    } else {
        request_notification("Appointment booked! Check it out in your email!!");
        set_status("Appointment Booked!", "Green");
    }

    if (reschedule) {
        set_status("Booked - Still Scanning for Better Slots", "Cyan");
    } else {
        set_scanning(false);
    }
}

async function verify_successful_booking(booking_info) {
    store_val("sss_booking_attempt", null); // Clear booking attempt.
    const fgId = booking_info.body_data.fgId;
    const domain_large = booking_info.book_uri
    // https://visas-fr.tlscontact.com/en-us/24958323/workflow/appointment-booking?month=3-2026
    const domain_start = domain_large.split('.com')[0] + ".com";
    let full_uri = `${domain_start}/en-us/${fgId}/workflow/order-summary`;
    const res = await fetch(full_uri,
        {
            mode: "same-origin",
            method: "GET",
            headers:
            {
                "RSC": 1
            },
            origin: full_uri,
            referrer: full_uri,
            credentials: "include"
        }
    ).then(async (res) => {
        let text = await res.text()
        // Discovery log: capture order-summary structure for Approach A research
        let snippet_start = text.indexOf('"children":"Date & time:"');
        if (snippet_start != -1) {
            let snippet = text.substring(Math.max(0, snippet_start - 200), Math.min(text.length, snippet_start + 500));
            log("DISCOVERY: order-summary snippet: " + snippet);
        }
        // Log any cancel/reschedule related strings in the response
        const cancel_refs = text.match(/(cancel|reschedule|modify|change)[\w]*/gi);
        if (cancel_refs)
            log("DISCOVERY: order-summary action refs: " + JSON.stringify(cancel_refs));
        return (text.indexOf('"children":"Date & time:"') != -1) // Return true on booking
    })

    if (res) {
        alert_successful_booking(booking_info);
        return true;
    }
    else {
        log_error("Failed to verify booking.");
        return false;
    }
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

async function attempt_cancel(booking_info) {
    const cancel = booking_info.cancel;
    const fgId = booking_info.body_data.fgId;
    const lang = booking_info.body_data.lang;

    const form_data = new FormData();
    form_data.append('1_formGroupId', fgId);
    form_data.append('1_lang', lang);
    form_data.append('0', '[{"status":"IDLE"},"$K1"]');

    log_info("Attempting to cancel existing appointment...");
    const orig = cancel.original_booking;
    send_telegram_msg(`<b>SSS</b>\n⏳ Cancelling existing appointment (${orig.date} ${orig.time}) to reschedule...`);

    const res = await fetch(cancel.cancel_uri,
        {
            mode: "same-origin",
            method: "POST",
            headers: {
                "next-action": cancel.hash,
                "Accept": "text/x-component",
            },
            origin: cancel.cancel_uri,
            referrer: cancel.cancel_uri,
            credentials: "include",
            body: form_data
        }
    ).then(async (response) => {
        log(`Cancel response: ${response.status}`)
        const text = await response.text();
        log("Cancel response body: " + text.substring(0, 500));

        if (response.status == 200 || response.status == 303) {
            if (text.indexOf('FAILED') != -1) {
                log_error("Cancel returned FAILED response");
                send_telegram_msg(`<b>SSS</b>\n❌ Cancel failed — server rejected. Keeping existing appointment.`);
                return false;
            }
            log_info("Cancel appears successful");
            send_telegram_msg(`<b>SSS</b>\n✅ Existing appointment (${orig.date} ${orig.time}) cancelled.`);
            return true;
        }

        log_error("Cancel failed with status: " + response.status);
        send_telegram_msg(`<b>SSS</b>\n❌ Cancel failed (HTTP ${response.status}). Keeping existing appointment.`);
        return false;
    }).catch((err) => {
        log_error("Cancel fetch error: " + err.message);
        send_telegram_msg(`<b>SSS</b>\n❌ Cancel error: ${err.message}`);
        return false;
    });

    return res;
}

async function attempt_booking(booking_info) {
    const body = await get_citizen_two_body(booking_info)
    const book_url = booking_info.book_uri
    const hash = booking_info.hash

    const res = await fetch(book_url,
        {
            mode: "same-origin",
            method: "POST",
            headers: {
                "next-action": hash,
                "Accept": "text/x-component",
            },
            origin: book_url,
            referrer: book_url,
            credentials: "include",
            body: body
        }
    ).then(async (response) => {
        log(`Response: ${response.status}`)
        if (response.status == 403) {
            log("Womp womp....");
            return false;
        }

        const result = await response.text();
        if (response.status == 200 || response.status == 303) {
            if (result == '') {
                log_info("redirect success");
                return verify_successful_booking(booking_info)
            }

            const lines = result.split("\n")
            const raw_json = lines[1].slice(2)
            log(raw_json)

            const json = JSON.parse(raw_json)

            if (json['status'] == 'FAILED') {
                log_error("Failed to book: " + JSON.stringify(json))
                if (json.body.errorCode == 'APPOINTMENT_UNAVAILABLE')
                    return -1; // Cant get the appointment, so we dont even try again!
                return false;
            }
            else if (json['status'] == 'success' || json['status'] == 200) {
                log_info("json success");
                alert_successful_booking(booking_info);
                return true;
            }
        }
        else if (response.status == 500) {
            log("Unexpected server behaviour!")
            log_error("Unexpected server behaviour: " + result)
            log(result);
            return false;
        }
        else {
            log("Booking JSON!!!")
            log_error("Booking JSON Error: " + result)
            log(result)
            return false;
        }
    })

    return res;
}

async function get_tp() {
    return (await get_val("tp")).tp
}

async function get_tu() {
    return (await get_val("tu")).tu
}

async function get_belgian_onboarding() {
    let res = await fetch('https://visaonweb.diplomatie.be/VisaApplication/MyList?draw=1&columns%5B0%5D%5Bdata%5D=VOWId&columns%5B0%5D%5Bname%5D=VOWUniqueId&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=AppNum&columns%5B1%5D%5Bname%5D=ApplicationNumber&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=St&columns%5B3%5D%5Bname%5D=Status&columns%5B3%5D%5Bsearchable%5D=false&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D%5BId%5D=Id&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=false&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=desc&start=0&length=10&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1769785962449',
        { method: "GET" }
    ).then(async (result) => {
        if (result.status != 200) {
            // TODO: Trigger Fail! Cannot read application info!!
            set_status("Error sss_cs.002", "red");
            return false;
        }

        const j = await result.json()
        const data = j.data
        // just get first guys ID, should be fine!
        const id = data[0].Id

        return await fetch(`https://visaonweb.diplomatie.be/VisaApplication/CreateRdv?Id=${id}`,
            { method: "POST" }
        ).then(async (result) => {
            const j2 = await result.json()
            const onboarding_token = j2.infoToSent;
            return onboarding_token
        })
    })

    return res;
}

async function handle_belgium(domain) {
    let resp = await fetch(domain, {
        method: "GET",
    }).then(async (result) => {
        const res_text = await result.text()
        let start = res_text.indexOf('__RequestVerificationToken')
        let end = start + "__RequestVerificationToken' type='hidden' value='".length
        let token = res_text.slice(end, res_text.indexOf('"', end)) // Got request token.

        const user = await get_tu();
        const pass = await get_tp();

        let login_attempt = await fetch(domain, {
            method: "POST",
            body: new URLSearchParams({
                '__RequestVerificationToken': token,
                'UserName': user,
                'Password': pass
            })
        }).then(async (result) => {
            const text = await result.text()
            if (result.status != 302) {
                if (text.indexOf('Invalid username') != -1) {
                    log("Failed to login 1...");
                    // TODO: Trigger Fail
                    set_status("Error sss_cs.003", "red");
                    return false;
                }
            }

            token = await get_belgian_onboarding();
            if (token == false) {
                log("Failed to login 2...");
                //TRIGGER FAIL
                set_status("Error sss_cs.004", "red");
                return false;
            }

            location.href = `https://welcome.visas-be.tlscontact.com/?onboarding_token=${token}`;
            return true;
        })

        return login_attempt;
    });

    return resp;
}

async function main() {
    const cur_url = document.URL;
    const cur_title = document.title;
    let start = cur_url.indexOf("visas-");
    let end = cur_url.indexOf(".com");

    const domain_lang = cur_url.substring(start, end + 10); // Include language
    const domain_nolang = cur_url.substring(start, end + 4); // no language

    const booking_attempt = await get_booking_attempt()
    let booking_attempt_count = 0;
    if (booking_attempt != null && booking_attempt != undefined) {
        // Cancel existing appointment first if in reschedule mode
        let cancelled = false;
        if (booking_attempt.cancel) {
            let cancel_ok = await attempt_cancel(booking_attempt);
            if (!cancel_ok) {
                log_error("Cancel failed — keeping existing appointment, skipping new booking");
                store_val("sss_booking_attempt", null);
                set_request_close(true);
                return;
            }
            cancelled = true;
            log_info("Existing appointment cancelled — proceeding with new booking");
        }

        let booking_succeeded = false;
        while (booking_attempt_count < 5) {
            let res = await attempt_booking(booking_attempt)
            if (res === true) {
                booking_succeeded = true;
                if (cancelled) {
                    const bd = booking_attempt.body_data;
                    const orig = booking_attempt.cancel.original_booking;
                    send_telegram_msg(`<b>SSS</b>\n✅ Rescheduled! ${orig.date} ${orig.time} → ${bd.date} ${bd.time} (${bd.centre})`);
                }
                let details = await get_application_details()
                window.location.href = `https://${domain_lang}/${details.app_id}/workflow/order-summary`
                break;
            }
            else if (res == -1) {
                break; // Slot unavailable — stop retrying this slot
            }
            booking_attempt_count++;
        }

        // Fallback: if we cancelled but new booking failed, try to re-book original slot
        if (cancelled && !booking_succeeded) {
            log_error("New booking failed after cancel — attempting to re-book original slot");
            const original = booking_attempt.cancel.original_booking;
            send_telegram_msg(`<b>SSS</b>\n⚠️ New slot booking failed. Attempting to re-book original (${original.date} ${original.time})...`);
            const fallback = {
                ...booking_attempt,
                body_data: {
                    ...booking_attempt.body_data,
                    date: original.date,
                    time: original.time,
                },
                cancel: null,
            };
            let restored = false;
            for (let i = 0; i < 3; i++) {
                let res = await attempt_booking(fallback);
                if (res === true) {
                    log_info("Fallback re-booking succeeded — original slot restored");
                    restored = true;
                    send_telegram_msg(`<b>SSS</b>\n✅ Original appointment (${original.date} ${original.time}) re-booked successfully.`);
                    let details = await get_application_details()
                    window.location.href = `https://${domain_lang}/${details.app_id}/workflow/order-summary`
                    break;
                }
                if (res == -1) break; // Original slot gone too
            }
            if (!restored) {
                log_error("CRITICAL: Failed to re-book original slot! Manual rebooking needed!");
                request_notification("CRITICAL: Original appointment cancelled but could not re-book! Check immediately!");
                send_telegram_msg(`<b>SSS</b>\n🚨 CRITICAL: Cancelled old appointment but failed to book new OR re-book original (${original.date} ${original.time}). Manual action needed!`);
            }
        }

        if (!booking_succeeded && !cancelled) {
            // Non-reschedule failure — original quick-recheck behavior
            log_info("Attempting quick recheck");
            set_refresh_timer(5);
            set_request_close(true);
        }

        store_val("sss_booking_attempt", null);
        return;
    }

    let tested = await get_tested();
    let creds = await get_refreshing();
    let logged = await check_logged_in();
    if (logged == false || (tested != 0 && creds == false))
        return;

    const applications = `https://${domain_lang}/travel-groups`;
    const is_captcha = await handle_potential_cloudflare();
    if (is_captcha)
        return; // Let it do its thang.

    store_val("captcha_attempts", 0);

    if (document.URL.indexOf("diplomatie") != -1) {
        if ((await handle_belgium(document.URL)) == false) {
            request_notification("Login details are incorrect, please double check!");
            set_status("Error sss_cs.005", "red");
            set_refreshing(false);
        }
        return;
    }

    const is_belgium = document.URL.indexOf('visas-be') != -1;

    if (cur_url == `https://${domain_lang}` && !is_belgium) {
        // Redirect to login
        window.location.href = `https://${domain_lang}/login`
    }
    else {
        let failed = false;
        if (document.title.indexOf('Waiting Room') != -1 || document.body.innerText.indexOf("Internal Server Error") != -1) {
            log("CF Waiting Room");
            set_status("Cloudflare Waiting Room. Do not Refresh.", "Orange");
            return; // They will handle.
        }
        else if (document.URL.indexOf("login") != -1 || cur_url.indexOf('auth') != -1) {
            if (document.body.innerHTML.indexOf("tls-input_error") != -1) {
                request_notification("Login details are incorrect, please double check!");
                set_status("Error sss_cs.006", "red");
                set_refreshing(false);
                return;
            }

            const email = document.getElementById('email-input-field')
            const pass = document.getElementById('password-input-field')

            if (email == null || pass == null) {
                await handle_site_down(domain_lang, cur_title);
                return;
            }
            store_val("down_attempts", 0);
            get_tls_account_details().then((res) => {
                if (res.tu == null || res.tu == undefined || res.tp == null || res.tp == undefined) {
                    failed = true;
                    request_notification("Please input your login details in the Schengen Visa Slot Sniper extension!")
                    set_status("Error sss_cs.007", "red");
                    set_refreshing(false);
                    return;
                }

                email.value = res.tu;
                pass.value = res.tp;
                const login_btn = document.getElementById('btn-login')
                login_btn.click(); // TODO: Check if captcha pops up. If so, alert user.
                const recap = document.getElementsByClassName('swal2-container')
                const recap2 = document.getElementById("it-recaptcha-here")
                if (recap.length > 0 || recap2.length > 0) {
                    const login_form = document.getElementById("kc-login-form");
                    get_membership().then(async (membership) => {
                        store_val("captcha_interact", true);
                        if (membership < 4) {
                            chrome.runtime.sendMessage("request_focus")
                            set_status("Awaiting Captcha Interaction", "yellow");
                            request_notification("Please complete the captcha on the TLSContact Page!")
                            alert("Please complete the captcha on the TLSContact Page!");

                            return; // Yap to them.
                        }
                        set_status("Solving Captcha", "yellow");

                        let resp = await request_captcha(document.URL);

                        let test = await fetch(login_form.action, {
                            method: "POST",
                            body: new URLSearchParams({
                                'username': res.tu,
                                'password': res.tp,
                                'g-recaptcha-response': resp,

                            }),
                            redirect: "manual"
                        })

                        if (test.status == 0) {
                            location.reload();
                        } else {
                            await handle_site_down(domain_lang, cur_title);
                            return;
                        }
                    })
                }
            })
        }
        else if (document.URL != applications && document.URL.indexOf("appointment-booking") == -1 && !is_belgium) {
            // Redirect to the main page showing apps
            window.location.href = applications;
        }
        else if (cur_url.indexOf("workflow") != -1) {
            window.location.href = applications; // Just go to applications.
        }
        else if (document.URL.indexOf('appointment-booking') != -1 && is_belgium) {
            // Time to go!
            set_tested(1);
            set_refreshing(false);
            set_request_close(true);
        }
        else if (cur_url.indexOf(applications) != -1) {
            store_val("captcha_interact", false);

            let extract_data_promise = extract_application_id_from_groups();
            extract_data_promise.then((extract_data) => {
                if (extract_data == null || extract_data.app_num == null) {
                    request_notification("No suitable application found, please create one or check your settings!")
                    set_status("You are blocked or you have no valid applications", "red");
                    set_tested(false);
                    set_refreshing(false);
                    return;
                }

                const app_id = extract_data.app_num;
                const app_name = extract_data.name;
                const app_loc = extract_data.location;

                chrome.storage.local.set({
                    "tls_details": {
                        "domain": domain_nolang,
                        "app_id": app_id,
                        "name": app_name,
                        "location": app_loc
                    }
                })

                if (is_belgium) {
                    window.location.href = `https://${domain_lang}/appointment-booking` // not even a real place lol.
                }
                else {
                    set_tested(1);
                    set_refreshing(false);
                    set_request_close(true);
                }
            })

            // TODO: Check if invalid or something on page (or can we just assume failed true if we get here from the login clause?)
            if (!failed) {
                set_cs_done(true);
            }
        }
        else {
            setTimeout(() => {
                log(cur_title)
                log(cur_url)
                log("IDK WHERE WE ARE. REFRESHING NOW")
                location.reload() // i think we can dig it tbh.
            }, 5000)
        }
    }
}


main();