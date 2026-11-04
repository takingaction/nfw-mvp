"use client";

/**
 * Internal reviewer guidance for a grant cycle (grant_cycles.reviewer_guidance).
 *
 * Read by the AI for the relevance check and rubric scoring. Never shown to
 * applicants. Plain text; the AI reads it as written.
 */

export const REVIEWER_GUIDANCE_MAX = 4000;

const PLACEHOLDER = `What counts as on-theme: ...
OK if: ...
Score zero / disqualify: ...
Strong applications: ...
Edge cases: ...`;

interface ReviewerGuidanceFieldProps {
  value: string;
  onChange: (value: string) => void;
  labelClass: string;
  inputClass: string;
}

export default function ReviewerGuidanceField({
  value,
  onChange,
  labelClass,
  inputClass,
}: ReviewerGuidanceFieldProps) {
  return (
    <div>
      <label className={labelClass}>
        Reviewer Guidance{" "}
        <span className="font-normal text-nfw-blackberry/50">(internal — not shown to applicants)</span>
      </label>
      <p className="text-xs text-nfw-blackberry/50 mb-2">
        Clarifications for the AI reviewer that don&apos;t belong in the public description: what counts as
        on-theme, edge cases, and what should score zero. Examples in the description are treated as
        illustrative, so only list exclusions you mean. Applies to applications evaluated after you save.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, REVIEWER_GUIDANCE_MAX))}
        rows={8}
        placeholder={PLACEHOLDER}
        className={`${inputClass} font-mono text-sm`}
      />
      <p className="text-xs text-nfw-blackberry/40 mt-1 text-right">
        {value.length.toLocaleString()} / {REVIEWER_GUIDANCE_MAX.toLocaleString()}
      </p>
    </div>
  );
}
