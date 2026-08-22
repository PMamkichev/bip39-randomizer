import { HDKey } from "@scure/bip32";
import * as bitcoin from "@scure/btc-signer";

const encoder = new TextEncoder();
const paths = [
  { id: "legacy", label: "Legacy", path: "m/44'/0'/0'/0/0" },
  { id: "nested", label: "Nested SegWit", path: "m/49'/0'/0'/0/0" },
  { id: "native", label: "Native SegWit", path: "m/84'/0'/0'/0/0" },
  { id: "taproot", label: "Taproot", path: "m/86'/0'/0'/0/0" },
];

function getCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is required.");
  }

  return globalThis.crypto;
}

export async function mnemonicToSeed(mnemonic, passphrase = "") {
  const crypto = getCrypto();
  const normalizedMnemonic = mnemonic.normalize("NFKD");
  const normalizedSalt = `mnemonic${passphrase}`.normalize("NFKD");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(normalizedMnemonic),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(normalizedSalt),
      iterations: 2048,
      hash: "SHA-512",
    },
    key,
    512
  );

  return new Uint8Array(bits);
}

function addressFor(type, publicKey) {
  if (type === "legacy") return bitcoin.p2pkh(publicKey).address;
  if (type === "nested") return bitcoin.p2sh(bitcoin.p2wpkh(publicKey)).address;
  if (type === "native") return bitcoin.p2wpkh(publicKey).address;
  if (type === "taproot") return bitcoin.p2tr(publicKey.slice(1)).address;
  throw new Error("Unsupported address type.");
}

export async function deriveBitcoinAddresses(words) {
  const seed = await mnemonicToSeed(words.join(" "));
  let root;

  try {
    root = HDKey.fromMasterSeed(seed);
    return paths.map((type) => {
      const child = root.derive(type.path);

      try {
        if (!child.publicKey) throw new Error("Unable to derive public key.");
        return {
          id: type.id,
          label: type.label,
          address: addressFor(type.id, child.publicKey),
        };
      } finally {
        child.wipePrivateData();
      }
    });
  } finally {
    root?.wipePrivateData();
    seed.fill(0);
  }
}
