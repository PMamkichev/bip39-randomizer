import { fetchAddressBalance, explorerUrl, formatBtc } from "./balance.js?v=1.3.0";
import { deriveBitcoinAddresses } from "./bitcoin.js?v=1.3.0";
import { generateValidMnemonic } from "./generator.js?v=1.3.0";

let currentWords = [];
let currentAddresses = [];
let balances = new Map();
let generationId = 0;
let language = "ru";
const LANGUAGE_STORAGE_KEY = "satoshi-treasure-language";
const APP_VERSION = "1.3.0";

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
    checkUpdates: "↻ Проверить обновления",
    checkingUpdates: "Проверяем…",
    currentVersion: "У вас актуальная версия.",
    updateCheckError: "Не удалось проверить обновления. Попробуйте ещё раз.",
    updateEyebrow: "ДОСТУПНО ОБНОВЛЕНИЕ",
    updateTitle: "Доступна новая версия",
    updateText: "После перезапуска начнётся новый ход: текущие слова и адреса исчезнут. При необходимости скопируйте результат, затем закройте и откройте приложение снова.",
    updateClose: "Понятно",
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
    checkUpdates: "↻ Check for updates",
    checkingUpdates: "Checking…",
    currentVersion: "You are using the latest version.",
    updateCheckError: "Could not check for updates. Try again.",
    updateEyebrow: "UPDATE AVAILABLE",
    updateTitle: "A new version is available",
    updateText: "Restarting starts a new turn: current words and addresses will disappear. Copy the result if needed, then close and reopen the app.",
    updateClose: "Got it",
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
  checkUpdate: document.querySelector("#check-update-button"),
  version: document.querySelector("#app-version"),
  updateDialog: document.querySelector("#update-dialog"),
  updateDialogEyebrow: document.querySelector("#update-dialog-eyebrow"),
  updateDialogTitle: document.querySelector("#update-dialog-title"),
  updateDialogText: document.querySelector("#update-dialog-text"),
  updateDialogClose: document.querySelector("#update-dialog-close"),
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

function savedLanguage() {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === "ru" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

function saveLanguage() {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The app still works when a WebView blocks local storage.
  }
}

function applyLanguage(nextLanguage, shouldSave = false) {
  language = nextLanguage;
  if (shouldSave) saveLanguage();
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
  elements.checkUpdate.textContent = t("checkUpdates");
  elements.version.textContent = `v${APP_VERSION}`;
  elements.updateDialogEyebrow.textContent = t("updateEyebrow");
  elements.updateDialogTitle.textContent = t("updateTitle");
  elements.updateDialogText.textContent = t("updateText");
  elements.updateDialogClose.textContent = t("updateClose");
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
  const detectedLanguage = (webApp?.initDataUnsafe?.user?.language_code ?? browserLanguage)?.startsWith("ru") ? "ru" : "en";
  language = savedLanguage() ?? detectedLanguage;
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

function isNewerVersion(version) {
  const latest = version.split(".").map(Number);
  const current = APP_VERSION.split(".").map(Number);

  for (let index = 0; index < latest.length; index += 1) {
    if (latest[index] !== current[index]) return latest[index] > current[index];
  }

  return false;
}

async function checkUpdates() {
  elements.checkUpdate.disabled = true;
  elements.checkUpdate.textContent = t("checkingUpdates");

  try {
    const params = new URLSearchParams(window.location.search);
    const mockVersion = window.location.hostname === "127.0.0.1" && params.get("mock-update") === "1"
      ? "1.4.0"
      : null;
    let version = mockVersion;
    if (!version) {
      const response = await fetch(`version.json?checked=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Version request failed");
      version = (await response.json()).version;
    }

    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid version");

    if (isNewerVersion(version)) {
      elements.updateDialog.showModal();
    } else {
      showToast(t("currentVersion"));
    }
  } catch {
    showToast(t("updateCheckError"));
  } finally {
    elements.checkUpdate.disabled = false;
    elements.checkUpdate.textContent = t("checkUpdates");
  }
}

elements.more.addEventListener("click", generate);
elements.refresh.addEventListener("click", () => refreshBalances());
elements.copy.addEventListener("click", copyWords);
elements.checkUpdate.addEventListener("click", checkUpdates);
elements.updateDialogClose.addEventListener("click", () => elements.updateDialog.close());
elements.languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language, true));
});

configureTelegram();
applyLanguage(language);
generate();
