"use client";

import { useState } from "react";
import Link from "next/link";
import { GripVertical, Check } from "lucide-react";
import DeleteCycleButton from "./DeleteCycleButton";

const decodeHtml = (html: string): string => {
  if (typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
};

interface Cycle {
  id: string;
  cycle_name: string;
  status: string;
  start_date: string;
  end_date: string;
  amount_per_grant: number;
  grants_available: number;
  display_order: number;
}

interface Grant {
  id: string;
  status: string;
  cycle_id: string;
}

interface Props {
  cycles: Cycle[];
  grants: Grant[];
}

export default function SortableCycleList({ cycles, grants }: Props) {
  const [orderedCycles, setOrderedCycles] = useState(cycles);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  const getCycleStats = (cycleId: string) => {
    const cycleGrants = grants?.filter((g) => g.cycle_id === cycleId) || [];
    return {
      total: cycleGrants.length,
      submitted: cycleGrants.filter((g) => g.status === "submitted").length,
      in_review: cycleGrants.filter((g) => g.status === "in_review").length,
      approved: cycleGrants.filter((g) => g.status === "approved").length,
      not_approved: cycleGrants.filter((g) => g.status === "not_approved")
        .length,
      payment_pending: cycleGrants.filter((g) => g.status === "payment_pending")
        .length,
      payment_sent: cycleGrants.filter((g) => g.status === "payment_sent")
        .length,
    };
  };

  const statusColor: Record<string, string> = {
    open: "bg-[#d4f1ad] text-nfw-blackberry",
    closed: "bg-gray-100 text-gray-600",
    draft: "bg-nfw-citrine text-nfw-blackberry",
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const saveOrder = async (newOrder: Cycle[]) => {
    try {
      const orderedCycleIds = newOrder.map((c) => c.id);
      const res = await fetch("/api/admin/grants/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedCycleIds }),
      });
      if (!res.ok) throw new Error("Failed to save order");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...orderedCycles];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    setOrderedCycles(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Auto-save the new order
    saveOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {orderedCycles.map((cycle, index) => {
        const stats = getCycleStats(cycle.id);
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={cycle.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`bg-white border-2 transition-all ${
              isDragging
                ? "border-nfw-blackberry/30 opacity-50"
                : isDragOver
                  ? "border-nfw-aubergine"
                  : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-stretch">
              <div
                className={`w-12 flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing ${
                  isDragOver ? "bg-nfw-aubergine/10" : "bg-gray-50"
                }`}
              >
                <GripVertical
                  className={`w-5 h-5 ${
                    isDragOver ? "text-nfw-aubergine" : "text-gray-400"
                  }`}
                />
              </div>

              <div className="flex-1 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-black text-nfw-blackberry font-serif [&_sup]:text-[0.6em] [&_sup]:align-super"
                         dangerouslySetInnerHTML={{ __html: decodeHtml(cycle.cycle_name) }}
                       />
                      <span
                        className={`text-xs px-2.5 py-1 font-semibold ${statusColor[cycle.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {cycle.status}
                      </span>
                    </div>
                    <p className="text-sm text-nfw-blackberry/50">
                      {new Date(cycle.start_date).toLocaleDateString()} —{" "}
                      {new Date(cycle.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-nfw-blackberry font-serif">
                      ${cycle.amount_per_grant?.toLocaleString()}
                    </p>
                    <p className="text-xs text-nfw-blackberry/40">
                      {cycle.grants_available} grants available
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                  {[
                    {
                      label: "Submitted",
                      value: stats.submitted,
                      color: "bg-blue-50 text-blue-700",
                    },
                    {
                      label: "In Review",
                      value: stats.in_review,
                      color: "bg-yellow-50 text-yellow-700",
                    },
                    {
                      label: "Approved",
                      value: stats.approved,
                      color: "bg-green-50 text-green-700",
                    },
                    {
                      label: "Not Approved",
                      value: stats.not_approved,
                      color: "bg-red-50 text-red-700",
                    },
                    {
                      label: "Pmt Pending",
                      value: stats.payment_pending,
                      color: "bg-orange-50 text-orange-700",
                    },
                    {
                      label: "Pmt Sent",
                      value: stats.payment_sent,
                      color: "bg-purple-50 text-purple-700",
                    },
                  ].map((s) => (
                    <div key={s.label} className={`${s.color} p-2 text-center`}>
                      <p className="text-lg font-black">{s.value}</p>
                      <p className="text-xs font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/grants/${cycle.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-blackberry/5 text-nfw-blackberry font-semibold text-sm hover:bg-nfw-blackberry/10 transition-colors"
                  >
                    Review Applications
                  </Link>
                  <Link
                    href={`/admin/grants/${cycle.id}/edit`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-lilac/10 text-nfw-blackberry font-semibold text-sm hover:bg-nfw-lilac/20 transition-colors"
                  >
                    Edit
                  </Link>
                  <DeleteCycleButton
                    cycleId={cycle.id}
                    cycleName={cycle.cycle_name}
                    applicationCount={stats.total}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
