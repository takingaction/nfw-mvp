import { ACCESS_PAUSED_EMAIL } from "@/lib/member-access";

/**
 * Shown to members whose access an admin has paused (profiles.access_paused_at).
 * Not dismissible: it explains why perks, store claims, travel and new grant
 * applications are unavailable. Server-renderable (no client state).
 */
export function AccessPausedBanner() {
  return (
    <div role="status" className="w-full bg-nfw-aubergine py-3 px-4">
      <div className="max-w-7xl mx-auto">
        <p className="text-white font-ui text-sm font-medium">
          Your NFW membership access has been temporarily limited as we investigate an issue
          with your account. If you have any questions, please contact{" "}
          <a
            href={`mailto:${ACCESS_PAUSED_EMAIL}`}
            className="text-white font-bold underline hover:text-nfw-citrine transition-colors"
          >
            {ACCESS_PAUSED_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
