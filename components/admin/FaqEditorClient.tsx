"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Link2, ChevronDown, ChevronUp } from "lucide-react";

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

interface FaqQuestion {
  question: string;
  answer: string;
}

interface FaqSection {
  category: string;
  questions: FaqQuestion[];
}

interface FaqButton {
  label: string;
  url: string;
  style: "solid" | "ghost";
  open_in_new_tab: boolean;
}

interface FaqData {
  id: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_background: string;
  faq_sections: FaqSection[];
  still_have_questions_heading: string;
  still_have_questions_subheading: string;
  still_have_questions_buttons: FaqButton[];
  meta_title?: string | null;
  meta_description?: string | null;
}

const defaultData: FaqData = {
  id: "",
  hero_eyebrow: "We've got answers",
  hero_headline: "Questions? We've got answers.",
  hero_subheadline: "Everything you need to know about NFW membership, microgrants, perks, and more.",
  hero_background: "aubergine",
  faq_sections: [],
  still_have_questions_heading: "Still have questions?",
  still_have_questions_subheading: "We're here to help. Reach out and a real person will get back to you.",
  still_have_questions_buttons: [
    { label: "Contact Us", url: "/contact", style: "solid", open_in_new_tab: false },
    { label: "Join for Free", url: "/auth/sign-up", style: "ghost", open_in_new_tab: false },
  ],
};

const backgroundOptions = [
  { value: "dove", label: "Dove" },
  { value: "aubergine", label: "Aubergine" },
  { value: "wisteria", label: "Wisteria" },
  { value: "lilac", label: "Lilac" },
  { value: "blackberry", label: "Blackberry" },
];

export default function FaqEditorClient({ initialData }: { initialData: FaqData | null }) {
  const data = initialData ? { ...defaultData, ...initialData } : defaultData;

  const [heroEyebrow, setHeroEyebrow] = useState(data.hero_eyebrow);
  const [heroHeadline, setHeroHeadline] = useState(data.hero_headline);
  const [heroSubheadline, setHeroSubheadline] = useState(data.hero_subheadline);
  const [heroBackground, setHeroBackground] = useState(data.hero_background);
  const [faqSections, setFaqSections] = useState<FaqSection[]>(data.faq_sections);
  const [stillHaveQuestionsHeading, setStillHaveQuestionsHeading] = useState(data.still_have_questions_heading);
  const [stillHaveQuestionsSubheading, setStillHaveQuestionsSubheading] = useState(data.still_have_questions_subheading);
  const [stillHaveQuestionsButtons, setStillHaveQuestionsButtons] = useState<FaqButton[]>(data.still_have_questions_buttons);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [metaTitle, setMetaTitle] = useState(data.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(data.meta_description || "");

  const [linkModalState, setLinkModalState] = useState<{
    sectionIndex: number;
    questionIndex: number;
    show: boolean;
    linkText: string;
    linkUrl: string;
    openNewTab: boolean;
  } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleQuestion = (key: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addSection = () => {
    setFaqSections((prev) => [
      ...prev,
      { category: "New Section", questions: [] },
    ]);
  };

  const removeSection = (index: number) => {
    setFaqSections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSectionCategory = (index: number, category: string) => {
    setFaqSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, category } : s))
    );
  };

  const addQuestion = (sectionIndex: number) => {
    setFaqSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: [...s.questions, { question: "", answer: "" }] }
          : s
      )
    );
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    setFaqSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.filter((_, qi) => qi !== questionIndex) }
          : s
      )
    );
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    key: keyof FaqQuestion,
    value: string
  ) => {
    setFaqSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              questions: s.questions.map((q, qi) =>
                qi === questionIndex ? { ...q, [key]: value } : q
              ),
            }
          : s
      )
    );
  };

  const addButton = () => {
    if (stillHaveQuestionsButtons.length < 3) {
      setStillHaveQuestionsButtons((prev) => [
        ...prev,
        { label: "", url: "", style: "solid", open_in_new_tab: false },
      ]);
    }
  };

  const removeButton = (index: number) => {
    setStillHaveQuestionsButtons((prev) => prev.filter((_, i) => i !== index));
  };

  const updateButton = (
    index: number,
    key: keyof FaqButton,
    value: string | boolean
  ) => {
    setStillHaveQuestionsButtons((prev) =>
      prev.map((b, i) =>
        i === index ? { ...b, [key]: value } : b
      )
    );
  };

  const openLinkModal = (sectionIndex: number, questionIndex: number) => {
    setLinkModalState({
      sectionIndex,
      questionIndex,
      show: true,
      linkText: "",
      linkUrl: "",
      openNewTab: false,
    });
  };

  const closeLinkModal = () => {
    setLinkModalState(null);
  };

  const insertLink = () => {
    if (!linkModalState || !linkModalState.linkText.trim() || !linkModalState.linkUrl.trim()) return;

    const { sectionIndex, questionIndex, linkText, linkUrl, openNewTab } = linkModalState;
    const textarea = document.querySelector(`[data-faq-answer="${sectionIndex}-${questionIndex}"]`) as HTMLTextAreaElement;
    const existingAnswer = faqSections[sectionIndex]?.questions[questionIndex]?.answer || "";
    const replacement = `[${linkText}](${linkUrl})${openNewTab ? "|_blank" : ""}`;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newAnswer = existingAnswer.substring(0, start) + replacement + existingAnswer.substring(end);
      updateQuestion(sectionIndex, questionIndex, "answer", newAnswer);
    } else {
      updateQuestion(sectionIndex, questionIndex, "answer", existingAnswer + replacement);
    }
    closeLinkModal();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          hero_eyebrow: heroEyebrow,
          hero_headline: heroHeadline,
          hero_subheadline: heroSubheadline,
          hero_background: heroBackground,
          faq_sections: faqSections,
          still_have_questions_heading: stillHaveQuestionsHeading,
          still_have_questions_subheading: stillHaveQuestionsSubheading,
          still_have_questions_buttons: stillHaveQuestionsButtons,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      showToast("FAQ page saved");
    } catch {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
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
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Background Color
            </label>
            <select
              value={heroBackground}
              onChange={(e) => setHeroBackground(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            >
              {backgroundOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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

      {/* FAQ Sections */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-nfw-blackberry font-ui">FAQ Sections</h2>
          <button
            onClick={addSection}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-nfw-aubergine text-white hover:bg-nfw-blackberry transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
        <div className="space-y-4">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border border-nfw-blackberry/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={section.category}
                  onChange={(e) => updateSectionCategory(sectionIndex, e.target.value)}
                  placeholder="Section category name"
                  className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm font-semibold focus:outline-none focus:border-nfw-blackberry transition-colors"
                />
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleSection(sectionIndex)}
                    className="p-1.5 text-nfw-blackberry/50 hover:text-nfw-blackberry transition-colors"
                  >
                    {expandedSections[sectionIndex] ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => removeSection(sectionIndex)}
                    className="p-1.5 text-nfw-blackberry/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedSections[sectionIndex] && (
                <div className="space-y-3 pl-4 border-l-2 border-nfw-lilac/20">
                  {section.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="border border-nfw-blackberry/10 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                          Question {questionIndex + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleQuestion(`${sectionIndex}-${questionIndex}`)}
                            className="p-1 text-nfw-blackberry/30 hover:text-nfw-blackberry transition-colors"
                          >
                            {expandedQuestions[`${sectionIndex}-${questionIndex}`] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => removeQuestion(sectionIndex, questionIndex)}
                            className="p-1 text-nfw-blackberry/30 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={question.question}
                          onChange={(e) =>
                            updateQuestion(sectionIndex, questionIndex, "question", e.target.value)
                          }
                          placeholder="Question text"
                          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                              Answer (supports markdown links)
                            </label>
                            <button
                              type="button"
                              onClick={() => openLinkModal(sectionIndex, questionIndex)}
                              className="px-2 py-0.5 text-xs bg-nfw-lilac/30 text-nfw-blackberry hover:bg-nfw-lilac/50 transition-colors rounded flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              Insert Link
                            </button>
                          </div>
                          <textarea
                            data-faq-answer={`${sectionIndex}-${questionIndex}`}
                            value={question.answer}
                            onChange={(e) =>
                              updateQuestion(sectionIndex, questionIndex, "answer", e.target.value)
                            }
                            rows={3}
                            placeholder="Answer text (use [text](url) for links, or click Insert Link)"
                            className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => addQuestion(sectionIndex)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry transition-colors border border-dashed border-nfw-blackberry/20 w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>
              )}
            </div>
          ))}
          {faqSections.length === 0 && (
            <p className="text-center text-nfw-blackberry/40 py-8">
              No FAQ sections yet. Click &quot;Add Section&quot; to get started.
            </p>
          )}
        </div>
      </div>

      {/* Still Have Questions Section */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Still Have Questions Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Heading
            </label>
            <input
              type="text"
              value={stillHaveQuestionsHeading}
              onChange={(e) => setStillHaveQuestionsHeading(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Subheading
            </label>
            <textarea
              value={stillHaveQuestionsSubheading}
              onChange={(e) => setStillHaveQuestionsSubheading(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
            />
          </div>

          {/* Buttons */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-2">
              Buttons (0-3)
            </label>
            <div className="space-y-3">
              {stillHaveQuestionsButtons.map((button, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border border-nfw-blackberry/10">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={button.label}
                      onChange={(e) => updateButton(index, "label", e.target.value)}
                      placeholder="Button label"
                      className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                    />
                    <input
                      type="text"
                      value={button.url}
                      onChange={(e) => updateButton(index, "url", e.target.value)}
                      placeholder="Button URL"
                      className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                    />
                    <div className="flex items-center gap-4">
                      <select
                        value={button.style}
                        onChange={(e) => updateButton(index, "style", e.target.value)}
                        className="px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                      >
                        <option value="solid">Solid (aubergine bg)</option>
                        <option value="ghost">Ghost (outline)</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-nfw-blackberry">
                        <input
                          type="checkbox"
                          checked={button.open_in_new_tab}
                          onChange={(e) => updateButton(index, "open_in_new_tab", e.target.checked)}
                          className="w-4 h-4"
                        />
                        Open in new tab
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() => removeButton(index)}
                    className="p-1.5 text-nfw-blackberry/30 hover:text-red-500 transition-colors mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {stillHaveQuestionsButtons.length < 3 && (
                <button
                  onClick={addButton}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry transition-colors border border-dashed border-nfw-blackberry/20 w-full justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Button
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Link Insert Modal */}
      {linkModalState?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-nfw-blackberry">Insert Link</h3>
              <button
                onClick={closeLinkModal}
                className="text-nfw-blackberry/50 hover:text-nfw-blackberry"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkModalState.linkText}
                  onChange={(e) =>
                    setLinkModalState((prev) => prev ? { ...prev, linkText: e.target.value } : null)
                  }
                  placeholder="Enter link text"
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={linkModalState.linkUrl}
                  onChange={(e) =>
                    setLinkModalState((prev) => prev ? { ...prev, linkUrl: e.target.value } : null)
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="openNewTab"
                  checked={linkModalState.openNewTab}
                  onChange={(e) =>
                    setLinkModalState((prev) => prev ? { ...prev, openNewTab: e.target.checked } : null)
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="openNewTab" className="text-sm text-nfw-blackberry">
                  Open in new tab
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeLinkModal}
                  className="px-4 py-2 text-sm text-nfw-blackberry/70 hover:text-nfw-blackberry transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={insertLink}
                  disabled={!linkModalState.linkText.trim() || !linkModalState.linkUrl.trim()}
                  className="px-4 py-2 text-sm bg-nfw-aubergine text-white hover:bg-nfw-blackberry transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
