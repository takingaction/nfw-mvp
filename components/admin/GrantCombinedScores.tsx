"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Check, MessageSquare } from "lucide-react";

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
  combined_score: number;
  decision: string;
  needs_discussion: boolean;
  discussion_notes: string | null;
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
                disabled={finalizing || selectedCount === 0}
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

      {/* Table */}
      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-nfw-dove border-b border-nfw-blackberry/10">
              <th className="text-left p-3 text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider w-12">
                Rank
              </th>
              <th className="text-left p-3 text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
                Applicant
              </th>
              <th className="text-center p-3 text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider w-24">
                Combined
              </th>
              <th className="text-center p-3 text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider w-32">
                Decision
              </th>
              <th className="text-center p-3 text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider w-24">
                Discuss
              </th>
              <th className="text-center p-3 text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider w-20">
                Select
              </th>
            </tr>
          </thead>
          <tbody>
            {grants.map((grant, index) => {
              const isSelected = selectedIds.has(grant.id);
              const isSelectable = grant.decision === "Approved" && selectedCount < maxSelectable;

              return (
                <tr
                  key={grant.id}
                  className={`border-b border-nfw-blackberry/5 ${
                    isSelected
                      ? "bg-nfw-citrine/20"
                      : index % 2 === 0
                      ? "bg-white"
                      : "bg-nfw-dove/50"
                  }`}
                >
                  <td className="p-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-nfw-blackberry/10 text-sm font-bold text-nfw-blackberry rounded">
                      {grant.rank}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-nfw-lilac/30 flex items-center justify-center text-sm font-bold text-nfw-blackberry rounded">
                        {grant.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
                      </div>
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
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-xl font-black text-nfw-blackberry">
                      {grant.combined_score}
                      <span className="text-sm text-nfw-blackberry/50">/18</span>
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getDecisionStyle(
                        grant.decision
                      )}`}
                    >
                      {grant.decision}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {grant.needs_discussion ? (
                      <div className="flex items-center justify-center gap-1 text-yellow-600" title={grant.discussion_notes || ""}>
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-semibold">Flagged</span>
                      </div>
                    ) : (
                      <span className="text-nfw-blackberry/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {grant.decision === "Approved" && !alreadyFinalized ? (
                      <button
                        onClick={() => handleToggle(grant.id)}
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
                        <Check className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-nfw-blackberry/30">—</span>
                      )
                    ) : (
                      <span className="text-nfw-blackberry/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Discussion Notes Modal */}
      {grants.some((g) => g.needs_discussion && g.discussion_notes) && (
        <div className="bg-yellow-50 border border-yellow-200 p-4">
          <h4 className="font-bold text-yellow-800 text-sm mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Discussion Notes
          </h4>
          <div className="space-y-2">
            {grants
              .filter((g) => g.needs_discussion && g.discussion_notes)
              .map((grant) => (
                <div key={grant.id} className="bg-white border border-yellow-200 p-3 rounded text-sm">
                  <p className="font-bold text-nfw-blackberry">
                    {grant.profiles?.full_name} (Rank #{grant.rank})
                  </p>
                  <p className="text-nfw-blackberry/70">{grant.discussion_notes}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
