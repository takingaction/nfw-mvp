"use client";

import { cn } from "@/lib/utils";

interface ViewToggleProps {
  currentView: "stores" | "offers" | "locations";
  onViewChange: (view: "stores" | "offers" | "locations") => void;
  counts: {
    stores: number;
    offers: number;
    locations: number;
  };
}

export default function ViewToggle({
  currentView,
  onViewChange,
  counts,
}: ViewToggleProps) {
  const views = [
    { key: "stores" as const, label: "Stores", count: counts.stores },
    { key: "offers" as const, label: "Offers", count: counts.offers },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {views.map((view) => (
        <button
          key={view.key}
          onClick={() => onViewChange(view.key)}
          className={cn(
            "px-4 py-2 font-sans text-sm font-medium transition-colors flex items-center gap-2",
            currentView === view.key
              ? "bg-nfw-aubergine text-white"
              : "border border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-blackberry/5"
          )}
        >
          {view.label}
          <span
            className={cn(
              "px-1.5 py-0.5 text-xs rounded",
              currentView === view.key
                ? "bg-white/20 text-white"
                : "bg-nfw-blackberry/10 text-nfw-blackberry/60"
            )}
          >
            {view.count.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}
