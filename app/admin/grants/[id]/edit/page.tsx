"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditGrantCyclePage() {
  const router = useRouter();
  const params = useParams();
  const cycleId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    cycle_name: "",
    description: "",
    start_date: "",
    end_date: "",
    amount_per_grant: "",
    grants_available: "",
    status: "open",
  });

  const inputClass =
    "w-full px-4 py-3 border border-[#2d1239]/20 rounded-xl text-[#2d1239] placeholder-[#2d1239]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#bcafcf] focus:border-transparent transition-all";
  const labelClass = "block text-sm font-semibold text-[#2d1239] mb-1.5";

  useEffect(() => {
    const fetchCycle = async () => {
      try {
        const res = await fetch(`/api/admin/grants/get-cycle?id=${cycleId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load cycle");
        setFormData({
          cycle_name: data.cycle_name || "",
          description: data.description || "",
          start_date: data.start_date?.split("T")[0] || "",
          end_date: data.end_date?.split("T")[0] || "",
          amount_per_grant: data.amount_per_grant?.toString() || "",
          grants_available: data.grants_available?.toString() || "",
          status: data.status || "open",
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    };
    fetchCycle();
  }, [cycleId]);

  const totalFunds =
    formData.amount_per_grant && formData.grants_available
      ? parseFloat(formData.amount_per_grant) *
        parseInt(formData.grants_available)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/grants/update-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId, ...formData }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to update grant cycle");
      router.push("/admin/grants");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2d1239]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/admin/grants"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#2d1239] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Grants
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d1239] mb-2">
            Edit Grant Cycle
          </h1>
          <p className="text-gray-600">
            Update the details of this grant cycle.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6"
        >
          <div>
            <label className={labelClass}>
              Grant Cycle Name <span className="text-[#bcafcf]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.cycle_name}
              onChange={(e) =>
                setFormData({ ...formData, cycle_name: e.target.value })
              }
              placeholder="e.g., Spring 2026 Microgrants"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Description{" "}
              <span className="text-[#2d1239]/40 font-normal">(Optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe this grant cycle..."
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Start Date <span className="text-[#bcafcf]">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                End Date <span className="text-[#bcafcf]">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Amount Per Grant <span className="text-[#bcafcf]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-[#2d1239]/50 text-sm">
                  $
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formData.amount_per_grant}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount_per_grant: e.target.value,
                    })
                  }
                  placeholder="500.00"
                  className={inputClass + " pl-8"}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Number of Grants <span className="text-[#bcafcf]">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.grants_available}
                onChange={(e) =>
                  setFormData({ ...formData, grants_available: e.target.value })
                }
                placeholder="10"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className={inputClass}
            >
              <option value="open">Open — accepting applications</option>
              <option value="closed">
                Closed — no longer accepting applications
              </option>
              <option value="draft">Draft — not yet visible to members</option>
            </select>
          </div>

          {totalFunds > 0 && (
            <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] rounded-xl p-4">
              <p className="text-sm text-[#2d1239]/60">Total funds committed</p>
              <p
                className="text-2xl font-black text-[#2d1239]"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                ${totalFunds.toLocaleString()}
              </p>
              <p className="text-xs text-[#2d1239]/50 mt-1">
                {formData.grants_available} grants × $
                {parseFloat(formData.amount_per_grant || "0").toLocaleString()}{" "}
                each
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#2d1239] text-white rounded-xl font-bold hover:bg-[#2d1239]/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/admin/grants"
              className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
