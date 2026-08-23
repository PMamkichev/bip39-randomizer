import { fetchAddressBalance, explorerUrl, formatBtc } from "./balance.js";
import { deriveBitcoinAddresses } from "./bitcoin.js";
import { generateValidMnemonic } from "./generator.js";

let currentWords = [];
let currentAddresses = [];
let balances = new Map();
let generationId = 0;
let language = "ru";

const translations = {
  ru: {
    pageTitle: "Клад Сатоши",
    eyebrow: "Bitcoin-квест",
    intro: "Нажмите «Ещё», открывайте новые адреса и проверяйте их баланс. Каждый ход создаёт настоящие Bitcoin-адреса.",
    wordsTitle: "12 слов BIP-39",
    wordsLabel: "Сгенерированные слова",
    addressesTitle: "Bitcoin-адреса",
    addressesLabel: "Bitcoin-адреса",
    copy: "📋 Скопировать",
    copyAddress: "📋 Копировать",
    open: "Открыть",
    refresh: "🔄 Обновить баланс",
    refreshing: "Обновление…",
    more: "🎲 Новый ход",
    creating: "Создаём…",
    balance: "Баланс",
    unavailable: "недоступен",
    partialBalanceError: "Не удалось обновить часть балансов. Попробуйте ещё раз.",
    generationError: "Не удалось создать BIP-39. Попробуйте ещё раз.",
    copyWordsError: "Не удалось скопировать слова — выделите их вручную.",
    copyAddressError: "Не удалось скопировать адрес. Попробуйте ещё раз.",
    wordsCopied: "Слова скопированы!",
    addressCopied: "Адрес скопирован!",
    notice: "⚠️ Не используйте сгенерированные seed-фразы для хранения реальных средств. Это развлекательное приложение.",
    addressTypes: {
      legacy: "Классический",
      nested: "Вложенный SegWit",
      native: "Нативный SegWit",
      taproot: "Taproot",
    },
  },
  en: {
    pageTitle: "Satoshi’s Treasure",
    eyebrow: "Bitcoin quest",
    intro: "Press “New turn”, discover new addresses and check their balances. Each turn creates real Bitcoin addresses.",
    wordsTitle: "12 BIP-39 words",
    wordsLabel: "Generated words",
    addressesTitle: "Bitcoin addresses",
    addressesLabel: "Bitcoin addresses",
    copy: "📋 Copy",
    copyAddress: "📋 Copy",
    open: "Open",
    refresh: "🔄 Refresh balance",
    refreshing: "Refreshing…",
    more: "🎲 New turn",
    creating: "Creating…",
    balance: "Balance",
    unavailable: "unavailable",
    partialBalanceError: "Some balances could not be refreshed. Try again.",
    generationError: "Could not create BIP-39. Try again.",
    copyWordsError: "Could not copy the words — select them manually.",
    copyAddressError: "Could not copy the address. Try again.",
    wordsCopied: "Words copied!",
    addressCopied: "Address copied!",
    notice: "⚠️ Do not use generated seed phrases to store real funds. This is an entertainment app.",
    addressTypes: {
      legacy: "Legacy",
      nested: "Nested SegWit",
      native: "Native SegWit",
      taproot: "Taproot",
    },
  },
};

const elements = {
  words: document.querySelector("#words"),
  addresses: document.querySelector("#addresses"),
  more: document.querySelector("#more-button"),
  refresh: document.querySelector("#refresh-button"),
  copy: document.querySelector("#copy-button"),
  toast: document.querySelector("#toast"),
  balanceMessage: document.querySelector("#balance-message"),
  eyebrow: document.querySelector("#eyebrow"),
  title: document.querySelector("#app-title"),
  intro: document.querySelector("#intro"),
  wordsTitle: document.querySelector("#words-title"),
  addressesTitle: document.querySelector("#addresses-title"),
  notice: document.querySelector("#notice"),
  languageButtons: document.querySelectorAll(".language-button"),
};

function t(key) {
  return translations[language][key];
}

function applyLanguage(nextLanguage) {
  language = nextLanguage;
  document.documentElement.lang = language;
  document.title = t("pageTitle");
  elements.eyebrow.textContent = t("eyebrow");
  elements.title.textContent = t("pageTitle");
  elements.intro.textContent = t("intro");
  elements.wordsTitle.textContent = t("wordsTitle");
  elements.words.setAttribute("aria-label", t("wordsLabel"));
  elements.addressesTitle.textContent = t("addressesTitle");
  elements.addresses.setAttribute("aria-label", t("addressesLabel"));
  elements.copy.textContent = t("copy");
  elements.notice.textContent = t("notice");
  elements.languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });

  if (!elements.more.disabled) elements.more.textContent = t("more");
  if (!elements.refresh.disabled) elements.refresh.textContent = t("refresh");
  render();
}

function configureTelegram() {
  const webApp = window.Telegram?.WebApp;
  const browserLanguage = navigator.language?.toLowerCase();
  language = (webApp?.initDataUnsafe?.user?.language_code ?? browserLanguage)?.startsWith("ru") ? "ru" : "en";
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
      name.textContent = t("addressTypes")[id] ?? label;
      value.textContent = address;
      balance.className = `balance balance-${state.status}`;
      balance.textContent = state.status === "ready"
        ? `${t("balance")}: ${formatBtc(state.satoshis)} BTC`
        : state.status === "error"
          ? `${t("balance")}: ${t("unavailable")}`
          : `${t("balance")}: ${t("refreshing")}`;
      actions.className = "address-actions";
      copy.className = "address-button copy-address-button";
      copy.type = "button";
      copy.textContent = t("copyAddress");
      copy.addEventListener("click", () => copyAddress(address));
      open.className = "address-button open-button";
      open.href = explorerUrl(address);
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = t("open");
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

  elements.balanceMessage.textContent = t("refreshing");
  elements.refresh.textContent = t("refreshing");
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
    ? t("partialBalanceError")
    : "";
  elements.refresh.textContent = t("refresh");
  elements.refresh.disabled = false;
  renderAddresses();
}

async function generate() {
  setButtonsDisabled(true);
  elements.more.textContent = t("creating");
  elements.balanceMessage.textContent = "";
  const version = ++generationId;

  try {
    currentWords = await generateValidMnemonic();
    currentAddresses = await deriveBitcoinAddresses(currentWords);
    balances = new Map(currentAddresses.map(({ id }) => [id, { status: "loading" }]));
    render();
    await refreshBalances(version);
  } catch {
    elements.balanceMessage.textContent = t("generationError");
  } finally {
    if (version === generationId) {
      elements.more.textContent = t("more");
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
    elements.balanceMessage.textContent = t("copyWordsError");
    return;
  }

  showToast(t("wordsCopied"));
}

async function copyAddress(address) {
  if (!(await copyText(address))) {
    elements.balanceMessage.textContent = t("copyAddressError");
    return;
  }

  showToast(t("addressCopied"));
}

elements.more.addEventListener("click", generate);
elements.refresh.addEventListener("click", () => refreshBalances());
elements.copy.addEventListener("click", copyWords);
elements.languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language));
});

configureTelegram();
applyLanguage(language);
generate();
