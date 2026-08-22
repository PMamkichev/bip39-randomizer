# BIP-39 Randomizer

A lightweight, static Telegram Mini App for entertainment. It creates a 12-word English BIP-39 mnemonic locally, derives four first-receiving Bitcoin addresses locally, then checks those public addresses with Blockstream Esplora.

## Privacy and safety

- No backend, database, analytics, or user accounts.
- Mnemonic, entropy, seed, private keys and extended keys never leave the browser, are not saved and are not logged.
- The only blockchain requests are `GET https://blockstream.info/api/address/{publicAddress}` for the four derived public addresses. No API key or account is needed.
- No generated word is logged to the console.
- This is not a wallet tool. Do not use generated results to store real funds.

## Run locally

Modern browsers require module scripts to be served through HTTP:

```sh
npm install
npm run build
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
- BIP-39 generation uses 128 bits of Web Crypto entropy, SHA-256, four checksum bits and 12 groups of 11 bits.
- `js/bitcoin.js` is a locally bundled build of audited `@scure/bip32` and `@scure/btc-signer`; it derives BIP44, BIP49, BIP84 and BIP86 mainnet addresses without a server.
- `js/balance.js` queries only a public address via the free Blockstream Esplora API and combines its confirmed and mempool UTXO deltas into the displayed BTC balance.
- Run `npm test` to build and validate BIP-39, BIP-32, BIP-49, BIP-84 and BIP-86 vectors.
