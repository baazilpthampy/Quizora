import React, { useState } from "react";
import type { QuestionDetail, CreateOptionDto } from "../../types/api";
import { OptionItem } from "./OptionItem";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { getErrorMessage } from "../../lib/api";

export interface QuestionCardProps {
  question: QuestionDetail;
  index: number;
  onUpdateQuestion: (
    questionId: string,
    updates: { text?: string; timeLimitSeconds?: number; maxPoints?: number },
  ) => Promise<void>;
  onDeleteQuestion: (questionId: string) => void | Promise<void>;
  onAddOption: (questionId: string, dto: CreateOptionDto) => Promise<void>;
  onUpdateOption: (
    optionId: string,
    updates: { text?: string; isCorrect?: boolean },
  ) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const [editTimeLimit, setEditTimeLimit] = useState(question.timeLimitSeconds);
  const [editMaxPoints, setEditMaxPoints] = useState(question.maxPoints);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // New option state
  const [newOptionText, setNewOptionText] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isUpdatingCorrect, setIsUpdatingCorrect] = useState(false);
  const [optionError, setOptionError] = useState<string | null>(null);

  // Ensure deterministic option ordering
  const options = (question.options || [])
    .slice()
    .sort((a, b) => a.order - b.order);
  const hasMinOptions = options.length >= 2;
  const hasMaxOptions = options.length >= 6;
  const hasCorrectAnswer = options.some((opt) => opt.isCorrect);
  const isQuestionReady =
    hasMinOptions && hasCorrectAnswer && question.text.trim().length > 0;

  const handleStartEdit = () => {
    setEditText(question.text);
    setEditTimeLimit(question.timeLimitSeconds);
    setEditMaxPoints(question.maxPoints);
    setQuestionError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditText(question.text);
    setEditTimeLimit(question.timeLimitSeconds);
    setEditMaxPoints(question.maxPoints);
    setQuestionError(null);
    setIsEditing(false);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError(null);

    const trimmedText = editText.trim();
    if (!trimmedText) {
      setQuestionError("Question text is required.");
      return;
    }
    if (trimmedText.length > 500) {
      setQuestionError("Question text cannot exceed 500 characters.");
      return;
    }
    if (editTimeLimit < 5 || editTimeLimit > 300) {
      setQuestionError("Time limit must be between 5 and 300 seconds.");
      return;
    }
    if (editMaxPoints < 100 || editMaxPoints > 10000) {
      setQuestionError("Maximum points must be between 100 and 10,000.");
      return;
    }

    try {
      setIsSavingQuestion(true);
      await onUpdateQuestion(question.id, {
        text: trimmedText,
        timeLimitSeconds: Number(editTimeLimit),
        maxPoints: Number(editMaxPoints),
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setQuestionError(getErrorMessage(err));
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleAddOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOptionError(null);

    const trimmedText = newOptionText.trim();
    if (!trimmedText) {
      setOptionError("Option text cannot be empty.");
      return;
    }
    if (trimmedText.length > 200) {
      setOptionError("Option text cannot exceed 200 characters.");
      return;
    }
    if (hasMaxOptions) {
      setOptionError("Questions support a maximum of 6 options.");
      return;
    }

    try {
      setIsAddingOption(true);
      const nextOrder =
        options.length > 0 ? Math.max(...options.map((o) => o.order)) + 1 : 1;
      // If no correct answer exists yet, set this one as correct
      const shouldBeCorrect = options.length === 0 || !hasCorrectAnswer;

      await onAddOption(question.id, {
        text: trimmedText,
        order: nextOrder,
        isCorrect: shouldBeCorrect,
      });
      setNewOptionText("");
    } catch (err: unknown) {
      setOptionError(getErrorMessage(err));
    } finally {
      setIsAddingOption(false);
    }
  };

  // Ensure single correct answer: mark selected true and other currently-correct options false
  const handleSelectCorrectOption = async (selectedOptionId: string) => {
    if (isUpdatingCorrect) return;
    try {
      setIsUpdatingCorrect(true);
      setOptionError(null);

      const updates: Promise<void>[] = [];
      for (const opt of options) {
        if (opt.id === selectedOptionId && !opt.isCorrect) {
          updates.push(onUpdateOption(opt.id, { isCorrect: true }));
        } else if (opt.id !== selectedOptionId && opt.isCorrect) {
          updates.push(onUpdateOption(opt.id, { isCorrect: false }));
        }
      }
      await Promise.all(updates);
    } catch (err: unknown) {
      setOptionError(getErrorMessage(err));
    } finally {
      setIsUpdatingCorrect(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      {/* Question Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              Q{index + 1}
            </span>
            <Badge variant="info">{question.timeLimitSeconds}s Timer</Badge>
            <Badge variant="default">{question.maxPoints} pts</Badge>

            {/* Live Readiness Indicator */}
            {isQuestionReady ? (
              <Badge variant="success">✓ Ready</Badge>
            ) : !hasMinOptions ? (
              <Badge variant="warning">⚠️ Needs 2+ Options</Badge>
            ) : !hasCorrectAnswer ? (
              <Badge variant="warning">⚠️ Needs Correct Answer</Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                aria-label={`Edit Question ${index + 1}`}
              >
                Edit Question
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDeleteQuestion(question.id)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              aria-label={`Delete Question ${index + 1}`}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Question Text / Inline Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveQuestion} className="space-y-3 mt-3">
            <Input
              label="Question Text *"
              value={editText}
              maxLength={500}
              onChange={(e) => {
                setEditText(e.target.value);
                if (questionError) setQuestionError(null);
              }}
              placeholder="e.g. What is the powerhouse of the cell?"
              disabled={isSavingQuestion}
              helperText={`${editText.length}/500 characters`}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Time Limit (seconds)"
                type="number"
                min={5}
                max={300}
                value={editTimeLimit}
                onChange={(e) => setEditTimeLimit(Number(e.target.value))}
                disabled={isSavingQuestion}
                helperText="5 – 300 seconds"
                required
              />
              <Input
                label="Max Points"
                type="number"
                min={100}
                max={10000}
                step={50}
                value={editMaxPoints}
                onChange={(e) => setEditMaxPoints(Number(e.target.value))}
                disabled={isSavingQuestion}
                helperText="100 – 10,000 points"
                required
              />
            </div>

            {questionError && (
              <p className="text-xs text-rose-600 font-medium">
                {questionError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSavingQuestion}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSavingQuestion}
                disabled={!editText.trim()}
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <h4 className="text-base font-semibold text-slate-900 mt-1 break-words">
            {question.text}
          </h4>
        )}
      </div>

      {/* Options Section */}
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Multiple Choice Options ({options.length}/6)
          </h5>
          <span className="text-xs text-slate-400">
            Click circle to designate correct answer
          </span>
        </div>

        {/* Validation warnings */}
        {!hasMinOptions && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <span>⚠️</span>
            <span>
              A question must have at least 2 options for students to answer.
            </span>
          </div>
        )}

        {hasMinOptions && !hasCorrectAnswer && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <span>⚠️</span>
            <span>
              Please select a correct answer by clicking one of the option
              letters.
            </span>
          </div>
        )}

        {/* Options List */}
        <div className="space-y-2">
          {options.map((option, optIdx) => (
            <OptionItem
              key={option.id}
              option={option}
              index={optIdx}
              onSetCorrect={handleSelectCorrectOption}
              onUpdateText={(optionId, newText) =>
                onUpdateOption(optionId, { text: newText })
              }
              onDelete={onDeleteOption}
              isOnlyOption={options.length <= 1}
              disabled={isUpdatingCorrect}
            />
          ))}
        </div>

        {/* Add Option Form */}
        {!hasMaxOptions ? (
          <form onSubmit={handleAddOptionSubmit} className="pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newOptionText}
                maxLength={200}
                onChange={(e) => {
                  setNewOptionText(e.target.value);
                  if (optionError) setOptionError(null);
                }}
                disabled={isAddingOption}
                placeholder={`Add option ${["A", "B", "C", "D", "E", "F"][options.length] || ""}...`}
                className="flex-1 text-sm rounded-lg border border-slate-300 px-3 py-2 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                isLoading={isAddingOption}
                disabled={!newOptionText.trim() || isAddingOption}
              >
                + Add Option
              </Button>
            </div>
            {optionError && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {optionError}
              </p>
            )}
          </form>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Maximum limit of 6 options reached for this question.
          </p>
        )}
      </div>
    </div>
  );
};
