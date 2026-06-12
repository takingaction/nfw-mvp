"use client";

export default function BackfillButton() {
  return (
    <button
      id="run-backfill"
      onClick={async () => {
        const btn = document.getElementById("run-backfill");
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Running...";
        }
        try {
          const res = await fetch("/api/admin/members/backfill-payments", {
            method: "POST",
            credentials: "include",
          });
          const data = await res.json();
          alert(
            `Backfill complete!\n\nProcessed: ${data.processed}\nUpdated: ${data.updated}${
              data.errors?.length ? `\nErrors: ${data.errors.length}` : ""
            }`
          );
        } catch (err) {
          alert("Backfill failed: " + (err as Error).message);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Run Backfill";
          }
        }
      }}
      className="px-4 py-2 bg-nfw-aubergine text-white font-medium hover:bg-nfw-aubergine/90 transition-colors text-sm flex items-center gap-2"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      Run Backfill
    </button>
  );
}