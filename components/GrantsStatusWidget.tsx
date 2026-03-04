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
    <div className="bg-white rounded-xl border border-[#2d1239]/10 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4f1ad]/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#2d1239]" />
            </div>
            <h3 className="text-lg font-semibold text-[#2d1239]">
              Microgrant Applications
            </h3>
          </div>
          <Link
            href="/grants/apply"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Application
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Total Applications */}
          <div className="p-3 rounded-lg bg-[#f8f7fa] border border-[#2d1239]/5">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-[#2d1239]/40" />
              <span className="text-xs text-[#2d1239]/60">Total</span>
            </div>
            <p className="text-2xl font-bold text-[#2d1239]">
              {statusCounts.total}
            </p>
          </div>

          {/* In Process */}
          <div className="p-3 rounded-lg bg-[#fdf493]/20 border border-[#fdf493]/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-[#2d1239]/60" />
              <span className="text-xs text-[#2d1239]/60">In Review</span>
            </div>
            <p className="text-2xl font-bold text-[#2d1239]">
              {statusCounts.in_process}
            </p>
          </div>

          {/* Approved */}
          <div className="p-3 rounded-lg bg-[#BCAFCF]/20 border border-[#BCAFCF]/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-[#2d1239]/60" />
              <span className="text-xs text-[#2d1239]/60">Approved</span>
            </div>
            <p className="text-2xl font-bold text-[#2d1239]">
              {statusCounts.approved}
            </p>
          </div>

          {/* Funded */}
          <div className="p-3 rounded-lg bg-[#d4f1ad]/30 border border-[#d4f1ad]/50">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#2d1239]/60" />
              <span className="text-xs text-[#2d1239]/60">Funded</span>
            </div>
            <p className="text-2xl font-bold text-[#2d1239]">
              {statusCounts.funded}
            </p>
          </div>
        </div>

        {/* View All Link - Only show if user has applications */}
        {statusCounts.total > 0 && (
          <Link
            href="/grants/view"
            className="inline-flex items-center gap-1 text-[#2d1239] hover:text-[#2d1239]/80 text-sm font-medium transition-colors"
          >
            View All Applications
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
