"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Mail, Clock, Heart, ChevronDown, ChevronUp, Download } from "lucide-react";

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

interface HelpCard {
  icon: string;
  title: string;
  content: string;
  email?: string;
}

interface QuickLink {
  label: string;
  url: string;
}

interface ContactData {
  id: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  help_heading: string;
  help_intro: string;
  help_cards: HelpCard[];
  quick_links: QuickLink[];
  not_member_heading: string;
  not_member_subheading: string;
  meta_title?: string | null;
  meta_description?: string | null;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject_label: string;
  message: string;
  created_at: string;
}

const defaultData: ContactData = {
  id: "",
  hero_eyebrow: "Real people, real responses",
  hero_headline: "We'd love to hear from you.",
  hero_subheadline: "Whether you have a question, need support, or just want to say hi — we're here and we're listening.",
  help_heading: "How can we help?",
  help_intro: "Our team is made up of real women who care deeply about this community. We read every message and do our best to respond within one business day.",
  help_cards: [
    {
      icon: "mail",
      title: "Email us directly",
      content: "We typically respond within one business day. For urgent grant-related questions, please note that in your message.",
      email: "michelle@nationalfundforwomen.org",
    },
    {
      icon: "clock",
      title: "Response time",
      content: "We typically respond within one business day. For urgent grant-related questions, please note that in your message.",
    },
    {
      icon: "heart",
      title: "A note from us",
      content: "No question is too small. Whether you need help with your account, have a grant question, or just want to share your story — we want to hear it.",
    },
  ],
  quick_links: [
    { label: "Microgrant FAQs", url: "/faq" },
    { label: "Pricing and Plans", url: "/pricing" },
    { label: "Perks and Discounts", url: "/perks/info" },
  ],
  not_member_heading: "Not a member yet?",
  not_member_subheading: "Join thousands of women who have already found relief, connection, and real support through NFW. It's free to get started.",
};

const iconOptions = [
  { value: "mail", label: "Mail", icon: Mail },
  { value: "clock", label: "Clock", icon: Clock },
  { value: "heart", label: "Heart", icon: Heart },
];

export default function ContactEditorClient({
  initialData,
  submissions = [],
}: {
  initialData: ContactData | null;
  submissions?: ContactSubmission[];
}) {
  const data = initialData ? { ...defaultData, ...initialData } : defaultData;

  const [heroEyebrow, setHeroEyebrow] = useState(data.hero_eyebrow);
  const [heroHeadline, setHeroHeadline] = useState(data.hero_headline);
  const [heroSubheadline, setHeroSubheadline] = useState(data.hero_subheadline);
  const [helpHeading, setHelpHeading] = useState(data.help_heading);
  const [helpIntro, setHelpIntro] = useState(data.help_intro);
  const [helpCards, setHelpCards] = useState<HelpCard[]>(data.help_cards);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(data.quick_links);
  const [notMemberHeading, setNotMemberHeading] = useState(data.not_member_heading);
  const [notMemberSubheading, setNotMemberSubheading] = useState(data.not_member_subheading);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [metaTitle, setMetaTitle] = useState(data.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(data.meta_description || "");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateHelpCard = (index: number, key: keyof HelpCard, value: string) => {
    setHelpCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, [key]: value } : card
      )
    );
  };

  const addQuickLink = () => {
    setQuickLinks((prev) => [...prev, { label: "", url: "" }]);
  };

  const removeQuickLink = (index: number) => {
    setQuickLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuickLink = (
    index: number,
    key: keyof QuickLink,
    value: string
  ) => {
    setQuickLinks((prev) =>
      prev.map((link, i) =>
        i === index ? { ...link, [key]: value } : link
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          hero_eyebrow: heroEyebrow,
          hero_headline: heroHeadline,
          hero_subheadline: heroSubheadline,
          help_heading: helpHeading,
          help_intro: helpIntro,
          help_cards: helpCards,
          quick_links: quickLinks,
          not_member_heading: notMemberHeading,
          not_member_subheading: notMemberSubheading,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      showToast("Contact page saved");
    } catch {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const renderCardIcon = (iconName: string, className: string) => {
    const iconOption = iconOptions.find((i) => i.value === iconName);
    if (!iconOption) return null;
    const Icon = iconOption.icon;
    return <Icon className={className} />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const toggleMessage = (id: string) => {
    setExpandedMessages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadCsv = () => {
    const headers = ["Date", "Name", "Email", "Subject", "Message"];
    const rows = submissions.map((sub) => [
      formatDate(sub.created_at),
      sub.name,
      sub.email,
      sub.subject_label,
      `"${sub.message.replace(/"/g, '""')}"`,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contact-form-submissions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-8 right-8 bg-nfw-blackberry text-white px-6 py-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Hero Section */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Hero Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Eyebrow Text
            </label>
            <input
              type="text"
              value={heroEyebrow}
              onChange={(e) => setHeroEyebrow(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Headline
            </label>
            <input
              type="text"
              value={heroHeadline}
              onChange={(e) => setHeroHeadline(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Subheadline
            </label>
            <textarea
              value={heroSubheadline}
              onChange={(e) => setHeroSubheadline(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* SEO Settings - Collapsible */}
      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoExpanded(!seoExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-nfw-blackberry">SEO Settings</span>
          {seoExpanded ? (
            <ChevronUp className="w-4 h-4 text-nfw-blackberry/50" />
          ) : (
            <ChevronDown className="w-4 h-4 text-nfw-blackberry/50" />
          )}
        </button>

        {seoExpanded && (
          <div className="px-6 pb-6 space-y-4 border-t border-nfw-blackberry/10 pt-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                  SEO Title
                </label>
                <span className={`text-xs ${metaTitle.length > MAX_TITLE ? "text-red-500" : "text-nfw-blackberry/40"}`}>
                  {metaTitle.length}/{MAX_TITLE}
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                maxLength={MAX_TITLE + 20}
                placeholder={heroHeadline || "Page title will be used if empty"}
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
              />
              {metaTitle.length > MAX_TITLE && (
                <p className="text-xs text-red-500 mt-1">Recommended: 60 characters or less</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                  SEO Description
                </label>
                <span className={`text-xs ${metaDescription.length > MAX_DESCRIPTION ? "text-red-500" : "text-nfw-blackberry/40"}`}>
                  {metaDescription.length}/{MAX_DESCRIPTION}
                </span>
              </div>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={MAX_DESCRIPTION + 40}
                rows={3}
                placeholder="Brief description for search results..."
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
              />
              {metaDescription.length > MAX_DESCRIPTION && (
                <p className="text-xs text-red-500 mt-1">Recommended: 160 characters or less</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* How Can We Help Section */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">How Can We Help Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Heading
            </label>
            <input
              type="text"
              value={helpHeading}
              onChange={(e) => setHelpHeading(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Intro Text
            </label>
            <textarea
              value={helpIntro}
              onChange={(e) => setHelpIntro(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
            />
          </div>

          {/* Contact Cards */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-3">
              Contact Cards
            </label>
            <div className="space-y-4">
              {helpCards.map((card, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border border-nfw-blackberry/10">
                  <div className="flex-shrink-0 w-10 h-10 bg-nfw-lilac flex items-center justify-center">
                    {renderCardIcon(card.icon, "w-5 h-5 text-nfw-blackberry")}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                          Icon
                        </label>
                        <select
                          value={card.icon}
                          onChange={(e) => updateHelpCard(index, "icon", e.target.value)}
                          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                        >
                          {iconOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={card.title}
                          onChange={(e) => updateHelpCard(index, "title", e.target.value)}
                          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                        Content
                      </label>
                      <textarea
                        value={card.content}
                        onChange={(e) => updateHelpCard(index, "content", e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
                      />
                    </div>
                    {card.icon === "mail" && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                          Email Address
                        </label>
                        <input
                          type="text"
                          value={card.email || ""}
                          onChange={(e) => updateHelpCard(index, "email", e.target.value)}
                          placeholder="email@example.com"
                          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                Quick Links
              </label>
              <button
                onClick={addQuickLink}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-nfw-aubergine text-white hover:bg-nfw-blackberry transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Link
              </button>
            </div>
            <div className="space-y-2">
              {quickLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateQuickLink(index, "label", e.target.value)}
                    placeholder="Link label"
                    className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateQuickLink(index, "url", e.target.value)}
                    placeholder="URL"
                    className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                  />
                  <button
                    onClick={() => removeQuickLink(index)}
                    className="p-1.5 text-nfw-blackberry/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {quickLinks.length === 0 && (
                <p className="text-center text-nfw-blackberry/40 py-4 text-sm">
                  No quick links yet. Click &quot;Add Link&quot; to get started.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Not a Member Yet Section */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Not a Member Yet Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Heading
            </label>
            <input
              type="text"
              value={notMemberHeading}
              onChange={(e) => setNotMemberHeading(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Subheading
            </label>
            <textarea
              value={notMemberSubheading}
              onChange={(e) => setNotMemberSubheading(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Contact Form Submissions */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-nfw-blackberry font-ui">
            Contact Form Submissions ({submissions.length})
          </h2>
          {submissions.length > 0 && (
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-2 px-4 py-2 bg-nfw-aubergine text-white text-sm hover:bg-nfw-blackberry transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
        {submissions.length === 0 ? (
          <p className="text-nfw-blackberry/40 text-center py-8">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="border border-nfw-blackberry/10 p-4"
              >
                <div className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleMessage(submission.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-nfw-blackberry">{submission.name}</span>
                      <span className="text-nfw-blackberry/40">•</span>
                      <span className="text-sm text-nfw-blackberry/70">{submission.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-nfw-aubergine">{submission.subject_label}</span>
                      <span className="text-nfw-blackberry/40">•</span>
                      <span className="text-nfw-blackberry/50">{formatDate(submission.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-nfw-blackberry/50">
                    <span className="text-sm">{expandedMessages[submission.id] ? "Collapse" : "Expand"}</span>
                    {expandedMessages[submission.id] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
                {expandedMessages[submission.id] && (
                  <div className="mt-3 pt-3 border-t border-nfw-blackberry/10">
                    <p className="text-nfw-blackberry/70 whitespace-pre-wrap">{submission.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
