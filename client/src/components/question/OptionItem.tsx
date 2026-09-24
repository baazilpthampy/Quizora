import React, { useState } from "react";
import type { OptionDetail } from "../../types/api";

export interface OptionItemProps {
  option: OptionDetail;
  index: number;
  onSetCorrect: (optionId: string) => Promise<void> | void;
  onUpdateText: (optionId: string, newText: string) => Promise<void>;
  onDelete: (optionId: string) => Promise<void>;
  isOnlyOption?: boolean;
  disabled?: boolean;
}

export const OptionItem: React.FC<OptionItemProps> = ({
  option,
  index,
  onSetCorrect,
  onUpdateText,
  onDelete,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(option.text);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingCorrect, setIsSettingCorrect] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const letter = optionLetters[index] || `${index + 1}`;

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setEditError("Option text cannot be empty.");
      return;
    }
    if (trimmed.length > 200) {
      setEditError("Option text cannot exceed 200 characters.");
      return;
    }
    if (trimmed === option.text) {
      setIsEditing(false);
      setEditError(null);
      return;
    }

    try {
      setIsSaving(true);
      setEditError(null);
      await onUpdateText(option.id, trimmed);
      setIsEditing(false);
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : "Failed to save option",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setText(option.text);
    setIsEditing(false);
    setEditError(null);
  };

  const handleToggleCorrect = async () => {
    if (disabled || isSettingCorrect) return;
    try {
      setIsSettingCorrect(true);
      await onSetCorrect(option.id);
    } finally {
      setIsSettingCorrect(false);
    }
  };

  const handleDelete = async () => {
    if (disabled || isDeleting) return;
    try {
      setIsDeleting(true);
      await onDelete(option.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
        option.isCorrect
          ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/40 shadow-xs"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Correct answer toggle button */}
        <button
          type="button"
          onClick={handleToggleCorrect}
          disabled={disabled || isSettingCorrect}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            option.isCorrect
              ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
          }`}
          title={
            option.isCorrect
              ? "Correct answer selected"
              : `Click to select Option ${letter} as the correct answer`
          }
          aria-label={`Option ${letter}: ${option.isCorrect ? "Correct answer" : "Mark as correct answer"}`}
          aria-pressed={option.isCorrect}
        >
          {isSettingCorrect ? (
            <span className="animate-spin text-[10px]">⏳</span>
          ) : option.isCorrect ? (
            "✓"
          ) : (
            letter
          )}
        </button>

        {/* Option text & inline editor */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={text}
                  maxLength={200}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  disabled={isSaving}
                  autoFocus
                  className="w-full text-sm px-2.5 py-1 rounded border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100"
                  placeholder="Option text..."
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !text.trim()}
                  className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 cursor-pointer font-medium whitespace-nowrap"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
              {editError && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {editError}
                </p>
              )}
            </div>
          ) : (
            <div
              onClick={() => {
                if (!disabled) {
                  setText(option.text);
                  setIsEditing(true);
                }
              }}
              className="text-sm text-slate-800 cursor-text flex items-center gap-2 py-0.5 truncate"
              title="Click to edit text"
            >
              <span className="font-semibold text-slate-400 text-xs">
                {letter}.
              </span>
              <span
                className={`truncate ${
                  option.isCorrect ? "font-semibold text-emerald-950" : ""
                }`}
              >
                {option.text}
              </span>
              {option.isCorrect && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                  <span>✓</span> Correct Answer
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setText(option.text);
              setIsEditing(true);
            }}
            disabled={disabled || isDeleting}
            className="p-1.5 text-xs text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            title={`Edit Option ${letter}`}
            aria-label={`Edit Option ${letter}`}
          >
            ✎
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={disabled || isDeleting}
          className="p-1.5 text-xs text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer disabled:opacity-50"
          title={`Delete Option ${letter}`}
          aria-label={`Delete Option ${letter}`}
        >
          {isDeleting ? (
            <span className="animate-spin text-xs inline-block">⏳</span>
          ) : (
            "🗑"
          )}
        </button>
      </div>
    </div>
  );
};
