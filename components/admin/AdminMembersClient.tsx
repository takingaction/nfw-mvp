'use client'

import { useState } from 'react'
import { Search, Shield, CheckCircle, XCircle, Clock, X, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Member = {
  id: string
  full_name: string | null
  email: string
  age_range: string | null
  state: string | null
  city: string | null
  household_income: string | null
  identities: string[] | null
  subscription_status: string | null
  subscription_ends_at: string | null
  joined_at: string | null
  is_admin: boolean | null
  access_perks_synced_at: string | null
}

export default function AdminMembersClient({ members: initialMembers, currentUserId }: { members: Member[], currentUserId: string }) {
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'paid' | 'free' | 'admin'>('all')
  const [selected, setSelected] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [selfDemoteWarning, setSelfDemoteWarning] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Partial<Member>>({})

  const filtered = members.filter(m => {
    const matchesSearch =
      (m.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.state?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.city?.toLowerCase() || '').includes(search.toLowerCase())

    const matchesFilter =
      filter === 'all' ||
      (filter === 'paid' && m.subscription_status === 'active') ||
      (filter === 'free' && m.subscription_status !== 'active') ||
      (filter === 'admin' && m.is_admin)

    return matchesSearch && matchesFilter
  })

  const openEdit = (member: Member) => {
    setSelected(member)
    setPendingChanges({})
    setSaveError('')
    setSelfDemoteWarning(false)
  }

  const closeEdit = () => {
    setSelected(null)
    setPendingChanges({})
    setSaveError('')
    setSelfDemoteWarning(false)
  }

  const handleChange = (field: keyof Member, value: any) => {
    // Warn if demoting self
    if (field === 'is_admin' && value === false && selected?.id === currentUserId) {
      setSelfDemoteWarning(true)
    } else {
      setSelfDemoteWarning(false)
    }
    setPendingChanges(prev => ({ ...prev, [field]: value }))
  }

      const handleSave = async () => {
    if (!selected) return
    setSaving(true)

    const updates: any = {}
    if ('is_admin' in pendingChanges) updates.is_admin = pendingChanges.is_admin
    if ('subscription_status' in pendingChanges) updates.subscription_status = pendingChanges.subscription_status

    if (Object.keys(updates).length === 0) {
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/admin/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selected.id, updates })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save')

      const updated = { ...selected, ...updates }
      setMembers(prev => prev.map(m => m.id === selected.id ? updated : m))
      setSelected(updated)
      setPendingChanges({})
    } catch (err: any) {
      alert(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

    // Update local state
    const updated = { ...selected, ...updates }
    setMembers(prev => prev.map(m => m.id === selected.id ? updated : m))
    setSaving(false)
    closeEdit()
  }

  const statusBadge = (status: string | null) => {
    if (status === 'active') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#d4f1ad] text-[#2d1239]">
        <CheckCircle className="w-3 h-3" /> Active
      </span>
    )
    if (status === 'canceling') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fdf493] text-[#2d1239]">
        <Clock className="w-3 h-3" /> Canceling
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
        <XCircle className="w-3 h-3" /> Free
      </span>
    )
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const currentStatus = 'subscription_status' in pendingChanges
    ? pendingChanges.subscription_status
    : selected?.subscription_status

  const currentIsAdmin = 'is_admin' in pendingChanges
    ? pendingChanges.is_admin
    : selected?.is_admin

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#2d1239] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'paid', 'free', 'admin'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filter === f ? 'bg-[#2d1239] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500 font-medium">
            Showing {filtered.length} of {members.length} members
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Income</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#bcafcf]/40 flex items-center justify-center text-xs font-black text-[#2d1239] flex-shrink-0">
                          {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#2d1239]">{member.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {member.city && member.state ? `${member.city}, ${member.state}` : member.state || '—'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(member.subscription_status)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{member.household_income || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(member.joined_at)}</td>
                    <td className="px-4 py-3">
                      {member.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2d1239] text-white">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Member</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(member)}
                        className="text-xs font-semibold text-[#2d1239] hover:text-[#2d1239]/70 underline transition-colors"
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
          <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#2d1239]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Edit Member
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{selected.email}</p>
              </div>
              <button onClick={closeEdit} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Profile Summary */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#bcafcf]/40 flex items-center justify-center text-xl font-black text-[#2d1239]">
                  {(selected.full_name || selected.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-[#2d1239] text-base">{selected.full_name || 'No name'}</p>
                  <p className="text-sm text-gray-500">{selected.city && selected.state ? `${selected.city}, ${selected.state}` : '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(selected.joined_at)}</p>
                </div>
              </div>

              {/* Read-only details */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-gray-400 mb-1">Age Range</p>
                  <p className="font-semibold text-[#2d1239]">{selected.age_range || '—'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-gray-400 mb-1">Household Income</p>
                  <p className="font-semibold text-[#2d1239]">{selected.household_income || '—'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100 col-span-2">
                  <p className="text-gray-400 mb-1">Identities</p>
                  <p className="font-semibold text-[#2d1239]">
                    {selected.identities?.join(', ') || '—'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100 col-span-2">
                  <p className="text-gray-400 mb-1">Perks Last Synced</p>
                  <p className="font-semibold text-[#2d1239]">{formatDate(selected.access_perks_synced_at)}</p>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="p-6 space-y-6 flex-1">

              {/* Subscription Status */}
              <div>
                <label className="block text-sm font-black text-[#2d1239] mb-3">
                  Subscription Status
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'active', label: 'Active (Paid)', description: 'Full access to all paid benefits', color: 'bg-[#d4f1ad]' },
                    { value: 'canceling', label: 'Canceling', description: 'Active until period ends', color: 'bg-[#fdf493]' },
                    { value: 'cancelled', label: 'Free / Cancelled', description: 'Basic free access only', color: 'bg-gray-100' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        currentStatus === option.value
                          ? 'border-[#2d1239] bg-[#2d1239]/5'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="subscription_status"
                        value={option.value}
                        checked={currentStatus === option.value}
                        onChange={() => handleChange('subscription_status', option.value)}
                        className="mt-0.5 accent-[#2d1239]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${option.color}`}></span>
                          <span className="text-sm font-semibold text-[#2d1239]">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {currentStatus === 'active' && !selected.subscription_status?.includes('active') && (
                  <p className="text-xs text-[#2d1239]/60 mt-2 bg-[#fdf493]/30 rounded-lg p-2">
                    ⚠️ This will manually activate the member without a Stripe payment. Use intentionally.
                  </p>
                )}
              </div>

              {/* Admin Role */}
              <div>
                <label className="block text-sm font-black text-[#2d1239] mb-3">
                  Admin Role
                </label>
                <div className="space-y-2">
                  {[
                    { value: true, label: 'Admin', description: 'Full access to admin dashboard and all management tools' },
                    { value: false, label: 'Member', description: 'Standard member access only' },
                  ].map(option => (
                    <label
                      key={String(option.value)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        currentIsAdmin === option.value
                          ? 'border-[#2d1239] bg-[#2d1239]/5'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="is_admin"
                        checked={currentIsAdmin === option.value}
                        onChange={() => handleChange('is_admin', option.value)}
                        className="mt-0.5 accent-[#2d1239]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          {option.value && <Shield className="w-3 h-3 text-[#2d1239]" />}
                          <span className="text-sm font-semibold text-[#2d1239]">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Self-demotion warning */}
                {selfDemoteWarning && (
                  <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium">
                      You are removing admin access from your own account. You will lose access to the admin dashboard immediately after saving.
                    </p>
                  </div>
                )}
              </div>

              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-600">{saveError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeEdit}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || Object.keys(pendingChanges).length === 0}
                className="flex-1 py-3 rounded-xl bg-[#2d1239] text-white text-sm font-bold hover:bg-[#2d1239]/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}