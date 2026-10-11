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
              <li key={lesson.id} className={`lesson-stop lesson-stop-${i % 4}`}>
                <Link to={`/lesson/${lesson.id}`} className="lesson-bubble">
                  <span aria-hidden="true">{unit.emoji}</span>
                  <span className="visually-hidden">Start</span>
                </Link>
                <span className="lesson-title">{lesson.title}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
