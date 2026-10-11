import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchLesson } from "../api/child";

/**
 * For now: "meet the words", one card per word. The lesson player (exercises, audio)
 * replaces this in the next step.
 */
export function LessonPage() {
  const { lessonId = "" } = useParams();
  const lesson = useQuery({
    queryKey: ["child", "lesson", lessonId],
    queryFn: () => fetchLesson(lessonId),
  });

  return (
    <main className="page">
      <Link to="/learn" className="back-link">
        ‹ Back
      </Link>
      {lesson.isError && <p className="form-error">Couldn't find that lesson.</p>}
      {lesson.data && (
        <>
          <p className="hint">{lesson.data.unit_title}</p>
          <h1>{lesson.data.title}</h1>
          <p className="lead">Meet the words!</p>
          <ul className="word-cards">
            {lesson.data.words.map((word) => (
              <li key={word.id} className="word-card">
                <span className="word-card-emoji" aria-hidden="true">
                  {word.emoji}
                </span>
                <span className="word-card-es" lang="es">
                  {word.es}
                </span>
                <span className="word-card-en">{word.en}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
