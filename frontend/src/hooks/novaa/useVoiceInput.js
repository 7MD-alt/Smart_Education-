import { useState, useRef, useEffect } from "react";

/**
 * Encapsulates the Web Speech API lifecycle for voice-to-text input.
 *
 * Key correctness decisions:
 *  - `accumulatedFinal` is a closure variable (not state) so it persists
 *    across multiple onresult events without triggering renders.
 *  - `baseline` is snapshotted at recognition.start() time so the final
 *    output is always `baseline + accumulated finals + current interim`.
 *  - Cleanup on unmount calls `abort()` to prevent zombie recognition sessions.
 *
 * @param {string}   inputValue   - current textarea value (read at start time)
 * @param {Function} setInputValue - setter so transcripts are written into input
 * @param {React.RefObject} inputRef - textarea ref for post-recording focus
 */
export function useVoiceInput(inputValue, setInputValue, inputRef) {
  const [isListening,    setIsListening]    = useState(false);
  const [speechLang,     setSpeechLang]     = useState("fr-FR");
  const [speechSupported] = useState(() =>
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const speechRef = useRef(null);

  // Abort on unmount — prevents recognition from firing into an unmounted tree
  useEffect(() => () => speechRef.current?.abort(), []);

  const toggleListening = () => {
    if (!speechSupported) return;

    if (isListening) {
      speechRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR          = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang             = speechLang;
    recognition.continuous       = true;
    recognition.interimResults   = true;
    recognition.maxAlternatives  = 1;

    // Snapshot at start — not reactive to subsequent input changes
    const baseline = inputValue;
    let accumulatedFinal = "";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      let newFinal = "";
      let interim  = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) newFinal += t;
        else interim += t;
      }
      if (newFinal) accumulatedFinal += newFinal + " ";
      setInputValue((baseline + " " + (accumulatedFinal + interim)).trimStart());
    };

    recognition.onerror = (e) => {
      const msgs = {
        "not-allowed":      "Microphone access denied. Please allow mic in your browser settings.",
        "network":          "Speech recognition network error. Check your connection and try again.",
        "audio-capture":    "No microphone detected. Please connect a microphone and try again.",
        "service-not-allowed": "Speech recognition is not allowed in this context (requires HTTPS).",
      };
      if (msgs[e.error]) alert(msgs[e.error]);
      // "no-speech" and "aborted" are expected — stop silently
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => inputRef?.current?.focus(), 50);
    };

    speechRef.current = recognition;
    recognition.start();
  };

  return { isListening, speechLang, setSpeechLang, speechSupported, toggleListening };
}
