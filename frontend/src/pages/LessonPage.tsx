import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchLesson } from "../api/child";
import { LessonPlayer } from "../lesson/LessonPlayer";
import { useSpanishVoice } from "../lesson/speech";

export function LessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const { status, speak } = useSpanishVoice();
  const lesson = useQuery({
    queryKey: ["child", "lesson", lessonId],
    queryFn: () => fetchLesson(lessonId),
    retry: false,
    // Questions are built once per play; don't refetch (and reshuffle) mid-lesson.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (lesson.isError) {
    const locked = isAxiosError(lesson.error) && lesson.error.response?.status === 403;
    return (
      <main className="page page-center-block">
        <p className="done-emoji" aria-hidden="true">
          {locked ? "🔒" : "🤔"}
        </p>
        <h1>{locked ? "Not yet!" : "Couldn't find that lesson"}</h1>
        {locked && <p className="lead">Finish the lessons before this one first.</p>}
        <Link to="/learn" className="btn btn-primary">
          Back to my lessons
        </Link>
      </main>
    );
  }

  // Wait for the voice check too, so we know whether to include listening questions.
  if (!lesson.data || status === "loading") {
    return (
      <main className="page page-center">
        <p className="hint">Loading…</p>
      </main>
    );
  }

  return (
    <LessonPlayer
      key={lesson.data.id}
      lesson={lesson.data}
      canListen={status === "ready"}
      speak={speak}
      onQuit={() => navigate("/learn")}
    />
  );
}
