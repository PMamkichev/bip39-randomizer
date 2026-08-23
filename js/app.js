import { BalanceRateLimitError, fetchAddressBalance, explorerUrl, formatBtc } from "./balance.js?v=1.4.5";
import { deriveBitcoinAddresses } from "./bitcoin.js?v=1.4.5";
import { generateValidMnemonic } from "./generator.js?v=1.4.5";

let currentWords = [];
let currentAddresses = [];
let balances = new Map();
let generationId = 0;
let language = "ru";
let seedExpanded = false;
let availableUpdateVersion = null;
let updateCheckTimer = null;
const LANGUAGE_STORAGE_KEY = "satoshi-treasure-language";
const localMockBuild = window.location.hostname === "127.0.0.1"
  && new URLSearchParams(window.location.search).get("build") === "1.4.6";
const APP_VERSION = localMockBuild ? "1.4.6" : "1.4.5";

const translations = {
  ru: {
    pageTitle: "Клад Сатоши",
    eyebrow: "Bitcoin-квест",
    intro: "Проверьте адреса и баланс — ещё один шаг к кладу Сатоши.",
    wordsTitle: "Seed-фраза",
    wordsLabel: "Сгенерированные слова",
    seedHidden: "12 слов · скрыта",
    seedVisible: "12 слов · показана",
    showSeed: "Показать",
    hideSeed: "Скрыть",
    addressesTitle: "Bitcoin-адреса",
    addressesLabel: "Bitcoin-адреса",
    copy: "📋 Скопировать",
    checkUpdates: "↻ Проверить обновления",
    checkingUpdates: "Проверяем…",
    currentVersion: "Версия актуальна",
    updateCheckError: "Не удалось проверить обновления. Попробуйте ещё раз.",
    updateEyebrow: "ДОСТУПНО ОБНОВЛЕНИЕ",
    updateTitle: "Доступна новая версия",
    updateText: "После обновления начнётся новый ход: текущие слова и адреса исчезнут. При необходимости сначала скопируйте seed-фразу.",
    updateCopy: "📋 Скопировать seed-фразу",
    updateNow: "Обновить сейчас",
    updateClose: "Позже",
    aboutButton: "ℹ️ О приложении",
    aboutEyebrow: "О ПРИЛОЖЕНИИ",
    aboutTitle: "Клад Сатоши",
    aboutWhatTitle: "Что это",
    aboutWhatText: "«Клад Сатоши» — развлекательный Bitcoin-квест. Каждый новый ход генерирует валидную 12-словную BIP-39 фразу и проверяет, есть ли баланс у четырёх соответствующих Bitcoin-адресов.",
    aboutPrivacyTitle: "Приватность",
    aboutPrivacyText: "Seed-фраза, энтропия, seed и временные ключевые данные обрабатываются только на устройстве. Они не отправляются на сервер, не сохраняются в базе данных, аналитике или постоянном хранилище.",
    aboutSessionText: "При новом ходе текущий результат заменяется. После закрытия приложения он не восстанавливается. Единственная сохраняемая настройка — выбранный язык интерфейса.",
    aboutBalanceTitle: "Баланс и адреса",
    aboutBalanceText: "Для проверки баланса приложение отправляет в Blockstream только четыре публичных Bitcoin-адреса. Seed-фраза и приватные данные наружу не передаются.",
    aboutSourceTitle: "Открытый исходный код",
    aboutSourceText: "Исходный код приложения открыт на GitHub.",
    aboutWarning: "Приложение создано для развлечения. Не используйте сгенерированные фразы для хранения реальных средств.",
    aboutSourceLink: "↗ Исходный код",
    aboutClose: "Понятно",
    copyAddress: "📋 Копировать",
    open: "Открыть",
    refreshing: "Обновление…",
    more: "🎲 Новый ход",
    creating: "Создаём…",
    newTurn: "Новый ход",
    totalBalance: "Общий баланс",
    totalLoading: "Обновляем…",
    totalUnavailable: "Недоступен",
    balance: "Баланс",
    unavailable: "недоступен",
    partialBalanceError: "Не удалось обновить часть балансов.",
    balanceRateLimited: "Лимит проверки баланса временно превышен.",
    balanceRateLimitedShort: "лимит превышен",
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
    intro: "Check addresses and balances — another step toward Satoshi’s treasure.",
    wordsTitle: "Seed phrase",
    wordsLabel: "Generated words",
    seedHidden: "12 words · hidden",
    seedVisible: "12 words · visible",
    showSeed: "Show",
    hideSeed: "Hide",
    addressesTitle: "Bitcoin addresses",
    addressesLabel: "Bitcoin addresses",
    copy: "📋 Copy",
    checkUpdates: "↻ Check for updates",
    checkingUpdates: "Checking…",
    currentVersion: "Up to date",
    updateCheckError: "Could not check for updates. Try again.",
    updateEyebrow: "UPDATE AVAILABLE",
    updateTitle: "A new version is available",
    updateText: "Updating starts a new turn: current words and addresses will disappear. Copy the seed phrase first if needed.",
    updateCopy: "📋 Copy seed phrase",
    updateNow: "Update now",
    updateClose: "Later",
    aboutButton: "ℹ️ About",
    aboutEyebrow: "ABOUT THE APP",
    aboutTitle: "Satoshi’s Treasure",
    aboutWhatTitle: "What it is",
    aboutWhatText: "Satoshi’s Treasure is an entertainment Bitcoin quest. Every new turn generates a valid 12-word BIP-39 phrase and checks whether any of four corresponding Bitcoin addresses has a balance.",
    aboutPrivacyTitle: "Privacy",
    aboutPrivacyText: "The seed phrase, entropy, seed, and temporary key data are processed only on your device. They are not sent to a server or stored in a database, analytics system, or persistent storage.",
    aboutSessionText: "A new turn replaces the current result. It is not restored after the app is closed. The only saved setting is the selected interface language.",
    aboutBalanceTitle: "Balances and addresses",
    aboutBalanceText: "To check balances, the app sends only four public Bitcoin addresses to Blockstream. The seed phrase and private data are never sent outside the app.",
    aboutSourceTitle: "Open source",
    aboutSourceText: "The app’s source code is open on GitHub.",
    aboutWarning: "This app is made for entertainment. Do not use generated phrases to store real funds.",
    aboutSourceLink: "↗ Source code",
    aboutClose: "Got it",
    copyAddress: "📋 Copy",
    open: "Open",
    refreshing: "Refreshing…",
    more: "🎲 New turn",
    creating: "Creating…",
    newTurn: "New turn",
    totalBalance: "Total balance",
    totalLoading: "Updating…",
    totalUnavailable: "Unavailable",
    balance: "Balance",
    unavailable: "unavailable",
    partialBalanceError: "Some balances could not be refreshed.",
    balanceRateLimited: "The balance-check limit has been temporarily exceeded.",
    balanceRateLimitedShort: "rate limited",
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
  seedToggle: document.querySelector("#seed-toggle"),
  seedStatus: document.querySelector("#seed-status"),
  addresses: document.querySelector("#addresses"),
  more: document.querySelector("#more-button"),
  copy: document.querySelector("#copy-button"),
  checkUpdate: document.querySelector("#check-update-button"),
  version: document.querySelector("#app-version"),
  updateDialog: document.querySelector("#update-dialog"),
  updateDialogEyebrow: document.querySelector("#update-dialog-eyebrow"),
  updateDialogTitle: document.querySelector("#update-dialog-title"),
  updateDialogText: document.querySelector("#update-dialog-text"),
  updateCopy: document.querySelector("#update-copy-button"),
  updateNow: document.querySelector("#update-now-button"),
  updateDialogClose: document.querySelector("#update-dialog-close"),
  aboutButton: document.querySelector("#about-button"),
  aboutDialog: document.querySelector("#about-dialog"),
  aboutDialogEyebrow: document.querySelector("#about-dialog-eyebrow"),
  aboutDialogTitle: document.querySelector("#about-dialog-title"),
  aboutWhatTitle: document.querySelector("#about-what-title"),
  aboutWhatText: document.querySelector("#about-what-text"),
  aboutPrivacyTitle: document.querySelector("#about-privacy-title"),
  aboutPrivacyText: document.querySelector("#about-privacy-text"),
  aboutSessionText: document.querySelector("#about-session-text"),
  aboutBalanceTitle: document.querySelector("#about-balance-title"),
  aboutBalanceText: document.querySelector("#about-balance-text"),
  aboutSourceTitle: document.querySelector("#about-source-title"),
  aboutSourceText: document.querySelector("#about-source-text"),
  aboutWarning: document.querySelector("#about-warning"),
  sourceLink: document.querySelector("#source-link"),
  aboutDialogClose: document.querySelector("#about-dialog-close"),
  toast: document.querySelector("#toast"),
  balanceMessage: document.querySelector("#balance-message"),
  tapLabel: document.querySelector("#tap-label"),
  totalBalanceLabel: document.querySelector("#total-balance-label"),
  totalBalance: document.querySelector("#total-balance"),
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

function setNewTurnLabel(key) {
  elements.tapLabel.textContent = t(key);
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
  setNewTurnLabel("newTurn");
  elements.totalBalanceLabel.textContent = t("totalBalance");
  elements.checkUpdate.textContent = t("checkUpdates");
  elements.version.textContent = `v${APP_VERSION}`;
  elements.updateDialogEyebrow.textContent = t("updateEyebrow");
  elements.updateDialogTitle.textContent = t("updateTitle");
  elements.updateDialogText.textContent = t("updateText");
  elements.updateCopy.textContent = t("updateCopy");
  elements.updateNow.textContent = t("updateNow");
  elements.updateDialogClose.textContent = t("updateClose");
  elements.aboutButton.textContent = t("aboutButton");
  elements.aboutDialogEyebrow.textContent = t("aboutEyebrow");
  elements.aboutDialogTitle.textContent = t("aboutTitle");
  elements.aboutWhatTitle.textContent = t("aboutWhatTitle");
  elements.aboutWhatText.textContent = t("aboutWhatText");
  elements.aboutPrivacyTitle.textContent = t("aboutPrivacyTitle");
  elements.aboutPrivacyText.textContent = t("aboutPrivacyText");
  elements.aboutSessionText.textContent = t("aboutSessionText");
  elements.aboutBalanceTitle.textContent = t("aboutBalanceTitle");
  elements.aboutBalanceText.textContent = t("aboutBalanceText");
  elements.aboutSourceTitle.textContent = t("aboutSourceTitle");
  elements.aboutSourceText.textContent = t("aboutSourceText");
  elements.aboutWarning.textContent = t("aboutWarning");
  elements.sourceLink.textContent = t("aboutSourceLink");
  elements.aboutDialogClose.textContent = t("aboutClose");
  elements.notice.textContent = t("notice");
  elements.languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });

  if (!elements.more.disabled) setNewTurnLabel("newTurn");
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
  elements.words.hidden = !seedExpanded;
  elements.seedToggle.textContent = seedExpanded ? t("hideSeed") : t("showSeed");
  elements.seedStatus.textContent = seedExpanded ? t("seedVisible") : t("seedHidden");
}

function renderTotalBalance() {
  const states = currentAddresses.map(({ id }) => balances.get(id));
  const allReady = states.length > 0 && states.every((state) => state?.status === "ready");
  const hasError = states.some((state) => state?.status === "error");

  elements.totalBalance.textContent = allReady
    ? `${formatBtc(states.reduce((sum, state) => sum + state.satoshis, 0))} BTC`
    : hasError
      ? t("totalUnavailable")
      : t("totalLoading");
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
          ? `${t("balance")}: ${state.reason === "rate-limit" ? t("balanceRateLimitedShort") : t("unavailable")}`
          : `${t("balance")}: ${t("refreshing")}`;
      actions.className = "address-actions";
      copy.className = "address-button copy-address-button";
      copy.type = "button";
      copy.textContent = "📋";
      copy.setAttribute("aria-label", t("copyAddress"));
      copy.title = t("copyAddress");
      copy.addEventListener("click", () => copyAddress(address));
      open.className = "address-button open-button";
      open.href = explorerUrl(address);
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "↗";
      open.setAttribute("aria-label", t("open"));
      open.title = t("open");
      actions.append(copy, open);
      card.append(name, value, balance, actions);
      return card;
    })
  );
}

function render() {
  renderWords();
  renderAddresses();
  renderTotalBalance();
}

function setButtonsDisabled(disabled) {
  elements.more.disabled = disabled;
}

async function refreshBalances(version = generationId) {
  if (!currentAddresses.length) return;

  elements.balanceMessage.textContent = t("refreshing");
  currentAddresses.forEach(({ id }) => balances.set(id, { status: "loading" }));
  render();

  const results = await Promise.all(
    currentAddresses.map(async ({ id, address }) => {
      try {
        return [id, { status: "ready", satoshis: await fetchAddressBalance(address) }];
      } catch (error) {
        return [id, {
          status: "error",
          reason: error instanceof BalanceRateLimitError ? "rate-limit" : "request-failed",
        }];
      }
    })
  );

  if (version !== generationId) return;

  results.forEach(([id, result]) => balances.set(id, result));
  const failures = results.filter(([, result]) => result.status === "error").length;
  const rateLimited = results.some(([, result]) => result.reason === "rate-limit");
  elements.balanceMessage.textContent = failures
    ? rateLimited
      ? t("balanceRateLimited")
      : t("partialBalanceError")
    : "";
  render();
}

async function generate() {
  setButtonsDisabled(true);
  setNewTurnLabel("creating");
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
      setNewTurnLabel("newTurn");
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

function showToast(message, compact = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-compact", compact);
  elements.toast.classList.add("is-visible");
  window.setTimeout(() => {
    elements.toast.classList.remove("is-visible", "is-compact");
  }, 1800);
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

function toggleSeed() {
  seedExpanded = !seedExpanded;
  renderWords();
}

function isNewerVersion(version) {
  const latest = version.split(".").map(Number);
  const current = APP_VERSION.split(".").map(Number);

  for (let index = 0; index < latest.length; index += 1) {
    if (latest[index] !== current[index]) return latest[index] > current[index];
  }

  return false;
}

function showUpdateDialog(version) {
  availableUpdateVersion = version;
  openDialog(elements.updateDialog, elements.updateDialogTitle);
}

function openDialog(dialog, title) {
  if (!dialog.open) dialog.showModal();
  title.focus({ preventScroll: true });
}

async function checkUpdates({ silentCurrent = false } = {}) {
  elements.checkUpdate.disabled = true;
  elements.checkUpdate.textContent = t("checkingUpdates");

  try {
    const params = new URLSearchParams(window.location.search);
    const mockVersion = window.location.hostname === "127.0.0.1" && params.get("mock-update") === "1"
      ? "1.4.6"
      : null;
    let version = mockVersion;
    if (!version) {
      const response = await fetch(`version.json?checked=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Version request failed");
      version = (await response.json()).version;
    }

    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid version");

    if (isNewerVersion(version)) {
      showUpdateDialog(version);
    } else if (!silentCurrent) {
      showToast(t("currentVersion"), true);
    }
  } catch {
    showToast(t("updateCheckError"));
  } finally {
    elements.checkUpdate.disabled = false;
    elements.checkUpdate.textContent = t("checkUpdates");
  }
}

async function copyUpdateWords() {
  if (!currentWords.length) return;

  if (!(await copyText(currentWords.join(" ")))) {
    elements.balanceMessage.textContent = t("copyWordsError");
    return;
  }

  showToast(t("wordsCopied"));
}

function updateNow() {
  if (!availableUpdateVersion) return;

  const url = new URL(window.location.href);
  url.searchParams.set("build", availableUpdateVersion);
  url.searchParams.set("reload", String(Date.now()));
  window.location.replace(url.toString());
}

function scheduleUpdateCheck() {
  window.clearTimeout(updateCheckTimer);
  updateCheckTimer = window.setTimeout(() => checkUpdates({ silentCurrent: true }), 350);
}

elements.more.addEventListener("click", generate);
elements.copy.addEventListener("click", copyWords);
elements.seedToggle.addEventListener("click", toggleSeed);
elements.checkUpdate.addEventListener("click", checkUpdates);
elements.updateCopy.addEventListener("click", copyUpdateWords);
elements.updateNow.addEventListener("click", updateNow);
elements.updateDialogClose.addEventListener("click", () => elements.updateDialog.close());
elements.aboutButton.addEventListener("click", () => openDialog(elements.aboutDialog, elements.aboutDialogTitle));
elements.aboutDialogClose.addEventListener("click", () => elements.aboutDialog.close());
elements.languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language, true));
});

configureTelegram();
applyLanguage(language);
generate();
scheduleUpdateCheck();
window.addEventListener("pageshow", scheduleUpdateCheck);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") scheduleUpdateCheck();
});
