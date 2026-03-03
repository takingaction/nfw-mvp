'use client'

import { useState } from 'react'
import { Loader2, ChevronDown, ChevronUp, FileText, User, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'not_approved', label: 'Not Approved', color: 'bg-red-100 text-red-700' },
  { value: 'payment_pending', label: 'Payment Pending', color: 'bg-orange-100 text-orange-700' },
  { value: 'payment_sent', label: 'Payment Sent', color: 'bg-purple-100 text-purple-700' },
]

export default function AdminGrantReviewer({ grants, cycle }: { grants: any[], cycle: any }) {
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingStatus, setPendingStatus] = useState('')
  const [amountApproved, setAmountApproved] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [localGrants, setLocalGrants] = useState(grants)

  const filtered = filter === 'all'
    ? localGrants
    : localGrants.filter(g => g.status === filter)

  const openGrant = (grant: any) => {
    setSelected(grant)
    setPendingStatus(grant.status)
    setAmountApproved(grant.amount_approved?.toString() || cycle.amount_per_grant?.toString() || '')
    setAdminNotes(grant.admin_notes || '')
    setError('')
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/grants/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId: selected.id,
          status: pendingStatus,
          amount_approved: amountApproved ? parseFloat(amountApproved) : undefined,
          admin_notes: adminNotes,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')

      setLocalGrants(prev => prev.map(g =>
        g.id === selected.id
          ? { ...g, status: pendingStatus, amount_approved: amountApproved, admin_notes: adminNotes }
          : g
      ))
      setSelected(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusStyle = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-600'
  }

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.label || status
  }

  return (
    <div className="flex gap-6">

      {/* Left — Application List */}
      <div className="flex-1 min-w-0">

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {['all', ...STATUS_OPTIONS.map(s => s.value)].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-[#2d1239] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? `All (${localGrants.length})` : `${getStatusLabel(f)} (${localGrants.filter(g => g.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Applications */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400">No applications in this category.</p>
            </div>
          ) : (
            filtered.map(grant => (
              <div
                key={grant.id}
                onClick={() => openGrant(grant)}
                className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                  selected?.id === grant.id ? 'border-[#2d1239]' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#bcafcf]/30 flex items-center justify-center text-sm font-black text-[#2d1239] flex-shrink-0">
                      {(grant.profiles?.full_name || grant.profiles?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#2d1239]">{grant.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{grant.profiles?.email}</p>
                      {grant.profiles?.city && (
                        <p className="text-xs text-gray-400">{grant.profiles.city}, {grant.profiles.state}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusStyle(grant.status)}`}>
                      {getStatusLabel(grant.status)}
                    </span>
                    {grant.is_nominating && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#bcafcf]/20 text-[#2d1239] font-medium">
                        Nomination
                      </span>
                    )}
                    <p className="text-xs text-gray-400">
                      {grant.submitted_at ? new Date(grant.submitted_at).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{grant.who_are_you}</p>
                {grant.documents?.length > 0 && (
                  <p className="text-xs text-[#2d1239]/50 mt-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {grant.documents.length} document{grant.documents.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right — Review Panel */}
      {selected && (
        <div className="w-[420px] flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-black text-[#2d1239]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Review Application
              </h2>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Applicant Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-[#bcafcf]/30 flex items-center justify-center text-lg font-black text-[#2d1239]">
                    {(selected.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-[#2d1239]">{selected.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{selected.profiles?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selected.profiles?.city && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-gray-400">Location</p>
                      <p className="font-semibold text-[#2d1239]">{selected.profiles.city}, {selected.profiles.state}</p>
                    </div>
                  )}
                  {selected.profiles?.age_range && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-gray-400">Age Range</p>
                      <p className="font-semibold text-[#2d1239]">{selected.profiles.age_range}</p>
                    </div>
                  )}
                  {selected.profiles?.household_income && (
                    <div className="bg-white rounded-lg p-2 border border-gray-100 col-span-2">
                      <p className="text-gray-400">Household Income</p>
                      <p className="font-semibold text-[#2d1239]">{selected.profiles.household_income}</p>
                    </div>
                  )}
                </div>
                {selected.is_nominating && (
                  <div className="mt-2 px-3 py-1.5 bg-[#bcafcf]/20 rounded-lg">
                    <p className="text-xs font-semibold text-[#2d1239]">⭐ This is a nomination</p>
                  </div>
                )}
              </div>

              {/* Application Answers */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {selected.is_nominating ? 'About the nominee' : 'Who are you?'}
                  </p>
                  <p className="text-sm text-[#2d1239] leading-relaxed">{selected.who_are_you}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Biggest Challenge</p>
                  <p className="text-sm text-[#2d1239] leading-relaxed">{selected.biggest_challenge}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fund Usage</p>
                  <p className="text-sm text-[#2d1239] leading-relaxed">{selected.fund_usage}</p>
                </div>
              </div>

              {/* Documents */}
              {selected.documents?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Documents</p>
                  <div className="space-y-2">
                    {selected.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-[#2d1239]">{doc.file_name}</p>
                          <p className="text-xs text-gray-400">{(doc.file_size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await fetch('/api/grants/document-url', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ filePath: doc.document_url, grantId: selected.id })
                            })
                            const data = await res.json()
                            if (data.url) window.open(data.url, '_blank')
                          }}
                          className="text-xs font-semibold text-[#2d1239] hover:text-[#2d1239]/70 transition-colors"
                        >
                          View →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Update Status</p>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        pendingStatus === option.value ? 'border-[#2d1239] bg-[#2d1239]/5' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={pendingStatus === option.value}
                        onChange={() => setPendingStatus(option.value)}
                        className="accent-[#2d1239]"
                      />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${option.color}`}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Amount Approved (shown when approving) */}
              {(pendingStatus === 'approved' || pendingStatus === 'payment_pending' || pendingStatus === 'payment_sent') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Amount Approved
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[#2d1239]/50 text-sm">$</span>
                    <input
                      type="number"
                      value={amountApproved}
                      onChange={e => setAmountApproved(e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 border border-[#2d1239]/20 rounded-xl text-[#2d1239] bg-white focus:outline-none focus:ring-2 focus:ring-[#bcafcf] text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Add internal notes (not visible to applicant)..."
                  className="w-full px-3 py-2.5 border border-[#2d1239]/20 rounded-xl text-[#2d1239] placeholder-[#2d1239]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#bcafcf] text-sm resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-[#2d1239] text-white rounded-xl font-bold hover:bg-[#2d1239]/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {/* Delete Button */}
              <button
                                onClick={() => {
                  setTimeout(async () => {
                    if (!confirm(`Are you sure you want to permanently delete this application from ${selected.profiles?.full_name || 'this applicant'}? This cannot be undone.`)) return
                    setSaving(true)
                    try {
                      const res = await fetch('/api/admin/grants/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ grantId: selected.id })
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || 'Failed to delete')
                      setLocalGrants(prev => prev.filter(g => g.id !== selected.id))
                      setSelected(null)
                    } catch (err: any) {
                      setError(err.message)
                    } finally {
                      setSaving(false)
                    }
                  }, 0)
                }}
                disabled={saving}
                className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 disabled:opacity-50 transition-colors text-sm"
              >
                Delete Application
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}