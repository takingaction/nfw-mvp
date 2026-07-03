"use client";

import { X, AlertTriangle, Trash2 } from "lucide-react";

interface DeleteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberName: string | undefined;
  memberEmail: string | undefined;
  deleting: boolean;
}

export function DeleteMemberModal({
  isOpen,
  onClose,
  onConfirm,
  memberName,
  memberEmail,
  deleting,
}: DeleteMemberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-none w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-nfw-blackberry/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-black text-nfw-blackberry font-ui">
              Delete Member
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-nfw-blackberry/5 transition-colors"
          >
            <X className="w-5 h-5 text-nfw-blackberry/50" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-nfw-blackberry mb-4">
            Are you sure you want to delete this member? This action cannot be undone.
          </p>

          <div className="bg-nfw-dove p-4 mb-4">
            <p className="font-semibold text-nfw-blackberry">
              {memberName || "Unknown Member"}
            </p>
            <p className="text-sm text-nfw-blackberry/60">{memberEmail}</p>
          </div>

          <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3">
            <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">
              Deleting this member will permanently remove their account and all associated data from auth.users. 
              Related records in profiles and other tables will be cascade deleted automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-nfw-blackberry/10 flex gap-3 bg-nfw-dove">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-3 border-2 border-nfw-blackberry/20 text-sm font-semibold text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Member"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}