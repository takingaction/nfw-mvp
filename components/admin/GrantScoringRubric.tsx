"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface GrantScoringRubricProps {
  showDiscussionFlag?: boolean;
}

export default function GrantScoringRubric({
  showDiscussionFlag = false,
}: GrantScoringRubricProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-white border border-nfw-blackberry/10">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 bg-nfw-dove hover:bg-nfw-dove/80 transition-colors"
      >
        <h3 className="font-black text-nfw-blackberry font-ui text-sm uppercase tracking-wider">
          Scoring Rubric
        </h3>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-nfw-blackberry/50" />
        ) : (
          <ChevronUp className="w-5 h-5 text-nfw-blackberry/50" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 text-sm max-h-96 overflow-y-auto">
          {/* URGENCY */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              URGENCY (0-3)
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">3</span>
                <span className="text-nfw-blackberry/70">
                  <strong>Immediate</strong> — Unsafe environment or will lose
                  necessities within the month
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">2</span>
                <span className="text-nfw-blackberry/70">
                  <strong>At Risk</strong> — Circumstances are precarious or
                  unstable and trending downwards
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">1</span>
                <span className="text-nfw-blackberry/70">
                  <strong>Stable</strong> — Has flexibility and capacity to manage
                  without the funds
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">0</span>
                <span className="text-nfw-blackberry/70">
                  <strong>Unclear</strong> — Cannot assess urgency from information
                  provided
                </span>
              </div>
            </div>
          </div>

          {/* AUTHENTICITY */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              AUTHENTICITY OF NEED (0-3)
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">3</span>
                <span className="text-nfw-blackberry/70">
                  <strong>High Clarity</strong> — Clear link of who they are to
                  a specific current hurdle. Feels like a genuine &quot;hand-raise&quot;
                  moment.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">2</span>
                <span className="text-nfw-blackberry/70">
                  <strong>Medium Clarity</strong> — Need is clear, but the
                  &quot;who&quot; or &quot;why now&quot; is thin
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">1</span>
                <span className="text-nfw-blackberry/70">
                  <strong>Low Clarity</strong> — Vague, generic language
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">0</span>
                <span className="text-nfw-blackberry/70">
                  <strong>No Clarity</strong> — No explanation of who they
                  are or why they want funds
                </span>
              </div>
            </div>
          </div>

          {/* IMPACT */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              IMPACT (0-3)
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">3</span>
                <span className="text-nfw-blackberry/70">
                  <strong>High</strong> — Clear financial gap, funds directly
                  address it, circumstances will improve
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">2</span>
                <span className="text-nfw-blackberry/70">
                  <strong>Medium</strong> — Need for funds is clear, but
                  connection to improved outcome is general
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">1</span>
                <span className="text-nfw-blackberry/70">
                  <strong>Low</strong> — Funds will help but impact is unclear
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6">0</span>
                <span className="text-nfw-blackberry/70">
                  <strong>None</strong> — Intended use of funds is vague or
                  unclear
                </span>
              </div>
            </div>
          </div>

          {/* BARRIERS */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              BARRIERS (Y/N)
            </h4>
            <p className="text-xs text-nfw-blackberry/70 mb-2">
              Does the applicant belong to a demographic experiencing
              disproportionate barriers to financial stability?
            </p>
            <div className="flex flex-wrap gap-1 text-xs">
              {[
                "Single mother",
                "Caregiver",
                "DV survivor",
                "Disability",
                "Health condition",
                "Race",
                "Immigration",
                "ESL",
              ].map((barrier) => (
                <span
                  key={barrier}
                  className="px-2 py-0.5 bg-nfw-dove text-nfw-blackberry/60 rounded"
                >
                  {barrier}
                </span>
              ))}
            </div>
          </div>

          {/* DISCUSSION FLAG (First reviewer only) */}
          {showDiscussionFlag && (
            <div className="border-t border-nfw-blackberry/10 pt-4">
              <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                NEEDS DISCUSSION (First reviewer only)
              </h4>
              <p className="text-xs text-nfw-blackberry/70">
                Flag this application if you believe it needs additional
                discussion among reviewers before a final decision is made.
              </p>
              <p className="text-xs text-nfw-blackberry/50 mt-1">
                Add notes explaining why this application needs discussion.
              </p>
            </div>
          )}

          {/* SCORE TOTALS */}
          <div className="border-t border-nfw-blackberry/10 pt-4 bg-nfw-dove p-3 rounded">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-nfw-blackberry">
                Per reviewer max: <strong>9</strong>
              </span>
              <span className="text-nfw-blackberry">
                Combined max: <strong>18</strong>
              </span>
            </div>
            <p className="text-xs text-nfw-blackberry/50 mt-1 text-center">
              Half points allowed (0.5, 1.5, 2.5)
            </p>
          </div>

          {/* DECISION BANDS */}
          <div className="text-xs">
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2">
              DECISION THRESHOLDS
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-green-50 border border-green-200 rounded">
                <p className="font-bold text-green-700">14-18: Approved</p>
              </div>
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-bold text-yellow-700">8-13: Runner Up</p>
              </div>
              <div className="p-2 bg-red-50 border border-red-200 rounded col-span-2">
                <p className="font-bold text-red-700">0-7: Not Approved</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
