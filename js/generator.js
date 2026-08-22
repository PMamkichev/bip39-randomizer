import { WORDLIST } from "./wordlist.js";

const WORD_COUNT = 12;
const ENTROPY_BYTES = 16;
const CHECKSUM_BITS = 4;
const wordIndexes = new Map(WORDLIST.map((word, index) => [word, index]));

function getCrypto() {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is required.");
  }

  return globalThis.crypto;
}

function bytesToBits(bytes) {
  return Array.from(bytes, (byte) => byte.toString(2).padStart(8, "0")).join("");
}

export async function generateValidMnemonic() {
  const crypto = getCrypto();
  const entropy = new Uint8Array(ENTROPY_BYTES);
  crypto.getRandomValues(entropy);

  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", entropy));
  const bits = bytesToBits(entropy) + bytesToBits(hash).slice(0, CHECKSUM_BITS);

  return Array.from({ length: WORD_COUNT }, (_, position) => {
    const index = Number.parseInt(bits.slice(position * 11, position * 11 + 11), 2);
    return WORDLIST[index];
  });
}

export async function isValidTwelveWordMnemonic(words) {
  if (!Array.isArray(words) || words.length !== WORD_COUNT) {
    return false;
  }

  const indexes = words.map((word) => wordIndexes.get(word));
  if (indexes.some((index) => index === undefined)) {
    return false;
  }

  const bits = indexes.map((index) => index.toString(2).padStart(11, "0")).join("");
  const entropyBits = bits.slice(0, ENTROPY_BYTES * 8);
  const checksum = bits.slice(ENTROPY_BYTES * 8);
  const entropy = new Uint8Array(
    entropyBits.match(/.{8}/g).map((byte) => Number.parseInt(byte, 2))
  );
  const crypto = getCrypto();
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", entropy));

  return checksum === bytesToBits(hash).slice(0, CHECKSUM_BITS);
}
