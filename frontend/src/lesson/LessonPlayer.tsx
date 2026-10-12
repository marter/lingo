import { useState } from "react";
import { ChoiceQuestion } from "./ChoiceQuestion";
import { LessonDone } from "./LessonDone";
import { MatchQuestion } from "./MatchQuestion";
import { WordIntro } from "./WordIntro";
import { buildQuestions } from "./questions";
import type { Question } from "./questions";
import { Sheet } from "../components/Sheet";
import type { Lesson, Word } from "../types";

type Feedback = { right: boolean; word?: Word };
type Step = { question: Question; key: string };

const CHEERS = ["Great job!", "You got it!", "Nice!", "Awesome!", "¡Muy bien!"];

/**
 * Runs one lesson: meet the new words (first time only), about ten questions, then the
 * finish screen. No hearts and no failing: a wrong answer shows the right one and that
 * question comes back at the end, until it's answered right.
 */
export function LessonPlayer({
  lesson,
  canListen,
  speak,
  onQuit,
}: {
  lesson: Lesson;
  canListen: boolean;
  speak: (text: string) => void;
  onQuit: () => void;
}) {
  const [questions] = useState(() => buildQuestions(lesson.words, canListen));
  const [phase, setPhase] = useState<"intro" | "questions" | "done">(
    lesson.completed ? "questions" : "intro",
  );
  const [queue, setQueue] = useState<Step[]>(() =>
    questions.map((question) => ({ question, key: question.id })),
  );
  const [missed, setMissed] = useState<Set<string>>(() => new Set());
  const [cleared, setCleared] = useState(0);
  const [picked, setPicked] = useState<Word | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const step = queue[0];
  const progress = phase === "intro" ? 0 : cleared / questions.length;

  function answer(right: boolean, word?: Word) {
    if (word) speak(word.es);
    if (!right) setMissed((m) => new Set(m).add(step.question.id));
    setFeedback({ right, word });
  }

  function next() {
    const [current, ...rest] = queue;
    if (feedback?.right) {
      setCleared((c) => c + 1);
      if (rest.length === 0) {
        setPhase("done");
        return;
      }
      setQueue(rest);
    } else {
      setQueue([...rest, { question: current.question, key: `${current.key}+` }]);
    }
    setPicked(null);
    setFeedback(null);
  }

  if (phase === "done") {
    return (
      <LessonDone
        lessonId={lesson.id}
        firstTryCorrect={questions.length - missed.size}
        questionCount={questions.length}
      />
    );
  }

  return (
    <div className="player">
      <div className="player-top">
        <button
          type="button"
          className="btn-icon"
          onClick={() => setConfirmQuit(true)}
          aria-label="Quit lesson"
        >
          ✕
        </button>
        <div
          className="progress"
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={cleared}
        >
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="player-body">
        {phase === "intro" ? (
          <WordIntro
            words={lesson.words}
            canListen={canListen}
            speak={speak}
            onDone={() => setPhase("questions")}
          />
        ) : step.question.kind === "match" ? (
          <MatchQuestion
            key={step.key}
            words={step.question.words}
            speak={speak}
            onDone={(mistakes) => {
              // Every pair is matched by the end, so this never comes back; slips only
              // keep it from counting as right the first time.
              if (mistakes > 0) setMissed((m) => new Set(m).add(step.question.id));
              setFeedback({ right: true });
            }}
          />
        ) : (
          <ChoiceQuestion
            key={step.key}
            question={step.question}
            picked={picked}
            speak={speak}
            onPick={(choice) => {
              setPicked(choice);
              if (step.question.kind !== "match") {
                answer(choice.id === step.question.word.id, step.question.word);
              }
            }}
          />
        )}
      </div>

      {feedback && <FeedbackBar feedback={feedback} isMatch={!feedback.word} onNext={next} />}

      {confirmQuit && (
        <Sheet title="Quit this lesson?" onClose={() => setConfirmQuit(false)}>
          <p>Your progress in this lesson won't be saved.</p>
          <div className="stack">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setConfirmQuit(false)}
            >
              Keep going
            </button>
            <button type="button" className="btn btn-ghost" onClick={onQuit}>
              Quit
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function FeedbackBar({
  feedback,
  isMatch,
  onNext,
}: {
  feedback: Feedback;
  isMatch: boolean;
  onNext: () => void;
}) {
  const [cheer] = useState(() => CHEERS[Math.floor(Math.random() * CHEERS.length)]);
  const { right, word } = feedback;
  return (
    <div className={`feedback ${right ? "feedback-right" : "feedback-wrong"}`} role="status">
      <div className="feedback-text">
        {right ? (
          <strong>
            {isMatch ? "All matched!" : cheer} <span aria-hidden="true">🎉</span>
          </strong>
        ) : (
          <>
            <strong>Not quite!</strong>
            {word && (
              <span>
                It's{" "}
                <span lang="es" className="feedback-word">
                  {word.es}
                </span>{" "}
                <span aria-hidden="true">{word.emoji}</span>
              </span>
            )}
          </>
        )}
      </div>
      {/* autoFocus so a keyboard or switch user lands on it right away */}
      <button type="button" className="btn btn-feedback" onClick={onNext} autoFocus>
        {right ? "Continue" : "Got it"}
      </button>
    </div>
  );
}
