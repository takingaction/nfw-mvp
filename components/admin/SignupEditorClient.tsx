"use client";

import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

interface SignupData {
  id: string | null;
  eyebrow: string;
  headline: string;
  body_text: string;
  benefits: string[];
  testimonial_text: string;
  testimonial_author: string;
  updated_at: string;
}

const defaultData: SignupData = {
  id: "",
  eyebrow: "JOIN WOMEN NATIONWIDE",
  headline: "Become a Member",
  body_text: "NFW membership helps you get relief for yourself while helping other women at the same time. Membership includes:",
  benefits: [
    "Microgrants from $100-$5,000",
    "Thousands of perks & discounts",
    "Zero Dollar Store giveaways",
    "Feel-good support that is simple, fast and low stress",
    "A community that gets it",
    "A mission-driven community supporting women",
  ],
  testimonial_text: "\"NFW is a safe space where we can trust that the women here have one another''s back. We support one another''s growth, hopes, and dreams even though they aren''t our own. We know that when one of us rises, the rest of us are right there supporting her. NFW is the space all women have been looking for.\"",
  testimonial_author: "Tiana, 29 — Retail Manager",
  updated_at: "",
};

export default function SignupEditorClient({
  initialData,
}: {
  initialData: SignupData | null;
}) {
  const data = initialData ? { ...defaultData, ...initialData } : defaultData;

  const [rowId] = useState(initialData?.id || null);
  const [eyebrow, setEyebrow] = useState(data.eyebrow);
  const [headline, setHeadline] = useState(data.headline);
  const [bodyText, setBodyText] = useState(data.body_text);
  const [benefits, setBenefits] = useState<string[]>(data.benefits);
  const [testimonialText, setTestimonialText] = useState(data.testimonial_text || "");
  const [testimonialAuthor, setTestimonialAuthor] = useState(data.testimonial_author || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addBenefit = () => {
    setBenefits((prev) => [...prev, ""]);
  };

  const removeBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBenefit = (index: number, value: string) => {
    setBenefits((prev) =>
      prev.map((b, i) => (i === index ? value : b))
    );
  };

  const moveBenefit = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === benefits.length - 1)
    ) {
      return;
    }
    const newBenefits = [...benefits];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newBenefits[index], newBenefits[targetIndex]] = [newBenefits[targetIndex], newBenefits[index]];
    setBenefits(newBenefits);
  };

  const handleSave = async () => {
    setSaving(true);
    const benefitsToSave = benefits.filter((b) => b.trim() !== "");
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rowId,
          eyebrow,
          headline,
          body_text: bodyText,
          benefits: benefitsToSave,
          testimonial_text: testimonialText,
          testimonial_author: testimonialAuthor,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      showToast("Signup page saved");
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
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Body Text
            </label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-nfw-blackberry font-ui">Benefits List</h2>
          <button
            onClick={addBenefit}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-nfw-aubergine text-white hover:bg-nfw-blackberry transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Benefit
          </button>
        </div>
          <div className="space-y-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                type="text"
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
                placeholder="Enter benefit text..."
                className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
              />
              <button
                onClick={() => moveBenefit(index, "up")}
                disabled={index === 0}
                className="p-1.5 text-nfw-blackberry/30 hover:text-nfw-blackberry disabled:opacity-30 transition-colors text-xs"
              >
                ↑
              </button>
              <button
                onClick={() => moveBenefit(index, "down")}
                disabled={index === benefits.length - 1}
                className="p-1.5 text-nfw-blackberry/30 hover:text-nfw-blackberry disabled:opacity-30 transition-colors text-xs"
              >
                ↓
              </button>
              <button
                onClick={() => removeBenefit(index)}
                className="p-1.5 text-nfw-blackberry/30 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {benefits.length === 0 && (
            <p className="text-center text-nfw-blackberry/40 py-4 text-sm">
              No benefits yet. Click &quot;Add Benefit&quot; to get started.
            </p>
          )}
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry font-ui mb-4">Testimonial</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Quote Text
            </label>
            <textarea
              value={testimonialText}
              onChange={(e) => setTestimonialText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Author Attribution
              <span className="font-normal normal-case ml-2">(optional, leave blank to hide)</span>
            </label>
            <input
              type="text"
              value={testimonialAuthor}
              onChange={(e) => setTestimonialAuthor(e.target.value)}
              placeholder="e.g., Tiana, 29 — Retail Manager"
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-nfw-aubergine border border-nfw-aubergine p-6">
        <h2 className="font-black text-white font-ui mb-4">Preview</h2>
        <div className="text-white">
          <p className="text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-4">
            {eyebrow || "EYEBROW TEXT"}
          </p>
          <h3 className="font-serif text-3xl text-white mb-4 leading-tight">
            {headline || "HEADLINE"}
          </h3>
          <p className="text-sm mb-6 leading-relaxed">
            {bodyText || "Body text preview..."}
          </p>
          <div className="space-y-2 mb-6">
            {benefits.filter((b) => b.trim()).map((benefit, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-nfw-wisteria/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 p-4">
            <p className="text-sm italic leading-relaxed mb-2">
              {testimonialText || "Testimonial quote..."}
            </p>
            {testimonialAuthor && (
              <p className="text-nfw-lilac text-xs font-semibold">
                — {testimonialAuthor}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
