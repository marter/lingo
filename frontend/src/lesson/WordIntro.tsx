import { useEffect, useState } from "react";
import type { Word } from "../types";

/** "Meet the words": one card at a time, each said out loud, before the first play. */
export function WordIntro({
  words,
  canListen,
  speak,
  onDone,
}: {
  words: Word[];
  canListen: boolean;
  speak: (text: string) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const word = words[index];
  const last = index === words.length - 1;

  useEffect(() => {
    speak(word.es);
  }, [word, speak]);

  return (
    <div className="question intro">
      <p className="hint">
        New word {index + 1} of {words.length}
      </p>
      <div className="intro-card" key={word.id}>
        <span className="intro-emoji" aria-hidden="true">
          {word.emoji}
        </span>
        <span className="intro-es" lang="es">
          {word.es}
        </span>
        <span className="intro-en">{word.en}</span>
        {canListen && (
          <button
            type="button"
            className="speaker-button speaker-button-small"
            onClick={() => speak(word.es)}
            aria-label={`Hear ${word.es} again`}
          >
            🔊
          </button>
        )}
      </div>
      <div className="player-actions">
        <button
          type="button"
          className="btn btn-primary btn-wide"
          onClick={() => (last ? onDone() : setIndex(index + 1))}
        >
          {last ? "Let's play!" : "Next"}
        </button>
      </div>
    </div>
  );
}
