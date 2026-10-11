import { useQuery } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { getHealth } from "./api/health";

function HomePage() {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, retry: false });

  return (
    <main className="page page-center">
      <div className="mascot" aria-hidden="true">🦜</div>
      <h1>¡Hola! I'm Lingo.</h1>
      <p className="lead">Short, playful Spanish lessons for kids. Coming soon!</p>
      <p className="status">
        {health.isLoading && "Checking the server…"}
        {health.isSuccess && "✅ Server is up"}
        {health.isError && "⚠️ Can't reach the server"}
      </p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
