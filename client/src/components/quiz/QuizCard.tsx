import React from "react";
import { Link } from "react-router-dom";
import type { QuizSummary } from "../../types/api";
import { Button } from "../ui/Button";

export interface QuizCardProps {
  quiz: QuizSummary;
  onDelete: (quiz: QuizSummary) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz, onDelete }) => {
  const formattedDate = new Date(quiz.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-slate-900 line-clamp-1 hover:text-indigo-600 transition-colors">
            <Link to={`/quizzes/${quiz.id}/edit`}>{quiz.title}</Link>
          </h3>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {formattedDate}
          </span>
        </div>

        <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem] mb-4">
          {quiz.description || "No description provided."}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to={`/host/${quiz.id}`}>
            <Button variant="primary" size="sm" className="font-bold">
              Host Live 🚀
            </Button>
          </Link>
          <Link to={`/quizzes/${quiz.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(quiz)}
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        >
          Delete
        </Button>
      </div>
    </div>
  );
};
