import React from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const devUserId = api.getDevUserId();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-xs group-hover:bg-indigo-700 transition-colors">
              Q
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                Quizora
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 -mt-1">
                Teacher Dashboard
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/quizzes"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === "/quizzes" || location.pathname === "/"
                  ? "bg-slate-100 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              My Quizzes
            </Link>
            <Link
              to="/quizzes/new"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === "/quizzes/new"
                  ? "bg-slate-100 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              + Create Quiz
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/play"
            className="text-xs font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <span>🎮</span> Join Game
          </Link>

          {devUserId ? (
            <div
              className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5"
              title={`Logged in as Dev User ID: ${devUserId}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span className="hidden sm:inline">Teacher:</span>
              <span className="font-mono text-[11px] truncate max-w-[90px] sm:max-w-[120px]">
                {devUserId}
              </span>
            </div>
          ) : (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full font-medium">
              ⚠️ No VITE_DEV_USER_ID configured
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
