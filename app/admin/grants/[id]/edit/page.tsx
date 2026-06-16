"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";

export default function EditGrantCyclePage() {
  const router = useRouter();
  const params = useParams();
  const cycleId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");

  const [formData, setFormData] = useState({
    cycle_name: "",
    description: "",
    start_date: "",
    end_date: "",
    amount_per_grant: "",
    grants_available: "",
    status: "open",
    featured_image: "",
  });

  const inputClass =
    "w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all";
  const labelClass = "block text-sm font-semibold text-nfw-blackberry mb-1.5";

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
          featured_image: data.featured_image || "",
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
    setError("");

    // Validate date conflicts when opening a cycle
    if (formData.status === "open" && pendingStatus !== "open") {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Check if end_date has passed (EST)
      if (formData.end_date < todayStr) {
        setConfirmMessage(
          "This grant's end date has already passed. Opening it now will allow applications outside the intended timeframe. Are you sure you want to open it?"
        );
        setPendingStatus("open");
        setShowConfirmModal(true);
        return;
      }

      // Check if start_date hasn't arrived yet (EST)
      if (formData.start_date > todayStr) {
        setConfirmMessage(
          "This grant's start date hasn't arrived yet. Opening it early will allow applications before the intended start date. Are you sure you want to open it early?"
        );
        setPendingStatus("open");
        setShowConfirmModal(true);
        return;
      }
    }

    await submitCycle();
  };

  const submitCycle = async () => {
    setLoading(true);
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

  const handleConfirmYes = () => {
    setShowConfirmModal(false);
    setPendingStatus("");
    submitCycle();
  };

  const handleConfirmNo = () => {
    setShowConfirmModal(false);
    setPendingStatus("");
  };

  if (fetching) {
    return (
      <main className="min-h-screen p-8 bg-nfw-dove flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-nfw-blackberry" />
      </main>
    );
  }

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
            Edit Grant Cycle
          </h1>
          <p className="text-nfw-blackberry/60">
            Update the details of this grant cycle.
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
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Featured Image{" "}
              <span className="text-nfw-blackberry/40 font-normal">(Optional)</span>
            </label>
            <p className="text-xs text-nfw-blackberry/50 mb-2">
              Image shown in the dashboard Popular across NFW section
            </p>
            <div className="border border-nfw-blackberry/20 p-4 bg-nfw-dove/50">
              {formData.featured_image ? (
                <div className="flex items-center gap-4">
                  <img
                    src={formData.featured_image}
                    alt="Featured"
                    className="w-24 h-24 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaLibraryOpen(true)}
                    className="text-nfw-aubergine hover:underline text-sm"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMediaLibraryOpen(true)}
                  className="w-full py-4 border-2 border-dashed border-nfw-blackberry/20 hover:border-nfw-aubergine text-nfw-blackberry/40 hover:text-nfw-aubergine transition-colors text-sm"
                >
                  + Select Featured Image
                </button>
              )}
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
              {loading ? "Saving..." : "Save Changes"}
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

      <MediaLibraryModal
        isOpen={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={(url) => {
          setFormData({ ...formData, featured_image: url });
          setMediaLibraryOpen(false);
        }}
        bucket="page-builder"
      />

      {showConfirmModal && (
        <div className="fixed inset-0 bg-blackberry/50 flex items-center justify-center z-50">
          <div className="bg-white border border-nfw-blackberry/10 p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-nfw-blackberry font-serif mb-4">
              Date Conflict Warning
            </h3>
            <p className="text-nfw-blackberry/70 mb-6 font-serif">
              {confirmMessage}
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleConfirmYes}
                className="flex-1 py-3 bg-nfw-aubergine text-white font-bold hover:bg-nfw-aubergine/90 transition-colors"
              >
                Yes, Open Anyway
              </button>
              <button
                onClick={handleConfirmNo}
                className="px-6 py-3 border border-nfw-blackberry/20 text-nfw-blackberry font-medium hover:bg-nfw-blackberry/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
