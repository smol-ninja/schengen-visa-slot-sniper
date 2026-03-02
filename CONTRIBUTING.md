# Contributing

Contributions are welcome! [Open](../../issues/new) an issue or submit a PR.

## Prerequisites

- [Bun](https://bun.sh) (package manager)
- [Just](https://github.com/casey/just) (command runner)
- [Google Chrome](https://www.google.com/chrome/) (for testing the extension)

## Set Up

Clone the repository:

```shell
git clone https://github.com/smol-ninja/schengen-visa-extension.git && cd schengen-visa-extension
```

Install dependencies:

```shell
bun install
```

Build CSS:

```shell
just build
```

Load the extension in Chrome:

1. Go to `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select the project directory

## Development Workflow

The project has no JS build step — scripts are loaded directly by Chrome. Only Tailwind CSS needs compilation:

```shell
just watch    # Recompiles CSS on file changes
```

After making changes, reload the extension in `chrome://extensions/` to pick up script changes.

## Project Layout

| File | Purpose |
|------|---------|
| `content.js` | Content script injected into TLSContact pages |
| `resources/background.js` | Background service worker (polling, scanning) |
| `resources/popup.js` | Extension popup UI logic |
| `resources/popup.html` | Popup HTML with Tailwind classes |
| `resources/input.css` | Tailwind source CSS with custom utilities |
| `manifest.json` | Chrome extension manifest |

## Pull Requests

When submitting a PR, ensure that:

- All changes work when the extension is loaded unpacked in Chrome.
- The popup opens without console errors.
- Tailwind CSS compiles without errors (`just build`).
- Tests pass (`just test`).
- Lint passes (`just lint`).
- New Tailwind class names used in JS are written as full static strings (no dynamic construction like
  `` `text-${color}-400` ``).
- Storage keys use the `sss_` prefix.
- No secrets, credentials, or personal data are included.
- A descriptive summary of the changes is provided.

## Code Style

- Vanilla JavaScript — no frameworks or transpilation.
- Tailwind utility classes for all styling — no inline `el.style` assignments.
- Toggle visibility with `classList.add('hidden')` / `classList.remove('hidden')`.
- Use `setTextColor()` and `setBorderColor()` helpers for dynamic color changes.
- Error codes: `sss_cs.XXX` (content script), `sss_bg.XXX` (background).
- Log prefix: `[SSS]`.
