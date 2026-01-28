# ELI Lang

A browser extension that translates web pages on-the-fly using LLMs, with adjustable difficulty levels.

Choose your target language and comprehension level (ELI5, ELI10, etc.) to get translations tailored to your learning stage.

## Setup

```bash
npm install
npm run build
```

## Development

Run with hot-reload in a temporary browser profile:

```bash
npm run web-ext         # Firefox
npm run web-ext:chrome  # Chrome/Chromium
```

Requires Firefox or Chrome/Chromium installed on your system.

## Manual Install

1. Build with `npm run build`
2. Load `dist/` as an unpacked extension in your browser
3. Add your API key in extension options (supports Fireworks, OpenAI, Google)

## Usage

Select text on any page to translate it to your chosen language and difficulty level.
