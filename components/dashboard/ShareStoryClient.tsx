"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  STORY_INTRO,
  STORY_PERMISSIONS,
  STORY_PROGRAMS,
  STORY_PROGRAMS_PROMPT,
  STORY_TEXT_PROMPTS,
  US_STATES,
  type StoryProgram,
  type StoryTextKey,
} from "@/lib/storyForm";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  city: string | null;
  state: string | null;
};

type FormState = {
  name: string;
  email: string;
  age: string;
  city: string;
  state: string;
  programsUsed: StoryProgram[];
  permissionGranted: boolean;
  preferAnonymous: boolean;
  interestedVideo: boolean;
} & Record<StoryTextKey, string>;

const inputClass =
  "w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine";
const labelClass = "block text-sm font-semibold text-nfw-blackberry font-ui mb-1";

export default function ShareStoryClient({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>({
    name: profile?.full_name || "",
    email: profile?.email || "",
    age: "",
    city: profile?.city || "",
    state: profile?.state && (US_STATES as readonly string[]).includes(profile.state) ? profile.state : "",
    howNfwHelped: "",
    surprisedBy: "",
    programsUsed: [],
    improvementIdeas: "",
    feedback: "",
    whyJoin: "",
    permissionGranted: false,
    preferAnonymous: false,
    interestedVideo: false,
  });

  useEffect(() => {
    if (profile?.date_of_birth && profile.date_of_birth !== "1900-01-01") {
      const dob = new Date(profile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      setFormData((prev) => ({ ...prev, age: age.toString() }));
    }
  }, [profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleProgram = (program: StoryProgram) => {
    setFormData((prev) => ({
      ...prev,
      programsUsed: prev.programsUsed.includes(program)
        ? prev.programsUsed.filter((p) => p !== program)
        : [...prev.programsUsed, program],
    }));
  };

  const setPermission = (checked: boolean) => {
    // Anonymity only applies to quotes NFW has permission to use.
    setFormData((prev) => ({
      ...prev,
      permissionGranted: checked,
      preferAnonymous: checked ? prev.preferAnonymous : false,
    }));
  };

  const hasStoryAnswer =
    (Object.keys(STORY_TEXT_PROMPTS) as StoryTextKey[]).some((k) => formData[k].trim()) ||
    formData.programsUsed.length > 0;

  const memberInfoComplete =
    formData.name.trim() &&
    formData.email.trim() &&
    formData.age.trim() &&
    formData.city.trim() &&
    formData.state;

  const canSubmit = Boolean(memberInfoComplete && hasStoryAnswer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberInfoComplete) {
      setError("Please complete all Member Information fields.");
      return;
    }
    if (!hasStoryAnswer) {
      setError("Please answer at least one of the story prompts.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      router.push("/share-your-story/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const renderTextPrompt = (key: StoryTextKey, rows = 4) => (
    <div key={key} className="mb-4">
      <label htmlFor={key} className={labelClass}>
        {STORY_TEXT_PROMPTS[key]}
      </label>
      <textarea
        id={key}
        name={key}
        value={formData[key]}
        onChange={handleChange}
        rows={rows}
        className={`${inputClass} resize-none`}
        placeholder="Share your thoughts..."
      />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-nfw-blackberry/10 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-nfw-blackberry font-serif mb-4">
            Share Your Story
          </h2>
          <p className="text-nfw-blackberry/70 font-sans">{STORY_INTRO}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-nfw-blackberry/10 pb-6">
            <h3 className="text-lg font-bold text-nfw-aubergine font-ui mb-4">Member Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <div className="sm:w-1/2 sm:pr-2">
                <label htmlFor="age" className={labelClass}>
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  id="age"
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  min="13"
                  max="120"
                  className={inputClass}
                />
                </div>
              </div>
              <div>
                <label htmlFor="city" className={labelClass}>
                  City <span className="text-red-500">*</span>
                </label>
                <input id="city" type="text" name="city" value={formData.city} onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label htmlFor="state" className={labelClass}>
                  State <span className="text-red-500">*</span>
                </label>
                <select id="state" name="state" value={formData.state} onChange={handleChange} required className={`${inputClass} bg-white`}>
                  <option value="">Select state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-b border-nfw-blackberry/10 pb-6">
            <h3 className="text-lg font-bold text-nfw-aubergine font-ui mb-4">Your Story</h3>
            <p className="text-sm text-nfw-blackberry/60 font-sans mb-4">
              Answer any of the following prompts to share your experience. At least one answer is required.
            </p>

            {renderTextPrompt("howNfwHelped")}
            {renderTextPrompt("surprisedBy")}

            <fieldset className="mb-4">
              <legend className={labelClass}>{STORY_PROGRAMS_PROMPT}</legend>
              <div className="space-y-2 mt-2">
                {STORY_PROGRAMS.map((p) => (
                  <label key={p.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.programsUsed.includes(p.value)}
                      onChange={() => toggleProgram(p.value)}
                      className="w-4 h-4 accent-nfw-aubergine flex-shrink-0"
                    />
                    <span className="text-sm font-sans text-nfw-blackberry/80">{p.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {renderTextPrompt("improvementIdeas")}
            {renderTextPrompt("feedback", 3)}
            {renderTextPrompt("whyJoin")}
          </div>

          <div>
            <h3 className="text-lg font-bold text-nfw-aubergine font-ui mb-4">Permissions</h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.permissionGranted}
                  onChange={(e) => setPermission(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-nfw-aubergine flex-shrink-0"
                />
                <span className="text-sm font-sans text-nfw-blackberry/80">
                  {STORY_PERMISSIONS.permissionGranted}
                </span>
              </label>

              <label
                className={`flex items-start gap-3 ${
                  formData.permissionGranted ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.preferAnonymous}
                  disabled={!formData.permissionGranted}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, preferAnonymous: e.target.checked }))
                  }
                  className="mt-0.5 w-4 h-4 accent-nfw-aubergine flex-shrink-0"
                />
                <span className="text-sm font-sans text-nfw-blackberry/80">
                  {STORY_PERMISSIONS.preferAnonymous}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.interestedVideo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, interestedVideo: e.target.checked }))
                  }
                  className="mt-0.5 w-4 h-4 accent-nfw-aubergine flex-shrink-0"
                />
                <span className="text-sm font-sans text-nfw-blackberry/80">
                  {STORY_PERMISSIONS.interestedVideo}
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={`w-full py-3 px-6 font-semibold font-ui text-sm transition-colors ${
              canSubmit && !loading
                ? "bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90"
                : "bg-nfw-blackberry/20 text-nfw-blackberry/40 cursor-not-allowed"
            }`}
          >
            {loading ? "Submitting..." : "Submit Your Story"}
          </button>
        </form>
      </div>
    </div>
  );
}
