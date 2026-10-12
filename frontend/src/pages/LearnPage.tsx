import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchCourse } from "../api/child";
import { KidHeader } from "../components/KidHeader";

/** A kid's home: the course as a winding path of lessons, unit by unit. */
export function LearnPage() {
  const course = useQuery({ queryKey: ["child", "course"], queryFn: fetchCourse });

  return (
    <main className="page">
      <KidHeader />
      {course.isLoading && <p className="hint">Loading…</p>}
      {course.isError && <p className="form-error">Couldn't load your lessons. Try again.</p>}
      {course.data?.map((unit, unitIndex) => (
        <section key={unit.id} className="unit">
          <h2 className="unit-banner">
            <span aria-hidden="true">{unit.emoji}</span> Unit {unitIndex + 1}: {unit.title}
          </h2>
          <ol className="lesson-path">
            {unit.lessons.map((lesson, i) => (
              <li
                key={lesson.id}
                className={`lesson-stop lesson-stop-${i % 4} lesson-${lesson.state}`}
              >
                {lesson.state === "locked" ? (
                  <span className="lesson-bubble" aria-hidden="true">
                    🔒
                  </span>
                ) : (
                  <Link
                    to={`/lesson/${lesson.id}`}
                    className="lesson-bubble"
                    aria-current={lesson.state === "current" ? "step" : undefined}
                    aria-label={`${lesson.state === "done" ? "Play again" : "Start"}: ${lesson.title}`}
                  >
                    <span aria-hidden="true">{lesson.state === "done" ? "✓" : unit.emoji}</span>
                  </Link>
                )}
                {lesson.state === "current" && <span className="lesson-start">Start</span>}
                <span className="lesson-title">
                  {lesson.title}
                  {lesson.state === "locked" && <span className="visually-hidden"> (locked)</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
