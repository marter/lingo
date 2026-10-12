import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { completeLesson } from "../api/child";

/** The finish screen. Saves the result as soon as it appears; offers a retry if that fails. */
export function LessonDone({
  lessonId,
  firstTryCorrect,
  questionCount,
}: {
  lessonId: string;
  firstTryCorrect: number;
  questionCount: number;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      completeLesson(lessonId, {
        first_try_correct: firstTryCorrect,
        question_count: questionCount,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["child"] }),
  });
  const { mutate } = save;

  // Save once, even though StrictMode runs effects twice in development.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  const perfect = firstTryCorrect === questionCount;

  return (
    <main className="page page-center finish">
      <p className="done-emoji" aria-hidden="true">
        {perfect ? "🏆" : "🎉"}
      </p>
      <h1>Lesson complete!</h1>
      <p className="lead">
        {perfect
          ? "Every answer right the first time!"
          : `${firstTryCorrect} of ${questionCount} right the first time.`}
      </p>
      {save.isError ? (
        <>
          <p className="form-error">Couldn't save your lesson. Check the internet and try again.</p>
          <button type="button" className="btn btn-primary btn-wide" onClick={() => mutate()}>
            Try again
          </button>
        </>
      ) : (
        <Link
          to="/learn"
          className={`btn btn-primary btn-wide${save.isSuccess ? "" : " is-waiting"}`}
          aria-disabled={!save.isSuccess}
          onClick={(e) => {
            if (!save.isSuccess) e.preventDefault();
          }}
        >
          {save.isSuccess ? "Continue" : "Saving…"}
        </Link>
      )}
    </main>
  );
}
