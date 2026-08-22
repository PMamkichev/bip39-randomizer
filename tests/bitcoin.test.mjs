import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { HDKey } from "@scure/bip32";
import * as bitcoin from "@scure/btc-signer";

globalThis.crypto ??= webcrypto;

const { deriveBitcoinAddresses, mnemonicToSeed } = await import("../js/bitcoin-source.js");
const { generateValidMnemonic, isValidTwelveWordMnemonic } = await import("../js/generator.js");
globalThis.window = globalThis;
const { fetchAddressBalance } = await import("../js/balance.js");

const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const seed = await mnemonicToSeed(mnemonic, "TREZOR");
assert.equal(
  Buffer.from(seed).toString("hex"),
  "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04"
);
seed.fill(0);

const bip32Root = HDKey.fromMasterSeed(Buffer.from("000102030405060708090a0b0c0d0e0f", "hex"));
assert.equal(
  bip32Root.privateExtendedKey,
  "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi"
);
assert.equal(
  bip32Root.derive("m/0'").privateExtendedKey,
  "xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7"
);

const bip49Seed = await mnemonicToSeed(mnemonic);
const bip49Child = HDKey.fromMasterSeed(bip49Seed).derive("m/49'/1'/0'/0/0");
assert.equal(
  bitcoin.p2sh(bitcoin.p2wpkh(bip49Child.publicKey, bitcoin.TEST_NETWORK), bitcoin.TEST_NETWORK).address,
  "2Mww8dCYPUpKHofjgcXcBCEGmniw9CoaiD2"
);
bip49Child.wipePrivateData();
bip49Seed.fill(0);

const addresses = await deriveBitcoinAddresses(mnemonic.split(" "));
assert.deepEqual(addresses, [
  { id: "legacy", label: "Legacy", address: "1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA" },
  { id: "nested", label: "Nested SegWit", address: "37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf" },
  { id: "native", label: "Native SegWit", address: "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu" },
  { id: "taproot", label: "Taproot", address: "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr" },
]);

for (let index = 0; index < 20; index += 1) {
  assert.equal(await isValidTwelveWordMnemonic(await generateValidMnemonic()), true);
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({
  chain_stats: { funded_txo_sum: 250_000_000, spent_txo_sum: 50_000_000 },
  mempool_stats: { funded_txo_sum: 12_345, spent_txo_sum: 345 },
}));
assert.equal(await fetchAddressBalance("bc1qexample"), 200_012_000);
globalThis.fetch = async () => new Response("rate limited", { status: 429 });
await assert.rejects(() => fetchAddressBalance("bc1qexample"));
globalThis.fetch = originalFetch;

console.log("BIP-39, BIP-32, BIP-49, BIP-84 and BIP-86 vectors passed.");
