# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Common Changelog](https://common-changelog.org/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[1.0.0]: https://github.com/smol-ninja/schengen-visa-slot-sniper/releases/tag/v1.0.0

## [1.0.0] - 2026-03-31

### Added

- Automated TLS appointment scanning and booking with polling loop
- Reschedule mode with cancel-then-book flow and fallback re-booking
- Optional Telegram notifications on appointment found (bot token, chat ID, test button)
- Scan hint feedback when start conditions are unmet (missing credentials, untested details)
- Date, time, and day-of-week filtering for appointment slots
- Premium/labelled slot accept/reject toggle
- Cloudflare waiting room and captcha handling
- Belgium (visaonweb.diplomatie.be) login support
- Tailwind CSS v4 dark theme popup UI
- Copy recent logs button (last 50 entries)
- Unit tests (Vitest) and linting (Biome) with GitHub Actions CI
- Open-source docs (README, CONTRIBUTING, SECURITY, LICENSE)
