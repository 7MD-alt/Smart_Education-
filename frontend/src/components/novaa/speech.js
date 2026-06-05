// ─────────────────────────────────────────────────────────────────────────────
// Browser text-to-speech for NOVAA answers — free, built-in Web Speech API.
// No keys, no network, works offline.
// ─────────────────────────────────────────────────────────────────────────────

export const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

/** Strip markdown / code so the spoken text sounds natural. */
function cleanForSpeech(text) {
  return (text || "")
    .replace(/```[\s\S]*?```/g, " (bloc de code) ")   // code fences
    .replace(/`([^`]+)`/g, "$1")                       // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1")                 // bold
    .replace(/[*_#>|]/g, " ")                          // md symbols
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")                // links → label
    .replace(/\s+/g, " ")
    .trim();
}

/** Naive language guess so we pick a matching voice (fr vs en). */
function guessLang(text) {
  const fr = /[àâçéèêëîïôûùü]|(?:\b(?:le|la|les|une?|des|est|vous|pour|avec|votre|séance|étudiant)\b)/i;
  return fr.test(text || "") ? "fr" : "en";
}

let _voices = [];
function loadVoices() {
  if (!speechSupported) return;
  _voices = window.speechSynthesis.getVoices() || [];
}
if (speechSupported) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoice(lang) {
  if (!_voices.length) loadVoices();
  // Prefer a higher-quality / native voice for the language
  return (
    _voices.find(v => v.lang?.toLowerCase().startsWith(lang) && /natural|google|enhanced/i.test(v.name)) ||
    _voices.find(v => v.lang?.toLowerCase().startsWith(lang)) ||
    null
  );
}

/** Speak the given text. Returns true if it started. */
export function speak(text, { onEnd } = {}) {
  if (!speechSupported) return false;
  window.speechSynthesis.cancel();              // stop anything in progress
  const clean = cleanForSpeech(text);
  if (!clean) return false;

  const u    = new SpeechSynthesisUtterance(clean);
  const lang = guessLang(clean);
  const v    = pickVoice(lang);
  if (v) u.voice = v;
  u.lang  = lang === "fr" ? "fr-FR" : "en-US";
  u.rate  = 1.02;
  u.pitch = 1.0;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  window.speechSynthesis.speak(u);
  return true;
}

/** Stop any current speech. */
export function stopSpeaking() {
  if (speechSupported) window.speechSynthesis.cancel();
}
