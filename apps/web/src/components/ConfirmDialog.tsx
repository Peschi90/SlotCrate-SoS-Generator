"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

/**
 * Layout-konformes Bestätigungsdialog (ersetzt window.confirm), dunkles
 * Theme passend zu den restlichen Panels.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-950 to-neutral-900 p-5 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-sm font-semibold text-neutral-100">
          {title}
        </h2>
        <p className="mt-2 text-xs text-neutral-300">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-neutral-500"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-crate-box/60 bg-crate-box/15 px-3 py-1.5 text-xs font-medium text-white transition hover:border-crate-box"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
