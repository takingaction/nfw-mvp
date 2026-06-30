"use client";

interface FreeMembershipApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberName?: string;
  sendingEmail?: boolean;
  saving?: boolean;
  emailSendError?: string | null;
}

export function FreeMembershipApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  memberName,
  sendingEmail,
  saving,
  emailSendError,
}: FreeMembershipApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-black text-nfw-blackberry font-serif mb-4 text-center">
          {memberName ? `Approve Free Membership for ${memberName}?` : "Approve Free Membership?"}
        </h3>
        <p className="text-nfw-blackberry/80 text-sm leading-relaxed mb-6 text-center">
          The welcome email will be sent to the member upon confirmation.
        </p>
        {emailSendError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200">
            <p className="text-xs text-red-600">
              Email failed to send: {emailSendError}. The approval has been saved.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving || sendingEmail}
            className="flex-1 py-3 border-2 border-nfw-blackberry/20 text-nfw-blackberry font-semibold text-sm hover:bg-nfw-blackberry/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || sendingEmail}
            className="flex-1 py-3 bg-nfw-wisteria text-white font-bold text-sm hover:bg-nfw-wisteria/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sendingEmail ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              "Confirm & Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
