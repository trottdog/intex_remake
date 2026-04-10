import { AlertTriangle, Loader2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  description?: string;
  itemName?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  open,
  title = "Delete this item?",
  description,
  itemName,
  isPending = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute -inset-4 bg-black/50 backdrop-blur-sm" onClick={!isPending ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <button
          onClick={onCancel}
          disabled={isPending}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 disabled:opacity-40 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{title}</h3>
            {itemName && (
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-semibold text-gray-700">"{itemName}"</span> will be permanently removed.
              </p>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
            {!itemName && !description && (
              <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
