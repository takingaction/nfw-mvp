"use client";

import { useState } from "react";
import {
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  X,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FreeMembershipApprovalModal } from "@/components/admin/FreeMembershipApprovalModal";

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  state: string | null;
  city: string | null;
  household_income: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  joined_at: string | null;
  is_admin: boolean | null;
  access_perks_synced_at: string | null;
  membership_level: string | null;
  profile_completed: boolean | null;
  is_approved_free_member: boolean | null;
  free_membership_contact_submitted: boolean | null;
};

export default function AdminMembersClient({
  members: initialMembers,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "free" | "admin" | "incomplete" | "pending">(
    "all",
  );
  const [selected, setSelected] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selfDemoteWarning, setSelfDemoteWarning] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Member>>({});
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Approval confirmation modal state
  const [showApprovalConfirmModal, setShowApprovalConfirmModal] = useState(false);
  const [pendingApprovalValue, setPendingApprovalValue] = useState<boolean | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  const filtered = members.filter((m) => {
    const matchesSearch =
      (m.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (m.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (m.state?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (m.city?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "paid" && (m.membership_level === "contributing" || m.membership_level === "founding")) ||
      (filter === "free" && (m.membership_level === "free" || m.membership_level === null)) ||
      (filter === "admin" && m.is_admin) ||
      (filter === "incomplete" && !m.profile_completed) ||
      (filter === "pending" &&
        m.membership_level === "free" &&
        m.free_membership_contact_submitted === true &&
        m.is_approved_free_member !== true);

    return matchesSearch && matchesFilter;
  });

  const openEdit = (member: Member) => {
    setSelected(member);
    setPendingChanges({});
    setSaveError("");
    setSelfDemoteWarning(false);
  };

  const closeEdit = () => {
    setSelected(null);
    setPendingChanges({});
    setSaveError("");
    setSelfDemoteWarning(false);
    setShowApprovalConfirmModal(false);
    setPendingApprovalValue(null);
    setEmailSendError(null);
  };

  const handleChange = (field: keyof Member, value: any) => {
    // Warn if demoting self
    if (
      field === "is_admin" &&
      value === false &&
      selected?.id === currentUserId
    ) {
      setSelfDemoteWarning(true);
    } else {
      setSelfDemoteWarning(false);
    }

    // Show confirmation modal when approving free membership
    if (
      field === "is_approved_free_member" &&
      value === true &&
      selected?.membership_level === "free"
    ) {
      setPendingApprovalValue(true);
      setShowApprovalConfirmModal(true);
      return;
    }

    setPendingChanges((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setEmailSendError(null);

    const updates: any = {};
    if ("is_admin" in pendingChanges)
      updates.is_admin = pendingChanges.is_admin;
    if ("subscription_status" in pendingChanges)
      updates.subscription_status = pendingChanges.subscription_status;
    // Use pendingApprovalValue if set (from approval confirmation modal), otherwise use pendingChanges
    if (pendingApprovalValue !== null) {
      updates.is_approved_free_member = pendingApprovalValue;
    } else if ("is_approved_free_member" in pendingChanges) {
      updates.is_approved_free_member = pendingChanges.is_approved_free_member;
    }

    if (Object.keys(updates).length === 0) {
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/update-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selected.id, updates }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      // If approving free membership, send welcome email
      if (pendingApprovalValue === true) {
        setSendingEmail(true);
        try {
          const emailRes = await fetch("/api/admin/members/send-welcome-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: selected.id }),
          });
          const emailResult = await emailRes.json();
          if (!emailRes.ok) {
            throw new Error(emailResult.error || "Failed to send email");
          }
        } catch (emailErr: any) {
          console.error("Failed to send welcome email:", emailErr);
          setEmailSendError(emailErr.message || "Failed to send email");
          // Don't block - still show success
        } finally {
          setSendingEmail(false);
        }
      }

      // Close modal and reload
      setShowApprovalConfirmModal(false);
      setPendingApprovalValue(null);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string | null) => {
    if (status === "active")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#d4f1ad] text-nfw-blackberry">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      );
    if (status === "canceling")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#fdf493] text-nfw-blackberry">
          <Clock className="w-3 h-3" /> Canceling
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-nfw-stone/20 text-nfw-blackberry/60">
        <XCircle className="w-3 h-3" /> Free
      </span>
    );
  };

  const membershipBadge = (level: string | null, member: Member) => {
    if (level === "founding")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#fdf493] text-nfw-blackberry">
          Founding
        </span>
      );
    if (level === "contributing")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#d4f1ad] text-nfw-blackberry">
          Contributing
        </span>
      );
    if (level === "free") {
      // Free (Pending) - contact submitted, not yet approved
      if (member.free_membership_contact_submitted && member.is_approved_free_member !== true) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-nfw-citrine text-nfw-blackberry">
            Free (Pending)
          </span>
        );
      }
      // Free (Started) - started the flow but hasn't submitted contact form
      if (!member.free_membership_contact_submitted && member.is_approved_free_member !== true) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-nfw-wisteria text-white">
            Free (Started)
          </span>
        );
      }
      // Free - approved member
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-nfw-stone/20 text-nfw-blackberry/60">
          Free
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-nfw-stone/20 text-nfw-blackberry/60">
        Free
      </span>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const currentStatus =
    "subscription_status" in pendingChanges
      ? pendingChanges.subscription_status
      : selected?.subscription_status;

  const currentIsAdmin =
    "is_admin" in pendingChanges ? pendingChanges.is_admin : selected?.is_admin;

  const currentIsApprovedFreeMember =
    "is_approved_free_member" in pendingChanges
      ? pendingChanges.is_approved_free_member
      : selected?.is_approved_free_member;

  return (
    <>
      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-nfw-blackberry/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/30" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "paid", "free", "incomplete", "admin", "pending"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  filter === f
                    ? "bg-nfw-blackberry text-white"
                    : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-2 bg-nfw-dove border-b border-nfw-blackberry/5">
          <p className="text-xs text-nfw-blackberry/50 font-medium">
            Showing {filtered.length} of {members.length} members
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-nfw-dove border-b border-nfw-blackberry/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Membership
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Income
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nfw-blackberry/5">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-nfw-blackberry/40 text-sm"
                  >
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-nfw-dove/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center text-xs font-black text-nfw-blackberry flex-shrink-0 ${member.profile_completed ? "bg-nfw-lilac/40" : "bg-nfw-stone/40"}`}>
                          {(member.full_name || member.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-nfw-blackberry">
                            {member.full_name || "—"}
                          </p>
                          {member.email ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`mailto:${member.email}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-nfw-aubergine hover:underline truncate max-w-[180px]"
                              >
                                {member.email}
                              </a>
                              <button
                                onClick={() => copyEmail(member.email!)}
                                className="p-1 hover:bg-nfw-blackberry/5 rounded flex-shrink-0"
                                title="Copy email"
                              >
                                {copiedEmail === member.email ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-nfw-blackberry/40" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-nfw-blackberry/40">No email</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-nfw-blackberry/60 text-xs">
                      {member.city && member.state
                        ? `${member.city}, ${member.state}`
                        : member.state || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(member.subscription_status)}
                    </td>
                    <td className="px-4 py-3">
                      {membershipBadge(member.membership_level, member)}
                    </td>
                    <td className="px-4 py-3 text-nfw-blackberry/60 text-xs">
                      {member.household_income || "—"}
                    </td>
                    <td className="px-4 py-3 text-nfw-blackberry/50 text-xs">
                      {formatDate(member.joined_at)}
                    </td>
                    <td className="px-4 py-3">
                      {member.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-nfw-blackberry text-white">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-nfw-blackberry/40">Member</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(member)}
                        className="text-xs font-semibold text-nfw-blackberry hover:text-nfw-blackberry/70 underline transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Slide-over Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-white flex flex-col h-full overflow-y-auto border-l border-nfw-blackberry/10">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-nfw-blackberry/5">
              <div>
                <h2
                  className="text-lg font-black text-nfw-blackberry font-ui"
                >
                  Edit Member
                </h2>
                <div className="flex items-center gap-2">
                    {selected.email ? (
                      <>
                        <a
                          href={`mailto:${selected.email}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-nfw-aubergine hover:underline"
                        >
                          {selected.email}
                        </a>
                        <button
                          onClick={() => copyEmail(selected.email!)}
                          className="p-1 hover:bg-nfw-blackberry/5 rounded"
                          title="Copy email"
                        >
                          {copiedEmail === selected.email ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-nfw-blackberry/40" />
                          )}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-nfw-blackberry/40">No email</p>
                    )}
                  </div>
              </div>
              <button
                onClick={closeEdit}
                className="p-2 hover:bg-nfw-blackberry/5 transition-colors"
              >
                <X className="w-5 h-5 text-nfw-blackberry/50" />
              </button>
            </div>

            {/* Profile Summary */}
            <div className="p-6 border-b border-nfw-blackberry/5 bg-nfw-dove">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 flex items-center justify-center text-xl font-black text-nfw-blackberry ${selected.profile_completed ? "bg-nfw-lilac/40" : "bg-nfw-stone/40"}`}>
                  {(selected.full_name || selected.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-nfw-blackberry text-base">
                    {selected.full_name || "No name"}
                  </p>
                  <p className="text-sm text-nfw-blackberry/50">
                    {selected.city && selected.state
                      ? `${selected.city}, ${selected.state}`
                      : "—"}
                  </p>
                  <p className="text-xs text-nfw-blackberry/40 mt-0.5">
                    Joined {formatDate(selected.joined_at)}
                  </p>
                </div>
              </div>

              {/* Read-only details */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 border border-nfw-blackberry/5">
                  <p className="text-nfw-blackberry/40 mb-1">Date of Birth</p>
                  <p className="font-semibold text-nfw-blackberry">
                    {selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "—"}
                  </p>
                </div>
                <div className="bg-white p-3 border border-nfw-blackberry/5">
                  <p className="text-nfw-blackberry/40 mb-1">Household Income</p>
                  <p className="font-semibold text-nfw-blackberry">
                    {selected.household_income || "—"}
                  </p>
                </div>
                <div className="bg-white p-3 border border-nfw-blackberry/5 col-span-2">
                  <p className="text-nfw-blackberry/40 mb-1">Perks Last Synced</p>
                  <p className="font-semibold text-nfw-blackberry">
                    {formatDate(selected.access_perks_synced_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="p-6 space-y-6 flex-1">
              {/* Subscription Status */}
              <div>
                <label className="block text-sm font-black text-nfw-blackberry mb-3">
                  Subscription Status
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: "active",
                      label: "Active (Paid)",
                      description: "Full access to all paid benefits",
                      color: "bg-[#d4f1ad]",
                    },
                    {
                      value: "canceling",
                      label: "Canceling",
                      description: "Active until period ends",
                      color: "bg-[#fdf493]",
                    },
                    {
                      value: "cancelled",
                      label: "Free / Cancelled",
                      description: "Basic free access only",
                      color: "bg-nfw-stone/20",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-all ${
                        currentStatus === option.value
                          ? "border-nfw-blackberry bg-nfw-blackberry/5"
                          : "border-nfw-blackberry/5 hover:border-nfw-blackberry/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="subscription_status"
                        value={option.value}
                        checked={currentStatus === option.value}
                        onChange={() =>
                          handleChange("subscription_status", option.value)
                        }
                        className="mt-0.5 accent-nfw-blackberry"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 ${option.color}`}
                          ></span>
                          <span className="text-sm font-semibold text-nfw-blackberry">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-nfw-blackberry/40 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {currentStatus === "active" &&
                  !selected.subscription_status?.includes("active") && (
                    <p className="text-xs text-nfw-blackberry/60 mt-2 bg-[#fdf493]/30 p-2">
                      This will manually activate the member without a Stripe
                      payment. Use intentionally.
                    </p>
                  )}
              </div>

              {/* Admin Role */}
              <div>
                <label className="block text-sm font-black text-nfw-blackberry mb-3">
                  Admin Role
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: true,
                      label: "Admin",
                      description:
                        "Full access to admin dashboard and all management tools",
                    },
                    {
                      value: false,
                      label: "Member",
                      description: "Standard member access only",
                    },
                  ].map((option) => (
                    <label
                      key={String(option.value)}
                      className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-all ${
                        currentIsAdmin === option.value
                          ? "border-nfw-blackberry bg-nfw-blackberry/5"
                          : "border-nfw-blackberry/5 hover:border-nfw-blackberry/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="is_admin"
                        checked={currentIsAdmin === option.value}
                        onChange={() => handleChange("is_admin", option.value)}
                        className="mt-0.5 accent-nfw-blackberry"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          {option.value && (
                            <Shield className="w-3 h-3 text-nfw-blackberry" />
                          )}
                          <span className="text-sm font-semibold text-nfw-blackberry">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-nfw-blackberry/40 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Self-demotion warning */}
                {selfDemoteWarning && (
                  <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium">
                      You are removing admin access from your own account. You
                      will lose access to the admin dashboard immediately after
                      saving.
                    </p>
                  </div>
                )}
              </div>

              {/* Free Membership Status - only show for free members */}
              {selected?.membership_level === "free" && (
                <div>
                  <label className="block text-sm font-black text-nfw-blackberry mb-3">
                    Free Membership Status
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-all ${
                        currentIsApprovedFreeMember === true
                          ? "border-nfw-blackberry bg-nfw-blackberry/5"
                          : "border-nfw-blackberry/5 hover:border-nfw-blackberry/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="is_approved_free_member"
                        value="true"
                        checked={currentIsApprovedFreeMember === true}
                        onChange={() =>
                          handleChange("is_approved_free_member", true)
                        }
                        className="mt-0.5 accent-nfw-blackberry"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-nfw-blackberry">
                            Approved
                          </span>
                        </div>
                        <p className="text-xs text-nfw-blackberry/40 mt-0.5">
                          Member has full access to free member benefits
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-all ${
                        currentIsApprovedFreeMember === false
                          ? "border-nfw-blackberry bg-nfw-blackberry/5"
                          : "border-nfw-blackberry/5 hover:border-nfw-blackberry/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="is_approved_free_member"
                        value="false"
                        checked={currentIsApprovedFreeMember === false}
                        onChange={() =>
                          handleChange("is_approved_free_member", false)
                        }
                        className="mt-0.5 accent-nfw-blackberry"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-nfw-blackberry">
                            Pending Approval
                          </span>
                        </div>
                        <p className="text-xs text-nfw-blackberry/40 mt-0.5">
                          Member is waiting for admin review to access benefits
                        </p>
                      </div>
                    </label>
                  </div>
                  {selected?.is_approved_free_member === false && (
                    <p className="text-xs text-nfw-blackberry/60 mt-2 bg-nfw-citrine/20 p-2">
                      This member submitted a free membership request but hasn't been approved yet. Toggle to "Approved" to give them access.
                    </p>
                  )}
                </div>
              )}

              {saveError && (
                <div className="bg-red-50 border border-red-200 p-3">
                  <p className="text-xs text-red-600">{saveError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-nfw-blackberry/5 flex gap-3">
              <button
                onClick={closeEdit}
                className="flex-1 py-3 border-2 border-nfw-blackberry/20 text-sm font-semibold text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || Object.keys(pendingChanges).length === 0}
                className="flex-1 py-3 bg-nfw-blackberry text-white text-sm font-bold hover:bg-nfw-blackberry/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Approval Confirmation Modal */}
            <FreeMembershipApprovalModal
              isOpen={showApprovalConfirmModal}
              onClose={() => {
                setShowApprovalConfirmModal(false);
                setPendingApprovalValue(null);
              }}
              onConfirm={handleSave}
              memberName={selected?.full_name || undefined}
              sendingEmail={sendingEmail}
              saving={saving}
              emailSendError={emailSendError}
            />
          </div>
        </div>
      )}
    </>
  );
}
