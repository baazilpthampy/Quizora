import React from "react";

export interface AlertProps {
  type?: "error" | "success" | "info" | "warning";
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = "error",
  title,
  message,
  onDismiss,
  className = "",
}) => {
  const styles = {
    error: "bg-rose-50 border-rose-200 text-rose-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-indigo-50 border-indigo-200 text-indigo-800",
  };

  return (
    <div
      className={`p-4 rounded-lg border text-sm flex items-start justify-between ${styles[type]} ${className}`}
      role="alert"
    >
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-3 text-current opacity-70 hover:opacity-100 focus:outline-none cursor-pointer"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};
