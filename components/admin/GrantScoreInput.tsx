"use client";

interface GrantScoreInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  description?: string;
}

const SCORE_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3];

export default function GrantScoreInput({
  label,
  value,
  onChange,
  description,
}: GrantScoreInputProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider mb-1">
          {label}
        </label>
        {description && (
          <p className="text-xs text-nfw-blackberry/50 mb-2">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {SCORE_OPTIONS.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(value === score ? null : score)}
            className={`w-10 h-10 text-sm font-bold rounded transition-all ${
              value === score
                ? "bg-nfw-aubergine text-white"
                : "bg-nfw-dove text-nfw-blackberry hover:bg-nfw-aubergine/20"
            }`}
          >
            {score}
          </button>
        ))}
      </div>

      {value !== null && (
        <p className="text-xs text-nfw-blackberry/50">
          Selected: <strong className="text-nfw-aubergine">{value}</strong>
        </p>
      )}
    </div>
  );
}
