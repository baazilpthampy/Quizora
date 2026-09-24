import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import type { QuizSummary } from "../types/api";
import { QuizCard } from "../components/quiz/QuizCard";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Alert } from "../components/ui/Alert";

export const DashboardPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [quizToDelete, setQuizToDelete] = useState<QuizSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    api.quizzes
      .list()
      .then((data) => {
        if (!ignore) {
          setQuizzes(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(getErrorMessage(err));
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!quizToDelete) return;

    try {
      setIsDeleting(true);
      await api.quizzes.delete(quizToDelete.id);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete.id));
      setQuizToDelete(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Teacher Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, configure, and manage your interactive classroom quizzes.
          </p>
        </div>

        <Link to="/quizzes/new">
          <Button variant="primary">
            <span>+</span> Create New Quiz
          </Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          title="Notice"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="h-5 bg-slate-200 rounded w-2/3"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-4/5"></div>
              <div className="h-8 bg-slate-100 rounded mt-4"></div>
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            💡
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            No quizzes yet
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            Get started by creating your first interactive quiz for your
            students.
          </p>
          <Link to="/quizzes/new">
            <Button variant="primary">+ Create Your First Quiz</Button>
          </Link>
        </div>
      ) : (
        /* Quiz Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onDelete={(q) => setQuizToDelete(q)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={quizToDelete !== null}
        onClose={() => setQuizToDelete(null)}
        title="Delete Quiz"
        confirmText="Yes, Delete Quiz"
        confirmVariant="danger"
        isConfirmLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      >
        <p>
          Are you sure you want to delete{" "}
          <strong className="text-slate-900 font-semibold">
            "{quizToDelete?.title}"
          </strong>
          ? All associated questions and options will be permanently removed.
        </p>
      </Modal>
    </div>
  );
};
