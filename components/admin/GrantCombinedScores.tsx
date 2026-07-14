"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, AlertTriangle, Check, MessageSquare, ChevronDown } from "lucide-react";

interface Grant {
  id: string;
  rank: number;
  profiles?: {
    full_name: string;
    email: string;
    city: string;
    state: string;
  };
  is_nominating: boolean;
  nominee_name: string;
  who_are_you: string;
  biggest_challenge: string;
  fund_usage: string;
  combined_score: number;
  decision: string;
  needs_discussion: boolean;
  discussion_notes: string | null;
  barriers_yn: boolean | null;
  has_received_grant: boolean;
  is_tentatively_approved: boolean;
  first_score?: {
    total_score: number;
  };
  second_score?: {
    total_score: number;
  };
}

interface GrantCombinedScoresProps {
  grants: Grant[];
  cycle: {
    id: string;
    cycle_name: string;
    amount_per_grant: number;
    grants_available: number;
  };
  onTentativeApprove: (grantIds: string[]) => Promise<void>;
  onFinalize: () => Promise<void>;
  loading?: boolean;
  finalizing?: boolean;
  alreadyFinalized?: boolean;
}

export default function GrantCombinedScores({
  grants,
  cycle,
  onTentativeApprove,
  onFinalize,
  loading = false,
  finalizing = false,
  alreadyFinalized = false,
}: GrantCombinedScoresProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(grants.filter((g) => g.is_tentatively_approved).map((g) => g.id))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const maxSelectable = cycle.grants_available;
  const selectedCount = selectedIds.size;

  const handleToggle = (grantId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(grantId)) {
      newSelected.delete(grantId);
    } else {
      if (newSelected.size < maxSelectable) {
        newSelected.add(grantId);
      }
    }
    setSelectedIds(newSelected);
    setSaved(false);
  };

  const handleSaveSelections = async () => {
    setSaving(true);
    await onTentativeApprove(Array.from(selectedIds));
    setSaving(false);
    setSaved(true);
  };

  const handleToggleExpand = (grantId: string) => {
    setExpandedId(expandedId === grantId ? null : grantId);
  };

  const getDecisionStyle = (decision: string) => {
    switch (decision) {
      case "Approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "Runner Up":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  function AccordionContent({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ minHeight: 0, overflow: "hidden" }}>
          {children}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-nfw-blackberry" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between bg-white border border-nfw-blackberry/10 p-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-nfw-blackberry/50 uppercase tracking-wider">
              Available Grants
            </p>
            <p className="text-2xl font-black text-nfw-blackberry">
              {maxSelectable}
            </p>
          </div>
          <div className="border-l border-nfw-blackberry/10 pl-6">
            <p className="text-xs text-nfw-blackberry/50 uppercase tracking-wider">
              Selected
            </p>
            <p className="text-2xl font-black text-nfw-aubergine">
              {selectedCount}
              <span className="text-sm text-nfw-blackberry/50">/{maxSelectable}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!alreadyFinalized && (
            <>
              <button
                onClick={handleSaveSelections}
                disabled={saving}
                className="px-4 py-2 bg-nfw-wisteria text-white font-bold text-sm hover:bg-nfw-wisteria/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  "Save Selections"
                )}
              </button>
              <button
                onClick={onFinalize}
                disabled={finalizing || selectedCount !== cycle.grants_available}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {finalizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  "Finalize Approvals"
                )}
              </button>
              {selectedCount !== cycle.grants_available && !alreadyFinalized && (
                <span className="text-xs text-nfw-blackberry/50">
                  {selectedCount < cycle.grants_available
                    ? `Select ${cycle.grants_available - selectedCount} more to finalize`
                    : `Too many selected (max: ${cycle.grants_available})`}
                </span>
              )}
              {selectedCount === cycle.grants_available && !alreadyFinalized && (
                <span className="text-xs text-green-600 font-semibold">
                  Ready to finalize
                </span>
              )}
            </>
          )}
          {alreadyFinalized && (
            <span className="px-4 py-2 bg-green-100 text-green-700 font-bold text-sm rounded">
              ✓ Finalized
            </span>
          )}
        </div>
      </div>

      {/* Decision Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-nfw-blackberry/50 font-semibold uppercase tracking-wider">
          Decision Bands:
        </span>
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">14-18: Approved</span>
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">8-13: Runner Up</span>
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded">0-7: Not Approved</span>
      </div>

      {/* Combined Score Warning */}
      {selectedCount > maxSelectable && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" />
          You cannot select more than {maxSelectable} grants.
        </div>
      )}

      {/* Header Row */}
      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_80px_100px_80px_96px_80px_80px] gap-2 p-3 border-b border-nfw-blackberry/10">
          <div className="text-left text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Rank
          </div>
          <div className="text-left text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Applicant
          </div>
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Combined
          </div>
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Decision
          </div>
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Barriers
          </div>
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Discuss
          </div>
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Prior
          </div>
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Select
          </div>
        </div>

        {/* Grant Rows */}
        <div>
          {grants.map((grant, index) => {
            const isSelected = selectedIds.has(grant.id);
            const isExpanded = expandedId === grant.id;

            return (
              <div key={grant.id}>
                {/* Header Row */}
                <div
                  onClick={() => handleToggleExpand(grant.id)}
                  className={`grid grid-cols-[48px_1fr_80px_100px_80px_96px_80px_80px] gap-2 p-3 border-b border-nfw-blackberry/5 cursor-pointer ${
                    isExpanded
                      ? "bg-nfw-aubergine/5 border-l-4 border-l-nfw-aubergine"
                      : isSelected
                      ? "bg-nfw-citrine/20"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-4 h-4 text-nfw-blackberry/40 transition-transform duration-500 ease-in-out ${isExpanded ? "rotate-180" : ""}`}
                    />
                    <span className="w-8 h-8 flex items-center justify-center bg-nfw-blackberry/10 text-sm font-bold text-nfw-blackberry rounded">
                      {grant.rank}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-bold text-nfw-blackberry text-sm">
                        {grant.profiles?.full_name || "Unknown"}
                      </p>
                      {grant.is_nominating && (
                        <p className="text-xs text-nfw-blackberry/50">
                          Nomination: {grant.nominee_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-xl font-black text-nfw-blackberry">
                      {grant.combined_score}
                      <span className="text-sm text-nfw-blackberry/50">/18</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getDecisionStyle(
                        grant.decision
                      )}`}
                    >
                      {grant.decision}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    {grant.barriers_yn === true ? (
                      <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700 border border-red-200">
                        Y
                      </span>
                    ) : grant.barriers_yn === false ? (
                      <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-600 border border-gray-200">
                        N
                      </span>
                    ) : (
                      <span className="text-nfw-blackberry/30 text-xs">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {grant.needs_discussion ? (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-semibold">Flagged</span>
                      </div>
                    ) : (
                      <span className="text-nfw-blackberry/30 text-xs">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {grant.has_received_grant ? (
                      <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-nfw-aubergine/20 text-nfw-aubergine border border-nfw-aubergine/30">
                        Yes
                      </span>
                    ) : (
                      <span className="text-nfw-blackberry/30 text-xs">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {grant.decision === "Approved" && !alreadyFinalized ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(grant.id); }}
                        disabled={!isSelected && selectedCount >= maxSelectable}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-nfw-aubergine border-nfw-aubergine"
                            : "border-nfw-blackberry/20 hover:border-nfw-blackberry/40"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ) : grant.decision === "Approved" && alreadyFinalized ? (
                      isSelected ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="text-nfw-blackberry/30">—</span>
                      )
                    ) : (
                      <span className="text-nfw-blackberry/30">—</span>
                    )}
                  </div>
                </div>

                {/* Accordion Content */}
                <AccordionContent isOpen={isExpanded}>
                  <div className="p-4 bg-white">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-nfw-aubergine text-xs uppercase tracking-wider mb-1">Who Are You?</h4>
                        <p className="text-sm text-nfw-blackberry/80 font-serif">{grant.who_are_you}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-nfw-aubergine text-xs uppercase tracking-wider mb-1">Biggest Challenge</h4>
                        <p className="text-sm text-nfw-blackberry/80 font-serif">{grant.biggest_challenge}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-nfw-aubergine text-xs uppercase tracking-wider mb-1">Fund Usage</h4>
                        <p className="text-sm text-nfw-blackberry/80 font-serif">{grant.fund_usage}</p>
                      </div>
                    </div>
                    {grant.needs_discussion && grant.discussion_notes && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <h4 className="font-bold text-yellow-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Discussion Notes
                        </h4>
                        <p className="text-sm text-yellow-700">{grant.discussion_notes}</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
