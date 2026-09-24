import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export const CreateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field validation errors
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(null);
    setError(null);

    // Client-side validation matching backend Zod schema
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Quiz title is required.");
      return;
    }
    if (trimmedTitle.length > 100) {
      setTitleError("Quiz title cannot exceed 100 characters.");
      return;
    }
    if (description.length > 500) {
      setError("Description cannot exceed 500 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const newQuiz = await api.quizzes.create({
        title: trimmedTitle,
        description: description.trim() || undefined,
      });

      // Navigate to editor to add questions
      navigate(`/quizzes/${newQuiz.id}/edit`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb / Back link */}
      <Link
        to="/quizzes"
        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 mb-6"
      >
        ← Back to Quizzes
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Create a New Quiz
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Give your quiz a title and an optional description to get started.
          </p>
        </div>

        {error && (
          <Alert
            type="error"
            title="Unable to create quiz"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Quiz Title *"
            value={title}
            maxLength={100}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            placeholder="e.g. World Geography & History"
            error={titleError || undefined}
            helperText={`${title.length}/100 characters`}
            autoFocus
            required
          />

          <Textarea
            label="Description (Optional)"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview or instructions for your students..."
            rows={4}
            helperText={`${description.length}/500 characters`}
          />

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link to="/quizzes">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create & Add Questions →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
