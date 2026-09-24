import React, { useEffect } from "react";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  isConfirmLoading?: boolean;
  confirmVariant?: "primary" | "danger";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  confirmText,
  onConfirm,
  isConfirmLoading = false,
  confirmVariant = "primary",
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConfirmLoading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isConfirmLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isConfirmLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3
            id="modal-title"
            className="text-base font-semibold text-slate-900"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirmLoading}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1 cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="p-6 text-sm text-slate-600">{children}</div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isConfirmLoading}
          >
            Cancel
          </Button>
          {confirmText && onConfirm && (
            <Button
              type="button"
              variant={confirmVariant}
              size="sm"
              onClick={onConfirm}
              isLoading={isConfirmLoading}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
