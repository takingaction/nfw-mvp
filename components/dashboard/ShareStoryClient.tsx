"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  city: string | null;
  state: string | null;
};

export default function ShareStoryClient({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: profile?.full_name || "",
    email: profile?.email || "",
    age: "",
    city: profile?.city || "",
    state: profile?.state || "",
    drawnToMembership: "",
    programsEngaged: "",
    favoritePart: "",
    howNfwHelped: "",
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.age) {
      setError("Age is required");
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

  const canSubmit = formData.age;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-nfw-blackberry/10 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-nfw-blackberry font-serif mb-4">
            Share Your Story
          </h2>
          <p className="text-nfw-blackberry/70 font-sans">
            Thank you for being a National Fund for Women member and choosing to share your story with us! Your experience helps us shape our programs, lift up our community, and spread the word so we can reach and support even more women across the country.
          </p>
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
                <label className="block text-sm font-semibold text-nfw-blackberry font-ui mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nfw-blackberry font-ui mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nfw-blackberry font-ui mb-1">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  min="13"
                  max="120"
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nfw-blackberry font-ui mb-1">
                  Location (City, State) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={`${formData.city || ""}${formData.city && formData.state ? ", " : ""}${formData.state || ""}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parts = val.split(",").map((p) => p.trim());
                    setFormData((prev) => ({
                      ...prev,
                      city: parts[0] || "",
                      state: parts[1] || "",
                    }));
                  }}
                  placeholder="City, State"
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-nfw-blackberry/10 pb-6">
            <h3 className="text-lg font-bold text-nfw-aubergine font-ui mb-4">
              Your Story
            </h3>
            <p className="text-sm text-nfw-blackberry/60 font-sans mb-4">
              Optional: Answer any of the following prompts to share your experience.
            </p>

            {[
              {
                name: "drawnToMembership",
                label: "What drew you to becoming a National Fund for Women member?",
              },
              {
                name: "programsEngaged",
                label: "Which NFW program(s) have you engaged with? What was your experience?",
              },
              {
                name: "favoritePart",
                label: "What is your favorite part about being an NFW member?",
              },
              {
                name: "howNfwHelped",
                label: "How has NFW helped you?",
              },
              {
                name: "whyJoin",
                label: "Why should others join NFW?",
              },
            ].map((field) => (
              <div key={field.name} className="mb-4">
                <label className="block text-sm font-semibold text-nfw-blackberry font-ui mb-1">
                  {field.label}
                </label>
                <textarea
                  name={field.name}
                  value={formData[field.name as keyof typeof formData] as string}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine resize-none"
                  placeholder="Share your thoughts..."
                />
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-bold text-nfw-aubergine font-ui mb-4">
              Permissions
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="permissionGranted"
                  checked={formData.permissionGranted}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 w-4 h-4 accent-nfw-aubergine flex-shrink-0"
                />
                <span className="text-sm font-sans text-nfw-blackberry/80">
                  I grant NFW permission to utilize excerpts from this submission for its website, email newsletters, social media platforms, and various other external outreach. When using quotes, we will only attribute them by your first name, age, and state of residence.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="preferAnonymous"
                  checked={formData.preferAnonymous}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 w-4 h-4 accent-nfw-aubergine flex-shrink-0"
                />
                <span className="text-sm font-sans text-nfw-blackberry/80">
                  I prefer that any of my quoted statements remain anonymous.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="interestedVideo"
                  checked={formData.interestedVideo}
                  onChange={handleCheckboxChange}
                  className="mt-0.5 w-4 h-4 accent-nfw-aubergine flex-shrink-0"
                />
                <span className="text-sm font-sans text-nfw-blackberry/80">
                  Are you interested in recording a brief video for NFW&apos;s social media platforms? A modest honorarium may be available for participants.
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