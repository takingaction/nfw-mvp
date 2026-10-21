"use client";

import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { criteriaResults, type CriterionVerdict } from "@/lib/grant-criteria";

interface AiCriteriaListProps {
  ai_criteria?: unknown;
  eligibility_checks?: unknown;
  /** Show a "checked live" note (Review 2 re-checks membership/awards now). */
  liveLabel?: string;
  compact?: boolean;
}

const VERDICT_STYLE: Record<CriterionVerdict, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  pass: { icon: CheckCircle2, cls: "text-green-700", label: "Pass" },
  fail: { icon: XCircle, cls: "text-red-700", label: "Fail" },
  uncertain: { icon: HelpCircle, cls: "text-yellow-700", label: "Unclear" },
};

/**
 * Per-criterion review results: membership and grant restrictions (checked in
 * code) plus completeness and permitted use (AI). Renders nothing for rows
 * evaluated before per-criterion review existed.
 */
export default function AiCriteriaList({
  ai_criteria,
  eligibility_checks,
  liveLabel,
  compact = false,
}: AiCriteriaListProps) {
  const rows = criteriaResults(ai_criteria, eligibility_checks);
  if (rows.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {rows.map(({ key, label, result }) => {
          const v = VERDICT_STYLE[result.verdict];
          const Icon = v.icon;
          return (
            <span
              key={key}
              title={`${label}: ${v.label}${result.note ? ` — ${result.note}` : ""}`}
              className={`inline-flex items-center gap-0.5 text-[10px] font-ui font-semibold ${v.cls}`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1.5">
        {rows.map(({ key, label, source, result }) => {
          const v = VERDICT_STYLE[result.verdict];
          const Icon = v.icon;
          return (
            <li key={key} className="flex items-start gap-2 text-xs">
              <Icon className={`w-4 h-4 flex-shrink-0 mt-px ${v.cls}`} />
              <div className="min-w-0">
                <span className="font-ui font-bold text-nfw-blackberry">{label}</span>{" "}
                <span className={`font-ui font-semibold ${v.cls}`}>{v.label}</span>
                <span className="text-nfw-blackberry/40 font-ui">
                  {" "}· {source === "ai" ? "AI" : liveLabel ?? "System check"}
                </span>
                {result.note && (
                  <p className="font-serif text-nfw-blackberry/70 mt-0.5">{result.note}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
