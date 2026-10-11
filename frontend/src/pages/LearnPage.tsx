import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchChildMe } from "../api/child";
import { isUnauthorized } from "../api/client";
import { useSession } from "../session/SessionContext";

/** A kid's home. Lessons arrive in a later step; for now it just greets them. */
export function LearnPage() {
  const { endChild } = useSession();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["child", "me"], queryFn: fetchChildMe, retry: false });

  // Expired, or the profile was removed: end the session and ChildRoute shows the picker.
  const expired = me.isError && isUnauthorized(me.error);
  useEffect(() => {
    if (expired) endChild();
  }, [expired, endChild]);

  function switchKid() {
    endChild();
    navigate("/who");
  }

  return (
    <main className="page">
      <header className="kid-header">
        <span className="kid-header-avatar" aria-hidden="true">
          {me.data?.avatar}
        </span>
        <span className="kid-header-name">{me.data?.nickname}</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={switchKid}>
          Switch
        </button>
      </header>
      {me.data && (
        <section className="page-center-block">
          <div className="mascot" aria-hidden="true">
            🦜
          </div>
          <h1>¡Hola, {me.data.nickname}!</h1>
          <p className="lead">Your first Spanish lessons are on their way. 🎒</p>
        </section>
      )}
    </main>
  );
}
