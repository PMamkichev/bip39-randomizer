const API_BASE = "https://blockstream.info/api";
const EXPLORER_BASE = "https://blockstream.info/address/";
const REQUEST_TIMEOUT_MS = 10_000;

function validStats(stats) {
  return stats &&
    Number.isSafeInteger(stats.funded_txo_sum) &&
    Number.isSafeInteger(stats.spent_txo_sum);
}

function withTimeout() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { controller, timeout };
}

export async function fetchAddressBalance(address) {
  const { controller, timeout } = withTimeout();

  try {
    const response = await fetch(`${API_BASE}/address/${encodeURIComponent(address)}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Balance request failed.");

    const payload = await response.json();
    if (!validStats(payload.chain_stats) || !validStats(payload.mempool_stats)) {
      throw new Error("Unexpected balance response.");
    }

    return payload.chain_stats.funded_txo_sum - payload.chain_stats.spent_txo_sum +
      payload.mempool_stats.funded_txo_sum - payload.mempool_stats.spent_txo_sum;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function formatBtc(satoshis) {
  return (satoshis / 100_000_000).toFixed(8);
}

export function explorerUrl(address) {
  return `${EXPLORER_BASE}${encodeURIComponent(address)}`;
}
