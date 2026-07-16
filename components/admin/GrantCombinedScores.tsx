"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Check, MessageSquare, ChevronDown, Eye, EyeOff, DollarSign } from "lucide-react";

interface Grant {
  id: string;
  rank: number;
  profiles?: {
    full_name: string;
    email: string;
    city: string;
    state: string;
    stripe_onboarding_completed?: boolean;
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
  second_needs_discussion: boolean;
  second_discussion_notes: string | null;
  barriers_yn: boolean | null;
  has_received_grant: boolean;
  is_tentatively_approved: boolean;
  first_score?: {
    total_score: number;
  };
  second_score?: {
    total_score: number;
  };
  stripe_connect_account_id?: string | null;
  funded_at?: string | null;
  transfer_id?: string | null;
  amount_approved?: number;
  documents?: any[];
}

interface StripeCheckResult {
  grantId: string;
  connected: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

interface GrantCombinedScoresProps {
  grants: Grant[];
  cycle: {
    id: string;
    cycle_name: string;
    amount_per_grant: number;
    grants_available: number;
    total_funds: number;
  };
  totalPaid?: number;
  onTentativeApprove: (grantIds: string[]) => Promise<void>;
  onFinalize: () => Promise<void>;
  onCheckStripeStatus: () => Promise<StripeCheckResult[]>;
  onSendMoney: (grantId: string) => Promise<{ error?: string }>;
  loading?: boolean;
  finalizing?: boolean;
  alreadyFinalized?: boolean;
}

export default function GrantCombinedScores({
  grants,
  cycle,
  totalPaid = 0,
  onTentativeApprove,
  onFinalize,
  onCheckStripeStatus,
  onSendMoney,
  loading = false,
  finalizing = false,
  alreadyFinalized = false,
}: GrantCombinedScoresProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleNames, setVisibleNames] = useState<Set<string>>(new Set());
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());

  // Stripe status state
  const [stripeResults, setStripeResults] = useState<Record<string, StripeCheckResult>>({});
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [sendingMoneyFor, setSendingMoneyFor] = useState<string | null>(null);
  const [modalGrantId, setModalGrantId] = useState<string | null>(null);
  const [limitExceededError, setLimitExceededError] = useState<string | null>(null);
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [limitAlertDetails, setLimitAlertDetails] = useState<{amount: number; totalFunds: number; totalPaid: number; remaining: number} | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const handleViewDocument = async (doc: any, grantId: string) => {
    setLoadingDocId(doc.id);
    try {
      const res = await fetch("/api/grants/document-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: doc.document_url, grantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get URL");
      window.open(data.url, "_blank");
    } catch (err: any) {
      alert(err.message || "Failed to open document");
    } finally {
      setLoadingDocId(null);
    }
  };

  const toggleNameVisibility = (grantId: string) => {
    const newVisible = new Set(visibleNames);
    if (newVisible.has(grantId)) {
      newVisible.delete(grantId);
    } else {
      newVisible.add(grantId);
    }
    setVisibleNames(newVisible);
  };

  const maxSelectable = cycle.grants_available;

  // Compute from grants (what API says) OR local state (what user just toggled)
  const getSelectedIds = () => {
    const apiSelected = new Set(
      grants.filter((g) => g.is_tentatively_approved).map((g) => g.id)
    );
    // Merge with localSelected
    const merged = new Set(apiSelected);
    localSelected.forEach((id) => {
      if (apiSelected.has(id)) {
        merged.delete(id);
      } else {
        merged.add(id);
      }
    });
    return merged;
  };

  const selectedIds = getSelectedIds();
  const selectedCount = selectedIds.size;
  const hasPendingChanges = localSelected.size > 0;

  const handleToggle = (grantId: string) => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(grantId)) {
      newSelected.delete(grantId);
    } else {
      if (newSelected.size < maxSelectable) {
        newSelected.add(grantId);
      }
    }
    setLocalSelected(newSelected);
    setSaved(false);
  };

  const handleSaveSelections = async () => {
    setSaving(true);
    await onTentativeApprove(Array.from(selectedIds));
    setSaving(false);
    setSaved(true);
    setLocalSelected(new Set());
  };

  const handleFinalizeClick = () => {
    if (hasPendingChanges) {
      alert("You have unsaved changes. Please click 'Save Selections' before finalizing.");
      return;
    }
    onFinalize();
  };

  const handleToggleExpand = (grantId: string) => {
    setExpandedId(expandedId === grantId ? null : grantId);
  };

  const handleCheckStripeStatus = async () => {
    setCheckingStatus(true);
    try {
      const results = await onCheckStripeStatus();
      const resultsMap: Record<string, StripeCheckResult> = {};
      results.forEach((r) => {
        resultsMap[r.grantId] = r;
      });
      setStripeResults(resultsMap);
    } catch (err) {
      console.error("Failed to check stripe status:", err);
      alert("Failed to check Stripe status");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSendMoneyClick = (grantId: string) => {
    const grant = grants.find((g) => g.id === grantId);
    if (!grant) return;

    const amount = grant.amount_approved || cycle.amount_per_grant;
    const remaining = cycle.total_funds - totalPaid;

    if (amount > remaining) {
      setLimitAlertDetails({
        amount,
        totalFunds: cycle.total_funds,
        totalPaid,
        remaining,
      });
      setShowLimitAlert(true);
      return;
    }

    setModalGrantId(grantId);
  };

  const handleConfirmSendMoney = async () => {
    if (!modalGrantId) return;
    setSendingMoneyFor(modalGrantId);
    try {
      const result = await onSendMoney(modalGrantId);
      if (result?.error) {
        alert(result.error);
        return;
      }
    } catch (err) {
      console.error("Failed to send money:", err);
      alert("Failed to send money");
    } finally {
      setSendingMoneyFor(null);
      setModalGrantId(null);
    }
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

  // Determine if a grant's bank is connected
  const isBankConnected = (grant: Grant): boolean => {
    // If we've checked Stripe and it's confirmed connected
    if (stripeResults[grant.id]?.connected) {
      return true;
    }
    // Fall back to stripe_onboarding_completed from profile
    return grant.profiles?.stripe_onboarding_completed === true;
  };

  // Determine send money button state
  const getSendMoneyButtonState = (grant: Grant): "none" | "disabled" | "active" | "sent" => {
    if (!alreadyFinalized) return "none";
    if (grant.decision !== "Approved") return "none";
    if (grant.funded_at) return "sent";
    if (!grant.stripe_connect_account_id) return "disabled";
    if (!isBankConnected(grant)) return "disabled";
    return "active";
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

  // Modal for confirmation
  const modalGrant = modalGrantId ? grants.find((g) => g.id === modalGrantId) : null;

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
          <div className="border-l border-nfw-blackberry/10 pl-6">
            <p className="text-xs text-nfw-blackberry/50 uppercase tracking-wider">
              Paid
            </p>
            <p className="text-2xl font-black text-green-600">
              {grants.filter((g) => g.funded_at).length}
              <span className="text-sm text-nfw-blackberry/50">/{maxSelectable} grants</span>
            </p>
            <p className="text-sm font-bold text-green-600">
              ${totalPaid.toLocaleString()}
              <span className="text-nfw-blackberry/50"> of ${cycle.total_funds.toLocaleString()}</span>
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
                onClick={handleFinalizeClick}
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
            <>
              <button
                onClick={handleCheckStripeStatus}
                disabled={checkingStatus}
                className="px-4 py-2 bg-nfw-wisteria text-white font-bold text-sm hover:bg-nfw-wisteria/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Stripe Status"
                )}
              </button>
              <span className="px-4 py-2 bg-green-100 text-green-700 font-bold text-sm rounded">
                ✓ Finalized
              </span>
            </>
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
        <div className={`grid gap-2 p-3 border-b border-nfw-blackberry/10 ${alreadyFinalized ? "grid-cols-[36px_48px_minmax(100px,1fr)_72px_80px_48px_56px_48px_120px_80px]" : "grid-cols-[48px_40px_minmax(100px,1fr)_80px_100px_80px_96px_80px_80px]"}`}>
          <div className="text-left text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Rank
          </div>
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            Show
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
          {alreadyFinalized && (
            <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
              Payment
            </div>
          )}
          <div className="text-center text-xs font-bold text-nfw-blackberry/60 uppercase tracking-wider">
            {alreadyFinalized ? "Pay" : "Select"}
          </div>
        </div>

        {/* Grant Rows */}
        <div>
          {grants.map((grant, index) => {
            const isSelected = selectedIds.has(grant.id);
            const isExpanded = expandedId === grant.id;
            const sendMoneyState = getSendMoneyButtonState(grant);
            const isStripeConnected = isBankConnected(grant);

            return (
              <div key={grant.id}>
                {/* Header Row */}
                <div
                  onClick={() => handleToggleExpand(grant.id)}
                  className={`grid gap-2 p-3 border-b border-nfw-blackberry/5 cursor-pointer ${alreadyFinalized ? "grid-cols-[36px_48px_minmax(100px,1fr)_72px_80px_48px_56px_48px_120px_80px]" : "grid-cols-[48px_40px_minmax(100px,1fr)_80px_100px_80px_96px_80px_80px]"} ${isExpanded ? "bg-nfw-aubergine/5 border-l-4 border-l-nfw-aubergine" : isSelected ? "bg-nfw-citrine/20" : "bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-4 h-4 text-nfw-blackberry/40 transition-transform duration-500 ease-in-out ${isExpanded ? "rotate-180" : ""}`}
                    />
                    <span className="w-8 h-8 flex items-center justify-center bg-nfw-blackberry/10 text-sm font-bold text-nfw-blackberry rounded">
                      {grant.rank}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleNameVisibility(grant.id); }}
                      className="p-1 hover:bg-nfw-blackberry/10 rounded transition-colors"
                      title={visibleNames.has(grant.id) ? "Hide name" : "Show name"}
                    >
                      {visibleNames.has(grant.id) ? (
                        <EyeOff className="w-4 h-4 text-nfw-blackberry/40" />
                      ) : (
                        <Eye className="w-4 h-4 text-nfw-blackberry/40" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className={`font-bold text-sm ${visibleNames.has(grant.id) ? "text-nfw-blackberry" : "text-nfw-blackberry/40"}`}>
                        {visibleNames.has(grant.id) ? (grant.profiles?.full_name || "Unknown") : "••••••"}
                      </p>
                      {grant.is_nominating && (
                        <p className="text-xs text-nfw-blackberry/50">
                          Nomination: {visibleNames.has(grant.id) ? grant.nominee_name : "••••••"}
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
                      className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getDecisionStyle(grant.decision)}`}
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
                    {grant.needs_discussion || grant.second_needs_discussion ? (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-semibold">
                          {grant.needs_discussion && grant.second_needs_discussion ? "Both" : "Flagged"}
                        </span>
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
                  {alreadyFinalized && (
                    <div className="flex items-center justify-center">
                      {grant.stripe_connect_account_id ? (
                        isStripeConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700 border border-green-200">
                            <Check className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-500 border border-gray-200">
                            Not Connected
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-400 border border-gray-200">
                          No Account
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-center">
                    {alreadyFinalized ? (
                      sendMoneyState === "sent" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700">
                          <Check className="w-3 h-3" />
                          Paid
                        </span>
                      ) : sendMoneyState === "active" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendMoneyClick(grant.id); }}
                          disabled={sendingMoneyFor === grant.id}
                          className="px-3 py-1.5 bg-nfw-wisteria text-white font-bold text-xs hover:bg-nfw-wisteria/90 disabled:opacity-50 flex items-center gap-1 transition-colors"
                        >
                          {sendingMoneyFor === grant.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              Send
                              <DollarSign className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      ) : sendMoneyState === "disabled" ? (
                        <button
                          disabled
                          className="px-3 py-1.5 bg-gray-100 text-gray-400 font-bold text-xs cursor-not-allowed flex items-center gap-1"
                        >
                          Send
                          <DollarSign className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-nfw-blackberry/30">—</span>
                      )
                    ) : grant.decision === "Approved" && !alreadyFinalized ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(grant.id); }}
                        disabled={!isSelected && selectedCount >= maxSelectable}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected ? "bg-nfw-aubergine border-nfw-aubergine" : "border-nfw-blackberry/20 hover:border-nfw-blackberry/40"}`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
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
                      {grant.documents && grant.documents.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-bold text-nfw-aubergine text-xs uppercase tracking-wider mb-2">
                            Supporting Documents ({grant.documents.length})
                          </h4>
                          <div className="space-y-2">
                            {grant.documents.map((doc: any) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between bg-nfw-dove p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-nfw-blackberry">
                                    {doc.file_name}
                                  </p>
                                  <p className="text-xs text-nfw-blackberry/40">
                                    {(doc.file_size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleViewDocument(doc, grant.id)}
                                  disabled={loadingDocId === doc.id}
                                  className="text-xs font-semibold text-nfw-aubergine hover:text-nfw-aubergine/70 disabled:opacity-50"
                                >
                                  {loadingDocId === doc.id ? "Loading..." : "View →"}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {(grant.needs_discussion || grant.second_needs_discussion) && (
                      <div className="mt-4 space-y-3">
                        {grant.needs_discussion && grant.discussion_notes && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <h4 className="font-bold text-yellow-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Reviewer 1 Notes
                            </h4>
                            <p className="text-sm text-yellow-700">{grant.discussion_notes}</p>
                          </div>
                        )}
                        {grant.second_needs_discussion && grant.second_discussion_notes && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <h4 className="font-bold text-yellow-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Reviewer 2 Notes
                            </h4>
                            <p className="text-sm text-yellow-700">{grant.second_discussion_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalGrant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-nfw-blackberry mb-4">Confirm Transfer</h3>
            <p className="text-nfw-blackberry/70 mb-6">
              You are about to transfer <span className="font-bold">${(modalGrant.amount_approved || cycle.amount_per_grant).toLocaleString()}</span> to{" "}
              <span className="font-bold">{modalGrant.profiles?.full_name || "this applicant"}</span>.
            </p>
            <p className="text-sm text-nfw-blackberry/50 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalGrantId(null)}
                disabled={sendingMoneyFor !== null}
                className="px-4 py-2 bg-gray-100 text-nfw-blackberry font-bold text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSendMoney}
                disabled={sendingMoneyFor !== null}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {sendingMoneyFor === modalGrant.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Money"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Exceeded Alert Modal */}
      {showLimitAlert && limitAlertDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-4">Cannot Process Transfer</h3>
            <p className="text-nfw-blackberry/70 mb-4">
              Sending this <span className="font-bold">${limitAlertDetails.amount.toLocaleString()}</span> grant would exceed the cycle's total funds of <span className="font-bold">${limitAlertDetails.totalFunds.toLocaleString()}</span>.
            </p>
            <div className="bg-gray-50 rounded p-3 mb-6 text-sm space-y-1">
              <p>Total paid so far: <span className="font-bold">${limitAlertDetails.totalPaid.toLocaleString()}</span></p>
              <p>Remaining funds: <span className="font-bold text-red-600">${limitAlertDetails.remaining.toLocaleString()}</span></p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { setShowLimitAlert(false); setLimitAlertDetails(null); }}
                className="px-4 py-2 bg-nfw-aubergine text-white font-bold text-sm hover:bg-nfw-aubergine/90 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
