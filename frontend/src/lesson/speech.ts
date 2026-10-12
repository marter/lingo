import { useCallback, useEffect, useState } from "react";

/**
 * Spanish audio from the browser's own text-to-speech: free, works offline, and nothing
 * leaves the device. Voices differ per device, so we prefer Mexican Spanish, then US
 * Spanish, then any Spanish voice, and report "none" if there isn't one.
 */
const PREFERRED = ["es-MX", "es-US", "es-419"];
const RATE = 0.85; // a little slower than normal, for kids

// Voices load asynchronously (Chrome fires `voiceschanged`; Safari often has them at once).
// If nothing shows up within this long, we treat the device as having no Spanish voice.
const VOICE_WAIT_MS = 1500;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const spanish = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("es"));
  for (const lang of PREFERRED) {
    const match = spanish.find((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
    if (match) return match;
  }
  return spanish[0] ?? null;
}

export type SpeechStatus = "loading" | "ready" | "unavailable";

export function useSpanishVoice() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() =>
    synth ? pickVoice(synth.getVoices()) : null,
  );
  const [timedOut, setTimedOut] = useState(!synth);

  useEffect(() => {
    if (!synth || voice) return;
    const update = () => {
      const found = pickVoice(synth.getVoices());
      if (found) setVoice(found);
    };
    synth.addEventListener("voiceschanged", update);
    const timer = window.setTimeout(() => setTimedOut(true), VOICE_WAIT_MS);
    return () => {
      synth.removeEventListener("voiceschanged", update);
      window.clearTimeout(timer);
    };
  }, [synth, voice]);

  // Stop talking when the lesson closes.
  useEffect(() => () => synth?.cancel(), [synth]);

  const speak = useCallback(
    (text: string) => {
      if (!synth || !voice) return;
      synth.cancel(); // a fresh tap interrupts, instead of queueing up repeats
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = RATE;
      synth.speak(utterance);
    },
    [synth, voice],
  );

  const status: SpeechStatus = voice ? "ready" : timedOut ? "unavailable" : "loading";
  return { status, speak };
}
