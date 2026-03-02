# Schengen Visa Slot Sniper

Chrome extension that automatically finds and books Schengen visa appointments on TLSContact.

## Features

- Automatic appointment scanning with configurable refresh intervals
- Auto-booking when slots are found
- Reschedule mode — keeps scanning for better slots after booking
- Date, time, and day-of-week filtering
- Telegram notifications when appointments are found or booked
- Support for Germany, France, Belgium, Italy, and Netherlands

## Install

1. Clone the repository:

```shell
git clone https://github.com/smol-ninja/schengen-visa-extension.git
cd schengen-visa-extension
```

2. Install dependencies and build:

```shell
bun install
just build
```

3. Open `chrome://extensions/` in Chrome, enable **Developer Mode**, click **Load unpacked**, and select the project
   directory.

## Usage

1. Open the extension popup.
2. Enter your TLSContact email and password in the **TLSContact Details** section.
3. Select your destination country.
4. Click **Test Details** to verify your credentials.
5. Configure your preferred refresh rate and filtering options.
6. Click **Start Scanning**.

The extension will scan for available appointments at your configured interval. When a matching slot is found, it
attempts to book automatically and sends a desktop notification.

### Telegram Notifications

To receive Telegram alerts:

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the bot token.
2. Get your Chat ID via [@userinfobot](https://t.me/userinfobot).
3. Enable Telegram in the extension settings and enter both values.

### Reschedule Mode

When enabled, the extension continues scanning after a successful booking. If a better slot is found (earlier date or
time), it cancels the existing appointment and books the new one.

## Architecture

```
┌─────────────┐     chrome.storage.local     ┌──────────────────┐
│  popup.js   │ ◄──────────────────────────► │  background.js   │
│  (UI panel) │                              │  (service worker) │
└─────────────┘                              └────────┬─────────┘
                                                      │ spawns tab
                                                      ▼
                                             ┌──────────────────┐
                                             │   content.js     │
                                             │ (TLSContact DOM) │
                                             └──────────────────┘
```

Three scripts communicate via `chrome.storage.local`:

| Script | Role |
|--------|------|
| `resources/popup.js` | UI controls, settings, status display |
| `resources/background.js` | Polling timer, appointment checking, credential refresh |
| `content.js` | Injects into TLSContact pages, handles login, extracts data, books appointments |

## Development

Prerequisites: [Bun](https://bun.sh), [Just](https://github.com/casey/just)

```shell
bun install     # Install dependencies
just build      # Compile Tailwind CSS (one-time)
just watch      # Watch mode for CSS changes during development
```

After modifying HTML or JS files that reference Tailwind classes, rebuild CSS to ensure all utilities are included.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE) for details.
