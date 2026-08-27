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
          {/* CRITERIA 1: Intent & Feasibility */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              Criteria 1: Intent & Feasibility – Use of Funds
            </h4>
            <p className="text-xs text-nfw-blackberry/70 mb-2">
              Does the applicant present a clear, realistic plan for how the grant funds will be spent and executed?
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">3</span>
                <span className="text-nfw-blackberry/70"><strong>High Clarity</strong> – Applicant provides a clear, well-defined plan for how the funds will be used (e.g., itemized costs, dates, or practical steps). The requested amount closely matches the scope of the plan.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">2</span>
                <span className="text-nfw-blackberry/70"><strong>Medium Clarity</strong> – The intended use of funds is clear, but specific execution details (timing, breakdown) are somewhat general.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">1</span>
                <span className="text-nfw-blackberry/70"><strong>Low Clarity</strong> – The applicant states what they want to purchase or do, but offers minimal detail on how the funds will actually be applied, managed, or executed.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">0</span>
                <span className="text-nfw-blackberry/70"><strong>Unclear</strong> – Intended use of funds is completely vague, missing, or lacks any concrete plan (i.e. "I just need the money").</span>
              </div>
            </div>
          </div>

          {/* CRITERIA 2: Authenticity of Need */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              Criteria 2: Authenticity of Need – Applicant's Story/Personal Context
            </h4>
            <p className="text-xs text-nfw-blackberry/70 mb-2">
              Does the applicant provide a clear, personal narrative of their need? Do they include a "who", "what", and "why" in the context of their individual current circumstances? The difference between a generic request and a "hand-raise" that reveals a specific moment of navigation.
            </p>
            <p className="text-xs text-nfw-blackberry/70 mb-2 italic">
              Examples:
            </p>
            <p className="text-xs text-nfw-blackberry/70 mb-1">
              "I am applying for the grocery grant because I'm short on money." ➡️ "I am applying for the grocery grant so that I don't have to worry about grocery expenses this month because I had to pay for an unexpected car repair last month."
            </p>
            <p className="text-xs text-nfw-blackberry/70 mb-2">
              "I am in severe need of the grocery grant because I'm out of money." ➡️ "I am in severe need of the grocery grant because I've been feeling depressed and having trouble leaving my apartment. The funds will allow me to get groceries delivered."
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">3</span>
                <span className="text-nfw-blackberry/70"><strong>High Clarity</strong> – The information provided clearly links who they are (info on identity or current life stage) to a specific, current hurdle (why now?). The request feels like a genuine "hand-raise" moment.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">2</span>
                <span className="text-nfw-blackberry/70"><strong>Medium Clarity</strong> – The need is clear, but the "who" or the "why now" is a bit thin. The team can infer the situation, but it lacks personal context.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">1</span>
                <span className="text-nfw-blackberry/70"><strong>Low Clarity</strong> – The application is vague or uses generic language that doesn't explain the personal "navigation" occurring.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">0</span>
                <span className="text-nfw-blackberry/70"><strong>No Clarity</strong> – The applicant does not explain who they are or why they want the funds. (i.e. "I want this grant.")</span>
              </div>
            </div>
          </div>

          {/* CRITERIA 3: Impact */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              Criteria 3: Impact – Outcome
            </h4>
            <p className="text-xs text-nfw-blackberry/70 mb-2">
              Does the applicant detail how this grant will meaningfully benefit their life? Does it provide financial breathing room, emotional relief, a well-deserved mental rest, or an opportunity for bonding and growth? Does the amount they are seeking and the situation they are describing feel like meaningful improvement?
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">3</span>
                <span className="text-nfw-blackberry/70"><strong>High Clarity</strong> – The applicant clearly describes how the grant will directly address financial gaps, reduce significant stress, foster family/personal connection, or provide stabilization in their current circumstances.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">2</span>
                <span className="text-nfw-blackberry/70"><strong>Medium Clarity</strong> – Applicant clearly describes the desire for funds, but the connection between the grant and a positive/improved outcome is described in general terms.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">1</span>
                <span className="text-nfw-blackberry/70"><strong>Low Clarity</strong> – Funds will help, but potential benefit or positive outcome is unclear or vague, or funds exceed the current need.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-nfw-blackberry w-6 flex-shrink-0">0</span>
                <span className="text-nfw-blackberry/70"><strong>Unclear</strong> – Intended benefit or outcome of the funds is not stated or unclear.</span>
              </div>
            </div>
          </div>

          {/* ADDITIONAL CONSIDERATION: URGENCY */}
          <div className="bg-nfw-dove p-3 rounded">
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              Additional Consideration: Urgency
            </h4>
            <p className="text-xs text-nfw-blackberry/70">
              Is the applicant facing an immediate threat to safety, housing, health, or any other necessity?
            </p>
            <p className="text-xs text-nfw-blackberry/50 mt-1 italic">
              *Urgency does not guarantee approval, but should be considered holistically with the rest of the application.
            </p>
          </div>

          {/* BARRIERS */}
          <div>
            <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
              BARRIERS (Y/N)
            </h4>
            <p className="text-xs text-nfw-blackberry/70 mb-2">
              Does the applicant belong to a demographic experiencing disproportionate barriers to financial stability?
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
              <h4 className="font-black text-nfw-blackberry font-ui uppercase tracking-wider mb-2 text-xs">
                NEEDS DISCUSSION (First reviewer only)
              </h4>
              <p className="text-xs text-nfw-blackberry/70">
                Flag this application if you believe it needs additional discussion among reviewers before a final decision is made.
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
