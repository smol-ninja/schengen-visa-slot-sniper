# Schengen Visa Slot Sniper

Chrome extension that automatically finds and books Schengen visa appointments on TLSContact.

## Tech Stack

- **Platform**: Chrome Extension (Manifest V3)
- **Language**: Vanilla JavaScript (no framework)
- **Styling**: Tailwind CSS v4
- **Package Manager**: Bun
- **Task Runner**: Just
- **Build**: `@tailwindcss/cli`

## Project Structure

```
├── content.js               # Content script (injected into TLSContact pages)
├── lib/
│   ├── appointments.js      # Pure appointment-filtering functions (shared)
│   └── url-utils.js         # Pure URL utility functions (shared)
├── resources/
│   ├── background.js        # Background service worker (polling loop)
│   ├── popup.js             # Popup UI script (extension popup)
│   ├── popup.html           # Popup HTML (Tailwind dark theme)
│   ├── input.css            # Tailwind source CSS + custom utilities
│   ├── dist/output.css      # Compiled Tailwind (git-ignored, run `just build`)
│   ├── favicon.png          # Extension icon (48px)
│   └── favicon_small.png    # Small icon variant
├── tests/
│   ├── appointments.test.js # Tests for lib/appointments.js
│   └── url-utils.test.js    # Tests for lib/url-utils.js
├── manifest.json            # Chrome extension manifest
├── justfile                 # Build recipes
└── package.json             # Dependencies (tailwindcss)
```

## Architecture

Three independent scripts share state via `chrome.storage.local`:

| Script | Context | Role |
|--------|---------|------|
| `content.js` | Page (TLSContact DOM) | Logs in, extracts app data, executes bookings |
| `resources/background.js` | Service worker | Polling timer, appointment checking, credential refresh |
| `resources/popup.js` | Extension popup | UI controls, settings, status display |

Storage key prefix: `sss_` (e.g., `sss_logs`, `sss_tested`, `sss_booking_attempt`).
Error code prefixes: `sss_cs.*` (content script), `sss_bg.*` (background).
Log prefix: `[SSS]`.

## Code Conventions

- No build step for JS — vanilla scripts loaded directly by the extension
- Tailwind classes in HTML + JS (via `classList` toggling, never inline `el.style`)
- Status colors mapped through `STATUS_COLOR_MAP` (full static class strings, no dynamic construction)
- Custom Tailwind utilities: `scan-off`, `scan-on` (defined in `input.css`)
- All credentials stored in `chrome.storage.local` with short keys (`tu`, `tp`, `td`, `ti`)

## Development

```shell
bun install        # Install dependencies
just build         # Compile Tailwind CSS
just watch         # Watch mode for CSS changes
just test          # Run unit tests
just test-watch    # Run tests in watch mode
just lint          # Lint lib/ and tests/
just fmt           # Format lib/ and tests/
just lint-fix      # Lint + auto-fix
```

Load as unpacked extension in `chrome://extensions/` (enable Developer Mode).

## Testing

Testable pure functions live in `lib/`. Each file uses a conditional CJS export guard so it works both
as a browser global (loaded via `importScripts` or manifest `js` array) and as a module for Vitest:

```js
if (typeof module !== 'undefined')
    module.exports = { myFunction };
```

- **`lib/appointments.js`** — loaded by `resources/background.js` via `importScripts`
- **`lib/url-utils.js`** — loaded by `content.js` via the manifest `content_scripts.js` array

Tests are in `tests/` and run with Vitest. Biome handles linting and formatting, scoped to `lib/` and `tests/`.

## Git Conventions

- Commit format: `feat:`, `fix:`, `chore:` prefix with lowercase description
- Base branch: `main`
- Do not commit `node_modules/` or `resources/dist/`

## References

@justfile
@manifest.json
@CONTRIBUTING.md
