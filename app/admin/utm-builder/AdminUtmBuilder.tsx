"use client";

import { useState, useEffect, useCallback } from "react";

interface Channel {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  display_order: number;
  utm_sources: { id: string; name: string; slug: string }[];
  utm_mediums: { id: string; name: string; slug: string }[];
}

interface UtmLink {
  id: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  campaign_title: string | null;
  utm_content: string | null;
  utm_term: string | null;
  channel_name: string | null;
  created_by_email: string | null;
  created_at: string;
}

interface AdminUtmBuilderProps {
  userEmail: string;
}

function slugify(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function AdminUtmBuilder({ userEmail }: AdminUtmBuilderProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [links, setLinks] = useState<UtmLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>("");
  const [showManage, setShowManage] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [configSavedMsg, setConfigSavedMsg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<UtmLink | null>(null);
  const [editForm, setEditForm] = useState({ destination_url: "", utm_source: "", utm_medium: "", utm_campaign: "", campaign_title: "", utm_content: "", utm_term: "", channel_id: "", channel_name: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Form state
  const [baseUrl, setBaseUrl] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [selectedMedium, setSelectedMedium] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignSlug, setCampaignSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showSlugWarning, setShowSlugWarning] = useState(false);
  const [pendingSlugValue, setPendingSlugValue] = useState("");
  const [slugWarningCallback, setSlugWarningCallback] = useState<(() => void) | null>(null);
  const [content, setContent] = useState("");
  const [term, setTerm] = useState("");

  // Manage panel state
  const [editingChannels, setEditingChannels] = useState<Channel[]>([]);
  const [newChannelLabel, setNewChannelLabel] = useState("");
  const [newChannelMediums, setNewChannelMediums] = useState("");
  const [newChannelSources, setNewChannelSources] = useState("");

  const fetchChannels = useCallback(async () => {
    const res = await fetch("/api/admin/utm/channels");
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels || []);
      if (data.channels?.length > 0 && !activeChannel) {
        setActiveChannel(data.channels[0].id);
      }
    }
  }, [activeChannel]);

  const fetchLinks = useCallback(async () => {
    const res = await fetch("/api/admin/utm");
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links || []);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchChannels(), fetchLinks()]).finally(() => setLoading(false));
  }, [fetchChannels, fetchLinks]);

  useEffect(() => {
    if (channels.length > 0 && activeChannel) {
      const ch = channels.find((c) => c.id === activeChannel);
      if (ch) {
        if (ch.utm_sources?.length > 0) {
          setSelectedSource(ch.utm_sources[0].slug);
        }
        if (ch.utm_mediums?.length > 0) {
          setSelectedMedium(ch.utm_mediums[0].slug);
        }
      }
    }
  }, [activeChannel, channels]);

  const currentChannel = channels.find((c) => c.id === activeChannel);

  const getSource = () => {
    return selectedSource === "__custom__" ? slugify(customSource) : selectedSource;
  };

  const buildUrl = () => {
    const url = baseUrl.trim();
    const source = getSource();
    const medium = selectedMedium;
    const contentSlug = slugify(content);
    const termSlug = slugify(term);

    if (!url) return null;

    const sep = url.includes("?") ? "&" : "?";
    let plainUrl = `${url}${sep}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaignSlug}`;
    if (contentSlug) plainUrl += `&utm_content=${contentSlug}`;
    if (termSlug) plainUrl += `&utm_term=${termSlug}`;

    return { plainUrl, source, medium, campaign: campaignSlug, content: contentSlug, term: termSlug };
  };

  const handleCopy = async () => {
    const data = buildUrl();
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.plainUrl);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 1600);
    } catch {
      alert("Copy failed - please select manually");
    }
  };

  const handleSave = async () => {
    const data = buildUrl();
    if (!data || !data.campaign) return;

    // Check for spaces in slug
    if (campaignSlug.includes(" ")) {
      setShowSlugWarning(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_url: baseUrl,
          utm_source: data.source,
          utm_medium: data.medium,
          utm_campaign: data.campaign,
          campaign_title: campaignTitle || null,
          utm_content: data.content || null,
          utm_term: data.term || null,
          channel_id: activeChannel,
          channel_name: currentChannel?.name,
        }),
      });

      if (res.ok) {
        await fetchLinks();
        // Clear form
        setBaseUrl("");
        setCampaignTitle("");
        setCampaignSlug("");
        setSlugManuallyEdited(false);
        setContent("");
        setTerm("");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this UTM link?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/utm/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchLinks();
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleEditClick = (link: UtmLink) => {
    setEditingLink(link);
    setEditForm({
      destination_url: link.destination_url,
      utm_source: link.utm_source,
      utm_medium: link.utm_medium,
      utm_campaign: link.utm_campaign,
      campaign_title: link.campaign_title || "",
      utm_content: link.utm_content || "",
      utm_term: link.utm_term || "",
      channel_id: (link as any).channel_id || "",
      channel_name: link.channel_name || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingLink) return;

    // Check for spaces in slug
    if (editForm.utm_campaign.includes(" ")) {
      setShowSlugWarning(true);
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/utm/${editingLink.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_url: editForm.destination_url,
          utm_source: editForm.utm_source,
          utm_medium: editForm.utm_medium,
          utm_campaign: editForm.utm_campaign,
          campaign_title: editForm.campaign_title || null,
          utm_content: editForm.utm_content || null,
          utm_term: editForm.utm_term || null,
          channel_id: editForm.channel_id || null,
          channel_name: editForm.channel_name || null,
        }),
      });
      if (res.ok) {
        setEditingLink(null);
        await fetchLinks();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCsv = () => {
    window.open("/api/admin/utm/export", "_blank");
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 1600);
    } catch {
      // ignore
    }
  };

  // Manage panel functions
  const openManagePanel = () => {
    setEditingChannels(JSON.parse(JSON.stringify(channels)));
    setShowManage(true);
  };

  const handleAddChannel = () => {
    const label = newChannelLabel.trim();
    if (!label) return;
    const slug = slugify(label);
    const newChannel: Channel = {
      id: `new_${Date.now()}`,
      name: label,
      slug,
      is_active: true,
      display_order: editingChannels.length,
      utm_sources: [],
      utm_mediums: [],
    };
    setEditingChannels([...editingChannels, newChannel]);
    setNewChannelLabel("");
    setNewChannelMediums("");
    setNewChannelSources("");
  };

  const handleRemoveChannel = (id: string) => {
    if (editingChannels.length <= 1) return;
    setEditingChannels(editingChannels.filter((c) => c.id !== id));
  };

  const handleUpdateChannel = (id: string, field: "name" | "sources" | "mediums", value: string) => {
    setEditingChannels(
      editingChannels.map((c) => {
        if (c.id !== id) return c;
        if (field === "name") return { ...c, name: value };
        if (field === "sources") {
          const sources = value.split(",").map((s) => s.trim()).filter(Boolean);
          return {
            ...c,
            utm_sources: sources.map((name, i) => ({
              id: `src_${i}`,
              name,
              slug: slugify(name),
            })),
          };
        }
        if (field === "mediums") {
          const mediums = value.split(",").map((s) => s.trim()).filter(Boolean);
          return {
            ...c,
            utm_mediums: mediums.map((name, i) => ({
              id: `med_${i}`,
              name,
              slug: slugify(name),
            })),
          };
        }
        return c;
      })
    );
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      for (const ch of editingChannels) {
        if (ch.id.startsWith("new_")) {
          // Create new channel
          await fetch("/api/admin/utm/channels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: ch.name,
              slug: ch.slug,
              sources: ch.utm_sources.map((s) => s.name),
              mediums: ch.utm_mediums.map((m) => m.name),
            }),
          });
        } else {
          // Update existing channel
          await fetch(`/api/admin/utm/channels/${ch.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: ch.name,
              slug: ch.slug,
              sources: ch.utm_sources.map((s) => s.name),
              mediums: ch.utm_mediums.map((m) => m.name),
            }),
          });
        }
      }
      await fetchChannels();
      setConfigSavedMsg(true);
      setTimeout(() => setConfigSavedMsg(false), 1600);
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfig = () => {
    if (!confirm("Reset to defaults? This will overwrite all custom channels.")) return;
    // For now, just reload from server
    fetchChannels();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-nfw-blackberry/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-nfw-lilac mb-1">utm link builder</p>
          <h1 className="text-2xl font-serif font-semibold text-nfw-aubergine mb-1">Build a trackable campaign link</h1>
          <p className="text-sm text-nfw-blackberry/60">Pick a channel, fill in the blanks, copy the link. Every link you build gets saved below.</p>
        </div>
        <button
          onClick={openManagePanel}
          className="px-3 py-2 text-xs font-mono border border-nfw-blackberry/20 text-nfw-blackberry/60 rounded-lg hover:text-nfw-aubergine hover:border-nfw-aubergine transition-colors"
        >
          ⚙ Manage channels
        </button>
      </div>

      {/* Manage Panel */}
      {showManage && (
        <div className="bg-white border border-nfw-blackberry/20 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-nfw-aubergine mb-1">Manage channels, sources & mediums</h2>
          <p className="text-xs text-nfw-blackberry/60 mb-4">Edit these lists directly — changes apply immediately. Separate multiple sources or mediums with commas.</p>

          <div className="space-y-4 mb-4">
            {editingChannels.map((ch) => (
              <div key={ch.id} className="border border-nfw-blackberry/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={ch.name}
                    onChange={(e) => handleUpdateChannel(ch.id, "name", e.target.value)}
                    className="font-serif font-semibold text-nfw-aubergine border-none bg-transparent p-0 flex-1 focus:outline-none focus:border-b focus:border-nfw-aubergine"
                  />
                  {editingChannels.length > 1 && (
                    <button
                      onClick={() => handleRemoveChannel(ch.id)}
                      className="w-7 h-7 text-xs border border-nfw-blackberry/20 text-nfw-blackberry/60 rounded hover:border-red-500 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-nfw-lilac mb-1">Mediums</label>
                    <textarea
                      value={ch.utm_mediums.map((m) => m.name).join(", ")}
                      onChange={(e) => handleUpdateChannel(ch.id, "mediums", e.target.value)}
                      className="w-full text-sm border border-nfw-blackberry/20 rounded p-2 resize-none font-mono"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-nfw-lilac mb-1">Sources</label>
                    <textarea
                      value={ch.utm_sources.map((s) => s.name).join(", ")}
                      onChange={(e) => handleUpdateChannel(ch.id, "sources", e.target.value)}
                      className="w-full text-sm border border-nfw-blackberry/20 rounded p-2 resize-none font-mono"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4 pt-4 border-t border-nfw-blackberry/10">
            <input
              type="text"
              value={newChannelLabel}
              onChange={(e) => setNewChannelLabel(e.target.value)}
              placeholder="New channel name"
              className="flex-1 min-w-[140px] text-sm border border-nfw-blackberry/20 rounded px-3 py-2"
            />
            <input
              type="text"
              value={newChannelMediums}
              onChange={(e) => setNewChannelMediums(e.target.value)}
              placeholder="Mediums, comma-separated"
              className="flex-1 min-w-[140px] text-sm border border-nfw-blackberry/20 rounded px-3 py-2"
            />
            <input
              type="text"
              value={newChannelSources}
              onChange={(e) => setNewChannelSources(e.target.value)}
              placeholder="Sources, comma-separated"
              className="flex-1 min-w-[140px] text-sm border border-nfw-blackberry/20 rounded px-3 py-2"
            />
            <button
              onClick={handleAddChannel}
              className="px-4 py-2 text-sm border border-nfw-blackberry/20 rounded hover:border-nfw-aubergine hover:text-nfw-aubergine"
            >
              + Add channel
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-5 py-2.5 bg-nfw-aubergine text-white text-sm font-semibold rounded-lg hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={handleResetConfig}
              className="px-5 py-2.5 text-sm border border-nfw-blackberry/20 rounded hover:border-nfw-aubergine hover:text-nfw-aubergine"
            >
              Reset to defaults
            </button>
            <button
              onClick={() => setShowManage(false)}
              className="px-5 py-2.5 text-sm border border-nfw-blackberry/20 rounded hover:border-nfw-aubergine hover:text-nfw-aubergine"
            >
              Close
            </button>
            {configSavedMsg && (
              <span className="text-xs font-mono text-green-600">Saved ✓</span>
            )}
          </div>
        </div>
      )}

      {/* Channel Selector */}
      <div className="bg-white border border-nfw-blackberry/20 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap gap-2 mb-5">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                ch.id === activeChannel
                  ? "bg-nfw-aubergine text-white"
                  : "bg-nfw-blackberry/5 text-nfw-blackberry/60 hover:text-nfw-aubergine hover:border-nfw-aubergine border border-transparent"
              }`}
            >
              {ch.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Destination URL */}
          <div className="md:col-span-2">
            <label className="block text-xs font-mono uppercase text-nfw-aubergine mb-2">
              Destination URL <span className="text-nfw-blackberry/40 text-[10px] normal-case tracking-normal">the specific page this link should send people to</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://yoursite.com/landing-page"
              className="w-full px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-mono uppercase text-amber-700 mb-2">Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
            >
              {currentChannel?.utm_sources?.map((s) => (
                <option key={s.id} value={s.slug}>{s.name}</option>
              ))}
              <option value="__custom__">+ custom source...</option>
            </select>
            {selectedSource === "__custom__" && (
              <input
                type="text"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="Custom source..."
                className="w-full mt-2 px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
              />
            )}
          </div>

          {/* Medium */}
          <div>
            <label className="block text-xs font-mono uppercase text-purple-600 mb-2">Medium</label>
            <select
              value={selectedMedium}
              onChange={(e) => setSelectedMedium(e.target.value)}
              className="w-full px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
            >
              {currentChannel?.utm_mediums?.map((m) => (
                <option key={m.id} value={m.slug}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Campaign Title */}
          <div className="md:col-span-2">
            <label className="block text-xs font-mono uppercase text-nfw-aubergine mb-2">
              Campaign Title
            </label>
            <input
              type="text"
              value={campaignTitle}
              onChange={(e) => {
                setCampaignTitle(e.target.value);
                if (!slugManuallyEdited) {
                  setCampaignSlug(slugify(e.target.value));
                }
              }}
              placeholder="e.g. Back to School 2026"
              className="w-full px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
            />
          </div>

          {/* Campaign Slug */}
          <div className="md:col-span-2">
            <label className="block text-xs font-mono uppercase text-nfw-aubergine mb-2">
              Campaign Slug
            </label>
            <input
              type="text"
              value={campaignSlug}
              onChange={(e) => {
                setCampaignSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="e.g. back_to_school_2026"
              className="w-full px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-mono uppercase text-teal-600 mb-2">
              Content <span className="text-nfw-blackberry/40 text-[10px] normal-case tracking-normal">optional</span>
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. story_ad, header_cta"
              className="w-full px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
            />
          </div>

          {/* Term */}
          <div>
            <label className="block text-xs font-mono uppercase text-red-700 mb-2">
              Term <span className="text-nfw-blackberry/40 text-[10px] normal-case tracking-normal">optional · paid search only</span>
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. running_shoes"
              className="w-full px-4 py-2.5 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white border border-nfw-blackberry/20 rounded-xl p-6 mb-6">
        <label className="block text-xs font-mono uppercase text-nfw-blackberry/60 mb-3">Generated link</label>
        <div className="bg-nfw-blackberry/5 border border-nfw-blackberry/20 rounded-lg p-4 font-mono text-sm min-h-[60px] break-all">
          {buildUrl() ? (
            <span>
              {buildUrl()?.plainUrl}
            </span>
          ) : (
            <span className="text-nfw-blackberry/40 italic">Fill in the destination URL to get started...</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={handleCopy}
            disabled={!buildUrl()}
            className="px-5 py-2.5 bg-nfw-aubergine text-white text-sm font-semibold rounded-lg hover:brightness-110 disabled:opacity-50"
          >
            Copy link
          </button>
          <button
            onClick={handleSave}
            disabled={!buildUrl() || saving}
            className="px-5 py-2.5 border border-nfw-blackberry/20 text-sm font-semibold rounded-lg hover:border-nfw-aubergine hover:text-nfw-aubergine disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save to log"}
          </button>
          {copiedMsg && (
            <span className="text-xs font-mono text-teal-600">Copied ✓</span>
          )}
        </div>
      </div>

      {/* Slug Space Warning Modal */}
      {showSlugWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-nfw-aubergine mb-2">Spaces Not Allowed</h3>
                <p className="text-sm text-nfw-blackberry/70 mb-4">
                  Campaign slugs cannot contain spaces. Use underscores or hyphens instead (e.g., "back_to_school_2026" or "back-to-school-2026").
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowSlugWarning(false);
                      setPendingSlugValue("");
                      setSlugWarningCallback(null);
                    }}
                    className="px-6 py-2 bg-nfw-aubergine text-white text-sm font-semibold rounded-lg hover:brightness-110"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-nfw-aubergine mb-4">Edit UTM Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-nfw-aubergine mb-1">Destination URL</label>
                <input
                  type="text"
                  value={editForm.destination_url}
                  onChange={(e) => setEditForm({ ...editForm, destination_url: e.target.value })}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-amber-700 mb-1">Source</label>
                  <input
                    type="text"
                    value={editForm.utm_source}
                    onChange={(e) => setEditForm({ ...editForm, utm_source: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-purple-600 mb-1">Medium</label>
                  <input
                    type="text"
                    value={editForm.utm_medium}
                    onChange={(e) => setEditForm({ ...editForm, utm_medium: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-nfw-aubergine mb-1">Campaign Title</label>
                  <input
                    type="text"
                    value={editForm.campaign_title}
                    onChange={(e) => setEditForm({ ...editForm, campaign_title: e.target.value })}
                    placeholder="e.g. Back to School 2026"
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-nfw-aubergine mb-1">Campaign Slug</label>
                  <input
                    type="text"
                    value={editForm.utm_campaign}
                    onChange={(e) => setEditForm({ ...editForm, utm_campaign: e.target.value })}
                    placeholder="e.g. back_to_school_2026"
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-teal-600 mb-1">Content <span className="text-nfw-blackberry/40 normal-case tracking-normal">optional</span></label>
                  <input
                    type="text"
                    value={editForm.utm_content}
                    onChange={(e) => setEditForm({ ...editForm, utm_content: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-red-700 mb-1">Term <span className="text-nfw-blackberry/40 normal-case tracking-normal">optional</span></label>
                  <input
                    type="text"
                    value={editForm.utm_term}
                    onChange={(e) => setEditForm({ ...editForm, utm_term: e.target.value })}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm font-mono focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleEditSave}
                disabled={savingEdit}
                className="px-5 py-2.5 bg-nfw-aubergine text-white text-sm font-semibold rounded-lg hover:brightness-110 disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save changes"}
              </button>
              <button
                onClick={() => setEditingLink(null)}
                className="px-5 py-2.5 border border-nfw-blackberry/20 text-sm font-semibold rounded-lg hover:border-nfw-aubergine hover:text-nfw-aubergine"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Log */}
      <div className="bg-white border border-nfw-blackberry/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Campaign log</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-mono border border-nfw-blackberry/20 text-nfw-blackberry/60 rounded-lg hover:text-nfw-aubergine hover:border-nfw-aubergine transition-colors"
            >
              Download CSV
            </button>
            <span className="text-xs font-mono text-nfw-blackberry/60">{links.length} saved</span>
          </div>
        </div>

        {links.length === 0 ? (
          <div className="text-center py-10 text-nfw-blackberry/60 text-sm border border-dashed border-nfw-blackberry/20 rounded-lg">
            No links saved yet — build one above and hit &ldquo;Save to log.&rdquo;
          </div>
        ) : (
          <div className="divide-y divide-nfw-blackberry/10">
            {links.map((link) => (
              <div key={link.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-xs font-mono uppercase px-2 py-0.5 bg-nfw-blackberry/5 border border-nfw-blackberry/10 text-nfw-blackberry/60 rounded-full mb-2">
                      {(link as any).campaign_title || link.utm_campaign} · {formatDate(link.created_at)}
                    </span>
                    <p className="text-xs font-mono text-nfw-blackberry/60 break-all">{link.destination_url}</p>
                    <p className="text-xs font-mono text-nfw-blackberry/40 mt-1 break-all">
                     ?utm_source={link.utm_source} &utm_medium={link.utm_medium} &utm_campaign={link.utm_campaign}
                      {link.utm_content && ` &utm_content=${link.utm_content}`}
                      {link.utm_term && ` &utm_term=${link.utm_term}`}
                    </p>
                    {link.created_by_email && (
                      <p className="text-xs text-nfw-blackberry/40 mt-1">by {link.created_by_email}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditClick(link)}
                      className="w-8 h-8 flex items-center justify-center border border-nfw-blackberry/20 text-nfw-blackberry/60 rounded hover:text-nfw-aubergine hover:border-nfw-aubergine text-sm"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => {
                        const url = `${link.destination_url}?utm_source=${link.utm_source}&utm_medium=${link.utm_medium}&utm_campaign=${link.utm_campaign}${link.utm_content ? `&utm_content=${link.utm_content}` : ""}${link.utm_term ? `&utm_term=${link.utm_term}` : ""}`;
                        handleCopyLink(url);
                      }}
                      className="w-8 h-8 flex items-center justify-center border border-nfw-blackberry/20 text-nfw-blackberry/60 rounded hover:text-nfw-aubergine hover:border-nfw-aubergine text-sm"
                      title="Copy"
                    >
                      ⧉
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      disabled={deleting === link.id}
                      className="w-8 h-8 flex items-center justify-center border border-nfw-blackberry/20 text-nfw-blackberry/60 rounded hover:text-red-500 hover:border-red-500 text-sm"
                      title="Delete"
                    >
                      {deleting === link.id ? "..." : "✕"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
