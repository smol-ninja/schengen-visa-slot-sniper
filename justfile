# Schengen Visa Slot Sniper — build recipes

# Build Tailwind CSS (minified)
build:
    bunx @tailwindcss/cli -i resources/input.css -o resources/dist/output.css --minify

# Watch Tailwind CSS for changes
watch:
    bunx @tailwindcss/cli -i resources/input.css -o resources/dist/output.css --watch

# Run unit tests
test:
    bunx vitest run

# Run tests in watch mode
test-watch:
    bunx vitest

# Lint lib/ and tests/
lint:
    bunx biome check .

# Format lib/ and tests/
fmt:
    bunx biome format --write .

# Lint + auto-fix
lint-fix:
    bunx biome check --fix .

# Package extension as ZIP for Chrome Web Store upload
package: build
    rm -f schengen-visa-slot-sniper.zip
    zip -r schengen-visa-slot-sniper.zip \
        manifest.json \
        content.js \
        lib/ \
        resources/background.js \
        resources/popup.js \
        resources/popup.html \
        resources/dist/output.css \
        resources/fonts/ \
        resources/favicon.png \
        resources/favicon_small.png \
        -x "*.DS_Store"
