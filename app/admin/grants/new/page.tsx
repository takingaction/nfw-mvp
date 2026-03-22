"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewGrantCyclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    cycle_name: "",
    description: "",
    start_date: "",
    end_date: "",
    amount_per_grant: "",
    grants_available: "",
  });

  const inputClass =
    "w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all";
  const labelClass = "block text-sm font-semibold text-nfw-blackberry mb-1.5";

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
      const res = await fetch("/api/admin/grants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to create grant cycle");
      router.push("/admin/grants");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/admin/grants"
          className="flex items-center gap-2 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Grants
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            New Grant Cycle
          </h1>
          <p className="text-nfw-blackberry/60">
            Create a new microgrant cycle for members to apply to.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-nfw-blackberry/10 p-8 space-y-6"
        >
          <div>
            <label className={labelClass}>
              Grant Cycle Name <span className="text-nfw-lilac">*</span>
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
              <span className="text-nfw-blackberry/40 font-normal">(Optional)</span>
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
                Start Date <span className="text-nfw-lilac">*</span>
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
                End Date <span className="text-nfw-lilac">*</span>
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
                Amount Per Grant <span className="text-nfw-lilac">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-nfw-blackberry/50 text-sm">
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
                Number of Grants <span className="text-nfw-lilac">*</span>
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

          {totalFunds > 0 && (
            <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] p-4">
              <p className="text-sm text-nfw-blackberry/60">Total funds committed</p>
              <p
                className="text-2xl font-black text-nfw-blackberry font-ui"
              >
                ${totalFunds.toLocaleString()}
              </p>
              <p className="text-xs text-nfw-blackberry/50 mt-1">
                {formData.grants_available} grants × $
                {parseFloat(formData.amount_per_grant || "0").toLocaleString()}{" "}
                each
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-nfw-blackberry text-white font-bold hover:bg-nfw-blackberry/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating..." : "Create Grant Cycle"}
            </button>
            <Link
              href="/admin/grants"
              className="px-6 py-3 border border-nfw-blackberry/20 text-nfw-blackberry font-medium hover:bg-nfw-blackberry/5 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
