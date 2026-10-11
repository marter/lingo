import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LearnPage } from "./pages/LearnPage";
import { LessonPage } from "./pages/LessonPage";
import { LoginPage } from "./pages/LoginPage";
import { ParentPage } from "./pages/ParentPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { WhoPage } from "./pages/WhoPage";
import { ChildRoute, FamilyRoute } from "./session/routes";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route element={<FamilyRoute />}>
        <Route path="/who" element={<WhoPage />} />
        <Route path="/parent" element={<ParentPage />} />
      </Route>
      <Route element={<ChildRoute />}>
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
