import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateQuizPage } from "./pages/CreateQuizPage";
import { EditQuizPage } from "./pages/EditQuizPage";
import { HostGamePage } from "./pages/HostGamePage";
import { PlayGamePage } from "./pages/PlayGamePage";
import "./index.css";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/quizzes" replace />} />
            <Route path="/quizzes" element={<DashboardPage />} />
            <Route path="/quizzes/new" element={<CreateQuizPage />} />
            <Route path="/quizzes/:id/edit" element={<EditQuizPage />} />
            <Route path="/host/:quizId" element={<HostGamePage />} />
            <Route path="/play" element={<PlayGamePage />} />
            <Route path="/join" element={<Navigate to="/play" replace />} />
            <Route path="*" element={<Navigate to="/quizzes" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
