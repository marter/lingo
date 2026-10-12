import { useEffect } from "react";
import type { Question } from "./questions";
import type { Word } from "../types";

type Choice = Extract<Question, { choices: Word[] }>;

const PROMPTS: Record<Choice["kind"], string> = {
  listen: "Tap what you hear",
  read: "Which picture is it?",
  picture: "What's this in Spanish?",
};

/**
 * One question with four choices. The kid's first tap is their answer; after that the
 * choices lock and show which one was right.
 */
export function ChoiceQuestion({
  question,
  picked,
  onPick,
  speak,
}: {
  question: Choice;
  picked: Word | null;
  onPick: (word: Word) => void;
  speak: (text: string) => void;
}) {
  const { kind, word, choices } = question;

  // Listening questions say the word as soon as they appear.
  useEffect(() => {
    if (kind === "listen") speak(word.es);
  }, [kind, word, speak]);

  function stateOf(choice: Word): string {
    if (!picked) return "";
    if (choice.id === word.id) return "is-right";
    if (choice.id === picked.id) return "is-wrong";
    return "is-dim";
  }

  return (
    <div className="question">
      <h1 className="question-prompt">{PROMPTS[kind]}</h1>

      <div className="question-subject">
        {kind === "listen" && (
          <button
            type="button"
            className="speaker-button"
            onClick={() => speak(word.es)}
            aria-label="Play the word again"
          >
            🔊
          </button>
        )}
        {kind === "read" && (
          <p className="question-word" lang="es">
            {word.es}
          </p>
        )}
        {kind === "picture" && (
          <p className="question-emoji" role="img" aria-label={word.en}>
            {word.emoji}
          </p>
        )}
      </div>

      <ul className={kind === "picture" ? "choices choices-words" : "choices"}>
        {choices.map((choice) => (
          <li key={choice.id}>
            <button
              type="button"
              className={`choice ${stateOf(choice)}`}
              disabled={picked !== null}
              onClick={() => onPick(choice)}
              aria-label={kind === "picture" ? undefined : choice.en}
              lang={kind === "picture" ? "es" : undefined}
            >
              {kind === "picture" ? choice.es : <span aria-hidden="true">{choice.emoji}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
