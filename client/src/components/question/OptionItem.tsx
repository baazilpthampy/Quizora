import React, { useState } from "react";
import type { OptionDetail } from "../../types/api";

export interface OptionItemProps {
  option: OptionDetail;
  index: number;
  onSetCorrect: (optionId: string) => void;
  onUpdateText: (optionId: string, newText: string) => Promise<void>;
  onDelete: (optionId: string) => Promise<void>;
  isOnlyOption?: boolean;
}

export const OptionItem: React.FC<OptionItemProps> = ({
  option,
  index,
  onSetCorrect,
  onUpdateText,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(option.text);
  const [isSaving, setIsSaving] = useState(false);

  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const letter = optionLetters[index] || `${index + 1}`;

  const handleSave = async () => {
    if (!text.trim()) {
      setText(option.text);
      setIsEditing(false);
      return;
    }
    if (text.trim() === option.text) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onUpdateText(option.id, text.trim());
      setIsEditing(false);
    } catch {
      // handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
        option.isCorrect
          ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/40"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Correct answer toggle button */}
        <button
          type="button"
          onClick={() => onSetCorrect(option.id)}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-transform active:scale-95 cursor-pointer ${
            option.isCorrect
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
          title={
            option.isCorrect
              ? "Correct option (Click to keep)"
              : "Click to mark as correct answer"
          }
          aria-label={`Mark Option ${letter} as correct`}
        >
          {option.isCorrect ? "✓" : letter}
        </button>

        {/* Option text */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setText(option.text);
                    setIsEditing(false);
                  }
                }}
                autoFocus
                className="w-full text-sm px-2.5 py-1 rounded border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                placeholder="Option text..."
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 cursor-pointer font-medium"
              >
                {isSaving ? "..." : "Save"}
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="text-sm text-slate-800 cursor-text flex items-center gap-2 py-0.5 truncate"
              title="Click to edit"
            >
              <span className="font-medium text-slate-400 text-xs">
                Option {letter}:
              </span>
              <span
                className={
                  option.isCorrect ? "font-semibold text-emerald-950" : ""
                }
              >
                {option.text}
              </span>
              {option.isCorrect && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                  Correct Answer
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-xs text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
            title="Edit option text"
          >
            ✎
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(option.id)}
          className="p-1.5 text-xs text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
          title="Delete option"
        >
          🗑
        </button>
      </div>
    </div>
  );
};
