import { fetchAddressBalance, explorerUrl, formatBtc } from "./balance.js";
import { deriveBitcoinAddresses } from "./bitcoin.js";
import { generateValidMnemonic } from "./generator.js";

let currentWords = [];
let currentAddresses = [];
let balances = new Map();
let generationId = 0;

const elements = {
  words: document.querySelector("#words"),
  addresses: document.querySelector("#addresses"),
  more: document.querySelector("#more-button"),
  refresh: document.querySelector("#refresh-button"),
  copy: document.querySelector("#copy-button"),
  toast: document.querySelector("#toast"),
  balanceMessage: document.querySelector("#balance-message"),
};

function configureTelegram() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  webApp.ready();
  webApp.expand();

  const theme = webApp.themeParams;
  const root = document.documentElement;
  if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color);
  if (theme.text_color) root.style.setProperty("--tg-text", theme.text_color);
  if (theme.hint_color) root.style.setProperty("--tg-hint", theme.hint_color);
  if (theme.button_color) root.style.setProperty("--tg-accent", theme.button_color);
  if (theme.secondary_bg_color) root.style.setProperty("--tg-surface", theme.secondary_bg_color);
}

function renderWords() {
  elements.words.replaceChildren(
    ...currentWords.map((word, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      const text = document.createElement("span");

      item.className = "word-card";
      number.className = "word-number";
      number.textContent = String(index + 1).padStart(2, "0");
      text.className = "word-text";
      text.textContent = word;
      item.append(number, text);
      return item;
    })
  );
}

function renderAddresses() {
  elements.addresses.replaceChildren(
    ...currentAddresses.map(({ id, label, address }) => {
      const card = document.createElement("li");
      const name = document.createElement("h3");
      const value = document.createElement("code");
      const balance = document.createElement("p");
      const actions = document.createElement("div");
      const copy = document.createElement("button");
      const open = document.createElement("a");
      const state = balances.get(id) ?? { status: "loading" };

      card.className = "address-card";
      name.textContent = label;
      value.textContent = address;
      balance.className = `balance balance-${state.status}`;
      balance.textContent = state.status === "ready"
        ? `Balance: ${formatBtc(state.satoshis)} BTC`
        : state.status === "error"
          ? "Balance: недоступен"
          : "Balance: обновление…";
      actions.className = "address-actions";
      copy.className = "address-button copy-address-button";
      copy.type = "button";
      copy.textContent = "📋 Копировать";
      copy.addEventListener("click", () => copyAddress(address));
      open.className = "address-button open-button";
      open.href = explorerUrl(address);
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "Открыть";
      actions.append(copy, open);
      card.append(name, value, balance, actions);
      return card;
    })
  );
}

function render() {
  renderWords();
  renderAddresses();
}

function setButtonsDisabled(disabled) {
  elements.more.disabled = disabled;
  elements.refresh.disabled = disabled || currentAddresses.length === 0;
}

async function refreshBalances(version = generationId) {
  if (!currentAddresses.length) return;

  elements.balanceMessage.textContent = "Обновление…";
  elements.refresh.textContent = "Обновление…";
  elements.refresh.disabled = true;
  currentAddresses.forEach(({ id }) => balances.set(id, { status: "loading" }));
  renderAddresses();

  const results = await Promise.all(
    currentAddresses.map(async ({ id, address }) => {
      try {
        return [id, { status: "ready", satoshis: await fetchAddressBalance(address) }];
      } catch {
        return [id, { status: "error" }];
      }
    })
  );

  if (version !== generationId) return;

  results.forEach(([id, result]) => balances.set(id, result));
  const failures = results.filter(([, result]) => result.status === "error").length;
  elements.balanceMessage.textContent = failures
    ? "Не удалось обновить часть балансов. Попробуйте ещё раз."
    : "";
  elements.refresh.textContent = "🔄 Обновить баланс";
  elements.refresh.disabled = false;
  renderAddresses();
}

async function generate() {
  setButtonsDisabled(true);
  elements.more.textContent = "Создаём…";
  elements.balanceMessage.textContent = "";
  const version = ++generationId;

  try {
    currentWords = await generateValidMnemonic();
    currentAddresses = await deriveBitcoinAddresses(currentWords);
    balances = new Map(currentAddresses.map(({ id }) => [id, { status: "loading" }]));
    render();
    await refreshBalances(version);
  } catch {
    elements.balanceMessage.textContent = "Не удалось создать BIP-39. Попробуйте ещё раз.";
  } finally {
    if (version === generationId) {
      elements.more.textContent = "🎲 Ещё";
      setButtonsDisabled(false);
    }
  }
}

async function copyText(text) {
  let copied = false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {
    copied = false;
  }

  if (!copied) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    copied = document.execCommand("copy");
    textarea.remove();
  }

  return copied;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

async function copyWords() {
  if (!currentWords.length) return;

  if (!(await copyText(currentWords.join(" ")))) {
    elements.balanceMessage.textContent = "Не удалось скопировать слова — выделите их вручную.";
    return;
  }

  showToast("Слова скопированы!");
}

async function copyAddress(address) {
  if (!(await copyText(address))) {
    elements.balanceMessage.textContent = "Не удалось скопировать адрес. Попробуйте ещё раз.";
    return;
  }

  showToast("Адрес скопирован!");
}

elements.more.addEventListener("click", generate);
elements.refresh.addEventListener("click", () => refreshBalances());
elements.copy.addEventListener("click", copyWords);

configureTelegram();
generate();
