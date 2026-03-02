# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-03-02

Initial public release.

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

### Fixed

- Allow refresh rate changes while scanning is active
- Avoid unnecessary credential refresh when next-month data is missing
- Reduce log noise from Cloudflare cookie handler

[0.1.0]: https://github.com/smol-ninja/schengen-visa-slot-sniper/releases/tag/v0.1.0
