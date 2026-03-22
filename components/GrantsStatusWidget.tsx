"use client";

import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  DollarSign,
  Plus,
  ChevronRight,
} from "lucide-react";

interface GrantsStatusWidgetProps {
  statusCounts: {
    total: number;
    in_process: number;
    approved: number;
    funded: number;
  };
}

export default function GrantsStatusWidget({
  statusCounts,
}: GrantsStatusWidgetProps) {
  return (
    <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nfw-lilac flex items-center justify-center">
              <FileText className="w-5 h-5 text-nfw-blackberry" />
            </div>
            <h3 className="text-lg font-semibold text-nfw-aubergine">
              Microgrant Applications
            </h3>
          </div>
          <Link
            href="/grants/apply"
            className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Application
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Total Applications */}
          <div className="p-3 bg-nfw-dove border border-nfw-blackberry/5">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-nfw-blackberry/40" />
              <span className="text-xs text-nfw-blackberry/60">Total</span>
            </div>
            <p className="text-2xl font-bold text-nfw-blackberry">
              {statusCounts.total}
            </p>
          </div>

          {/* In Process */}
          <div className="p-3 bg-nfw-citrine/20 border border-nfw-citrine/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-nfw-blackberry/60" />
              <span className="text-xs text-nfw-blackberry/60">In Review</span>
            </div>
            <p className="text-2xl font-bold text-nfw-blackberry">
              {statusCounts.in_process}
            </p>
          </div>

          {/* Approved */}
          <div className="p-3 bg-nfw-lilac/20 border border-nfw-lilac/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-nfw-blackberry/60" />
              <span className="text-xs text-nfw-blackberry/60">Approved</span>
            </div>
            <p className="text-2xl font-bold text-nfw-blackberry">
              {statusCounts.approved}
            </p>
          </div>

          {/* Funded */}
          <div className="p-3 bg-nfw-citrine/30 border border-nfw-citrine/50">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-nfw-blackberry/60" />
              <span className="text-xs text-nfw-blackberry/60">Funded</span>
            </div>
            <p className="text-2xl font-bold text-nfw-blackberry">
              {statusCounts.funded}
            </p>
          </div>
        </div>

        {/* View All Link - Only show if user has applications */}
        {statusCounts.total > 0 && (
          <Link
            href="/grants/view"
            className="inline-flex items-center gap-1 text-nfw-blackberry hover:text-nfw-blackberry/80 text-sm font-medium transition-colors"
          >
            View All Applications
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
