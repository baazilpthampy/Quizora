import React, { useState } from "react";
import type { QuestionDetail, CreateOptionDto } from "../../types/api";
import { OptionItem } from "./OptionItem";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";

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
  const [optionError, setOptionError] = useState<string | null>(null);

  const options = question.options || [];
  const hasMinOptions = options.length >= 2;
  const hasMaxOptions = options.length >= 6;
  const hasCorrectAnswer = options.some((opt) => opt.isCorrect);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError(null);

    if (!editText.trim()) {
      setQuestionError("Question text is required.");
      return;
    }
    if (editTimeLimit <= 0) {
      setQuestionError("Time limit must be greater than 0.");
      return;
    }
    if (editMaxPoints <= 0) {
      setQuestionError("Maximum points must be greater than 0.");
      return;
    }

    try {
      setIsSavingQuestion(true);
      await onUpdateQuestion(question.id, {
        text: editText.trim(),
        timeLimitSeconds: Number(editTimeLimit),
        maxPoints: Number(editMaxPoints),
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setQuestionError(
        err instanceof Error ? err.message : "Failed to update question",
      );
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleAddOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOptionError(null);

    if (!newOptionText.trim()) {
      setOptionError("Option text is required.");
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
      // If this is the very first option added, make it correct by default
      const isFirst = options.length === 0;

      await onAddOption(question.id, {
        text: newOptionText.trim(),
        order: nextOrder,
        isCorrect: isFirst,
      });
      setNewOptionText("");
    } catch (err: unknown) {
      setOptionError(
        err instanceof Error ? err.message : "Failed to add option",
      );
    } finally {
      setIsAddingOption(false);
    }
  };

  // Ensure single correct answer: mark selected true and other currently-correct options false
  const handleSelectCorrectOption = async (selectedOptionId: string) => {
    try {
      for (const opt of options) {
        if (opt.id === selectedOptionId && !opt.isCorrect) {
          await onUpdateOption(opt.id, { isCorrect: true });
        } else if (opt.id !== selectedOptionId && opt.isCorrect) {
          await onUpdateOption(opt.id, { isCorrect: false });
        }
      }
    } catch (err: unknown) {
      setOptionError(
        err instanceof Error ? err.message : "Failed to update correct option",
      );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      {/* Question Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              Q{index + 1}
            </span>
            <Badge variant="info">{question.timeLimitSeconds}s Timer</Badge>
            <Badge variant="default">{question.maxPoints} Points</Badge>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditText(question.text);
                  setEditTimeLimit(question.timeLimitSeconds);
                  setEditMaxPoints(question.maxPoints);
                  setIsEditing(true);
                }}
              >
                Edit Question
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteQuestion(question.id)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Question Text / Inline Edit */}
        {isEditing ? (
          <form onSubmit={handleSaveQuestion} className="space-y-3 mt-3">
            <Input
              label="Question Text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="e.g. What is the powerhouse of the cell?"
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
                onClick={() => setIsEditing(false)}
                disabled={isSavingQuestion}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSavingQuestion}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <h4 className="text-base font-semibold text-slate-900 mt-1">
            {question.text}
          </h4>
        )}
      </div>

      {/* Options Section */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Multiple Choice Options ({options.length}/6)
            </h5>
          </div>
          <span className="text-xs text-slate-400">
            Click circle to mark correct answer
          </span>
        </div>

        {/* Validation warnings */}
        {!hasMinOptions && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <span>⚠️</span>
            <span>A question must have at least 2 options.</span>
          </div>
        )}

        {hasMinOptions && !hasCorrectAnswer && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <span>⚠️</span>
            <span>Please select a correct answer for this question.</span>
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
                onChange={(e) => setNewOptionText(e.target.value)}
                placeholder={`Add option ${["A", "B", "C", "D", "E", "F"][options.length] || ""}...`}
                className="flex-1 text-sm rounded-lg border border-slate-300 px-3 py-2 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                isLoading={isAddingOption}
                disabled={!newOptionText.trim()}
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
            Maximum limit of 6 options reached.
          </p>
        )}
      </div>
    </div>
  );
};
