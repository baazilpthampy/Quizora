import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiClientError } from "../lib/api";
import type { QuizDetail, CreateOptionDto } from "../types/api";
import { QuestionCard } from "../components/question/QuestionCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Alert } from "../components/ui/Alert";
import { Modal } from "../components/ui/Modal";

export const EditQuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Quiz details modal / inline form
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // Add Question form
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newTimeLimit, setNewTimeLimit] = useState(20);
  const [newMaxPoints, setNewMaxPoints] = useState(1000);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [questionFormError, setQuestionFormError] = useState<string | null>(
    null,
  );

  // Delete Question state
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

  useEffect(() => {
    if (!id) return;
    let ignore = false;

    api.quizzes
      .get(id)
      .then((data) => {
        if (!ignore) {
          setQuiz(data);
          setQuizTitle(data.title);
          setQuizDesc(data.description || "");
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          if (err instanceof ApiClientError) {
            setError(err.message);
          } else {
            setError("Failed to load quiz definition.");
          }
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleSaveQuizDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!quizTitle.trim()) {
      setError("Quiz title is required.");
      return;
    }

    try {
      setIsSavingQuiz(true);
      setError(null);
      const updated = await api.quizzes.update(id, {
        title: quizTitle.trim(),
        description: quizDesc.trim() || null,
      });

      setQuiz((prev) =>
        prev
          ? {
              ...prev,
              title: updated.title,
              description: updated.description,
            }
          : null,
      );
      setIsEditingQuiz(false);
      setSuccessMessage("Quiz details updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update quiz");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !quiz) return;
    setQuestionFormError(null);

    if (!newQuestionText.trim()) {
      setQuestionFormError("Question text is required.");
      return;
    }
    if (newTimeLimit <= 0) {
      setQuestionFormError("Time limit must be positive.");
      return;
    }
    if (newMaxPoints <= 0) {
      setQuestionFormError("Points must be positive.");
      return;
    }

    try {
      setIsSubmittingQuestion(true);
      const currentQuestions = quiz.questions || [];
      const nextOrder =
        currentQuestions.length > 0
          ? Math.max(...currentQuestions.map((q) => q.order)) + 1
          : 1;

      // 1. Create the question
      const createdQuestion = await api.questions.create(id, {
        text: newQuestionText.trim(),
        order: nextOrder,
        timeLimitSeconds: Number(newTimeLimit),
        maxPoints: Number(newMaxPoints),
      });

      // 2. Pre-populate with two initial options (A and B) for smooth UX
      const optionA = await api.options.create(createdQuestion.id, {
        text: "Option A",
        order: 1,
        isCorrect: true, // First option marked correct by default
      });
      const optionB = await api.options.create(createdQuestion.id, {
        text: "Option B",
        order: 2,
        isCorrect: false,
      });

      createdQuestion.options = [optionA, optionB];

      setQuiz((prev) =>
        prev
          ? {
              ...prev,
              questions: [...prev.questions, createdQuestion],
            }
          : null,
      );

      // Reset form
      setNewQuestionText("");
      setNewTimeLimit(20);
      setNewMaxPoints(1000);
      setIsAddingQuestion(false);
      setSuccessMessage("Question added successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setQuestionFormError(
        err instanceof Error ? err.message : "Failed to add question",
      );
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const handleUpdateQuestion = async (
    questionId: string,
    updates: { text?: string; timeLimitSeconds?: number; maxPoints?: number },
  ) => {
    const updated = await api.questions.update(questionId, updates);
    setQuiz((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                ...updated,
                options: q.options, // maintain options array
              }
            : q,
        ),
      };
    });
  };

  const handleDeleteQuestionConfirm = async () => {
    if (!questionToDelete) return;
    try {
      setIsDeletingQuestion(true);
      await api.questions.delete(questionToDelete);
      setQuiz((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.filter((q) => q.id !== questionToDelete),
        };
      });
      setQuestionToDelete(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to delete question",
      );
    } finally {
      setIsDeletingQuestion(false);
    }
  };

  const handleAddOption = async (questionId: string, dto: CreateOptionDto) => {
    const newOpt = await api.options.create(questionId, dto);
    setQuiz((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === questionId
            ? { ...q, options: [...(q.options || []), newOpt] }
            : q,
        ),
      };
    });
  };

  const handleUpdateOption = async (
    optionId: string,
    updates: { text?: string; isCorrect?: boolean },
  ) => {
    const updatedOpt = await api.options.update(optionId, updates);
    setQuiz((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        questions: prev.questions.map((q) => ({
          ...q,
          options: (q.options || []).map((opt) =>
            opt.id === optionId ? { ...opt, ...updatedOpt } : opt,
          ),
        })),
      };
    });
  };

  const handleDeleteOption = async (optionId: string) => {
    await api.options.delete(optionId);
    setQuiz((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        questions: prev.questions.map((q) => ({
          ...q,
          options: (q.options || []).filter((opt) => opt.id !== optionId),
        })),
      };
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
        <div className="h-10 bg-slate-200 rounded w-1/2 animate-pulse"></div>
        <div className="h-40 bg-white rounded-xl border border-slate-200 p-6 animate-pulse"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Quiz Not Found
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested quiz could not be loaded or you do not have permission
          to view it.
        </p>
        <Link to="/quizzes">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const questions = quiz.questions || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Link */}
      <Link
        to="/quizzes"
        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 mb-6"
      >
        ← Back to My Quizzes
      </Link>

      {/* Notifications */}
      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}
      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          className="mb-6"
        />
      )}

      {/* Quiz Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-8">
        {isEditingQuiz ? (
          <form onSubmit={handleSaveQuizDetails} className="space-y-4">
            <Input
              label="Quiz Title"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              required
            />
            <Textarea
              label="Description"
              value={quizDesc}
              onChange={(e) => setQuizDesc(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingQuiz(false)}
                disabled={isSavingQuiz}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSavingQuiz}>
                Save Quiz Details
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {quiz.title}
                </h1>
                <button
                  onClick={() => setIsEditingQuiz(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
                >
                  ✎ Edit Details
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {quiz.description || "No description provided."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Questions
                </span>
                <span className="text-xl font-black text-indigo-600">
                  {questions.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Questions Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Quiz Questions</h2>
          <p className="text-xs text-slate-500">
            Configure multiple-choice questions, timers, and points.
          </p>
        </div>

        {!isAddingQuestion && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddingQuestion(true)}
          >
            + Add Question
          </Button>
        )}
      </div>

      {/* Add Question Card */}
      {isAddingQuestion && (
        <div className="bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200 p-6 mb-8">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            New Question
          </h3>

          <form onSubmit={handleAddQuestion} className="space-y-4">
            <Input
              label="Question Text *"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="e.g. In which year did the Apollo 11 moon landing occur?"
              autoFocus
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Time Limit (seconds)"
                type="number"
                min={5}
                max={300}
                value={newTimeLimit}
                onChange={(e) => setNewTimeLimit(Number(e.target.value))}
                required
              />
              <Input
                label="Max Points"
                type="number"
                min={100}
                max={10000}
                step={50}
                value={newMaxPoints}
                onChange={(e) => setNewMaxPoints(Number(e.target.value))}
                required
              />
            </div>

            {questionFormError && (
              <p className="text-xs text-rose-600 font-medium">
                {questionFormError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingQuestion(false)}
                disabled={isSubmittingQuestion}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingQuestion}
              >
                Add Question & Set Options
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
          <p className="text-slate-500 text-sm mb-4">
            This quiz has no questions yet.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddingQuestion(true)}
          >
            + Add Your First Question
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question, qIdx) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={qIdx}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={(qId) => setQuestionToDelete(qId)}
              onAddOption={handleAddOption}
              onUpdateOption={handleUpdateOption}
              onDeleteOption={handleDeleteOption}
            />
          ))}
        </div>
      )}

      {/* Delete Question Confirmation Modal */}
      <Modal
        isOpen={questionToDelete !== null}
        onClose={() => setQuestionToDelete(null)}
        title="Delete Question"
        confirmText="Delete Question"
        confirmVariant="danger"
        isConfirmLoading={isDeletingQuestion}
        onConfirm={handleDeleteQuestionConfirm}
      >
        <p>
          Are you sure you want to delete this question? Its options will also
          be permanently removed.
        </p>
      </Modal>
    </div>
  );
};
