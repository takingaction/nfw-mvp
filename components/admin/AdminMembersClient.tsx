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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  full_name: string | null;
  email: string;
  age_range: string | null;
  state: string | null;
  city: string | null;
  household_income: string | null;
  identities: string[] | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  joined_at: string | null;
  is_admin: boolean | null;
  access_perks_synced_at: string | null;
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
  const [filter, setFilter] = useState<"all" | "paid" | "free" | "admin">(
    "all",
  );
  const [selected, setSelected] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selfDemoteWarning, setSelfDemoteWarning] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Member>>({});

  const filtered = members.filter((m) => {
    const matchesSearch =
      (m.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (m.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (m.state?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (m.city?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "paid" && m.subscription_status === "active") ||
      (filter === "free" && m.subscription_status !== "active") ||
      (filter === "admin" && m.is_admin);

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
    setPendingChanges((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    const updates: any = {};
    if ("is_admin" in pendingChanges)
      updates.is_admin = pendingChanges.is_admin;
    if ("subscription_status" in pendingChanges)
      updates.subscription_status = pendingChanges.subscription_status;

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

      const updated = { ...selected, ...updates };
      setMembers((prev) =>
        prev.map((m) => (m.id === selected.id ? updated : m)),
      );
      setSelected(updated);
      setPendingChanges({});
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
            {(["all", "paid", "free", "admin"] as const).map((f) => (
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
                    colSpan={7}
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
                        <div className="w-8 h-8 bg-nfw-lilac/40 flex items-center justify-center text-xs font-black text-nfw-blackberry flex-shrink-0">
                          {(member.full_name || member.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-nfw-blackberry">
                            {member.full_name || "—"}
                          </p>
                          <p className="text-xs text-nfw-blackberry/40">
                            {member.email}
                          </p>
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
                <p className="text-xs text-nfw-blackberry/40 mt-0.5">{selected.email}</p>
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
                <div className="w-14 h-14 bg-nfw-lilac/40 flex items-center justify-center text-xl font-black text-nfw-blackberry">
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
                  <p className="text-nfw-blackberry/40 mb-1">Age Range</p>
                  <p className="font-semibold text-nfw-blackberry">
                    {selected.age_range || "—"}
                  </p>
                </div>
                <div className="bg-white p-3 border border-nfw-blackberry/5">
                  <p className="text-nfw-blackberry/40 mb-1">Household Income</p>
                  <p className="font-semibold text-nfw-blackberry">
                    {selected.household_income || "—"}
                  </p>
                </div>
                <div className="bg-white p-3 border border-nfw-blackberry/5 col-span-2">
                  <p className="text-nfw-blackberry/40 mb-1">Identities</p>
                  <p className="font-semibold text-nfw-blackberry">
                    {selected.identities?.join(", ") || "—"}
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
          </div>
        </div>
      )}
    </>
  );
}
