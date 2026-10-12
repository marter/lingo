import { useState } from "react";
import { shuffle } from "./questions";
import type { Word } from "../types";

type Side = "es" | "pic";

/**
 * Spanish words on the left, pictures on the right. Tap one from each side to pair them;
 * a wrong pair wiggles and lets go. Calls onDone once everything is matched.
 */
export function MatchQuestion({
  words,
  onDone,
  speak,
}: {
  words: Word[];
  onDone: (mistakes: number) => void;
  speak: (text: string) => void;
}) {
  const [left] = useState(() => shuffle(words));
  const [right] = useState(() => shuffle(words));
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [wrong, setWrong] = useState<{ es: string; pic: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  function tap(side: Side, word: Word) {
    if (matched.has(word.id)) return;
    setWrong(null);
    if (side === "es") speak(word.es);
    if (!selected || selected.side === side) {
      setSelected({ side, id: word.id });
      return;
    }
    if (selected.id === word.id) {
      const next = new Set(matched).add(word.id);
      setMatched(next);
      setSelected(null);
      if (side === "pic") speak(word.es);
      if (next.size === words.length) onDone(mistakes);
    } else {
      setWrong(side === "es" ? { es: word.id, pic: selected.id } : { es: selected.id, pic: word.id });
      setMistakes((m) => m + 1);
      setSelected(null);
    }
  }

  function stateOf(side: Side, word: Word): string {
    if (matched.has(word.id)) return "is-matched";
    if (wrong && wrong[side] === word.id) return "is-wrong wiggle";
    if (selected?.side === side && selected.id === word.id) return "is-selected";
    return "";
  }

  return (
    <div className="question">
      <h1 className="question-prompt">Match the pairs</h1>
      <div className="match-grid">
        <ul className="match-column">
          {left.map((word) => (
            <li key={word.id}>
              <button
                type="button"
                className={`choice choice-word ${stateOf("es", word)}`}
                disabled={matched.has(word.id)}
                aria-pressed={selected?.side === "es" && selected.id === word.id}
                onClick={() => tap("es", word)}
                lang="es"
              >
                {word.es}
              </button>
            </li>
          ))}
        </ul>
        <ul className="match-column">
          {right.map((word) => (
            <li key={word.id}>
              <button
                type="button"
                className={`choice choice-pic ${stateOf("pic", word)}`}
                disabled={matched.has(word.id)}
                aria-pressed={selected?.side === "pic" && selected.id === word.id}
                aria-label={word.en}
                onClick={() => tap("pic", word)}
              >
                <span aria-hidden="true">{word.emoji}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
