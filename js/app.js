import {
  generateRandomWords,
  generateValidMnemonic,
} from "./generator.js";

const modes = {
  random: {
    button: "🎲 12 случайных слов",
    description: "12 независимых выборок из английского BIP-39 списка.",
    generate: generateRandomWords,
  },
  valid: {
    button: "🔐 12 валидных BIP-39",
    description: "128 бит энтропии + SHA-256 checksum. Только для развлечения.",
    generate: generateValidMnemonic,
  },
};

let currentMode = "random";
let currentWords = [];

const elements = {
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  description: document.querySelector("#mode-description"),
  words: document.querySelector("#words"),
  more: document.querySelector("#more-button"),
  copy: document.querySelector("#copy-button"),
  toast: document.querySelector("#toast"),
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
  if (theme.secondary_bg_color) {
    root.style.setProperty("--tg-surface", theme.secondary_bg_color);
  }
}

function render() {
  elements.description.textContent = modes[currentMode].description;
  elements.modeButtons.forEach((button) => {
    const selected = button.dataset.mode === currentMode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

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

async function generate() {
  elements.more.disabled = true;
  elements.more.textContent = "Генерируем…";

  try {
    currentWords = await modes[currentMode].generate();
    render();
  } catch {
    elements.description.textContent = "Web Crypto API недоступен в этом браузере.";
  } finally {
    elements.more.disabled = false;
    elements.more.textContent = "🎲 Ещё";
  }
}

async function copyWords() {
  if (!currentWords.length) return;

  const phrase = currentWords.join(" ");
  let copied = false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(phrase);
      copied = true;
    }
  } catch {
    copied = false;
  }

  if (!copied) {
    const textarea = document.createElement("textarea");
    textarea.value = phrase;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    copied = document.execCommand("copy");
    textarea.remove();
  }

  if (!copied) {
    elements.description.textContent = "Не удалось скопировать — выделите слова вручную.";
    return;
  }

  elements.toast.classList.add("is-visible");
  window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    currentMode = button.dataset.mode;
    await generate();
  });
});

elements.more.addEventListener("click", generate);
elements.copy.addEventListener("click", copyWords);

configureTelegram();
generate();
