# BIP-39 Randomizer

A lightweight, static Telegram Mini App for entertainment. It generates English BIP-39 words locally in the browser.

## Privacy and safety

- No backend, database, analytics, or user accounts.
- Generated words never leave the browser; the only external script is Telegram's official Mini App API integration.
- No generated word is logged to the console.
- This is not a wallet tool. Do not use generated results to store real funds.

## Run locally

Modern browsers require module scripts to be served through HTTP:

```sh
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Publish as a Telegram Mini App for free

1. Enable GitHub Pages for the `main` branch (root directory) in the repository settings.
2. Copy the resulting HTTPS URL.
3. In [@BotFather](https://t.me/BotFather), configure a Menu Button or Web App URL for your bot using that HTTPS URL.
4. Open the button in Telegram; the app uses Telegram WebApp theme values automatically when available.

## Implementation notes

- `js/wordlist.js` embeds the official 2048-word English BIP-39 list from the Bitcoin BIPs repository.
- Random mode independently picks 12 words using Web Crypto with rejection sampling.
- Valid mode uses 128 bits of entropy, SHA-256, four checksum bits, then 12 groups of 11 bits.

