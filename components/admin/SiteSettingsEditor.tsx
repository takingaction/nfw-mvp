"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface SiteSettings {
  robots_txt: string;
  gtm_id: string | null;
}

const GTM_ID_REGEX = /^GTM-[A-Z0-9]+$/;

export default function SiteSettingsEditor() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [robotsTxt, setRobotsTxt] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/site/settings");
        const data = await res.json();
        setSettings(data);
        setRobotsTxt(data.robots_txt || "User-agent: *\nAllow: /");
        setGtmId(data.gtm_id || "");
      } catch (err) {
        console.error("Error fetching site settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const gtmIdValid = gtmId === "" || GTM_ID_REGEX.test(gtmId);

  const handleSave = async () => {
    if (!gtmIdValid) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/site/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robots_txt: robotsTxt,
          gtm_id: gtmId.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-nfw-blackberry/40" />
      </div>
    );
  }

  return (
    <div className="border border-nfw-blackberry/10 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-nfw-blackberry">Site Settings</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-nfw-blackberry/50" />
        ) : (
          <ChevronDown className="w-4 h-4 text-nfw-blackberry/50" />
        )}
      </button>

      {expanded && (
        <div className="px-4 py-4 border-t border-nfw-blackberry/10 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              GTM Container ID
            </label>
            <input
              type="text"
              value={gtmId}
              onChange={(e) => setGtmId(e.target.value.toUpperCase())}
              placeholder="GTM-XXXXXXX"
              className={`w-full px-3 py-2 border text-sm font-mono focus:outline-none resize-none ${
                gtmIdValid
                  ? "border-nfw-blackberry/20 focus:border-nfw-blackberry"
                  : "border-red-500 focus:border-red-500"
              }`}
            />
            {gtmId === "" ? (
              <p className="text-xs text-nfw-blackberry/40 mt-1">
                Google Tag Manager container ID from tagmanager.google.com. Leave blank to disable.
              </p>
            ) : gtmIdValid ? (
              <p className="text-xs text-green-600 mt-1">Valid GTM container ID</p>
            ) : (
              <p className="text-xs text-red-500 mt-1">
                Must match format GTM-XXXXXXX (uppercase letters and numbers only)
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50">
                Robots.txt
              </label>
              <span className="text-xs text-nfw-blackberry/40">
                {robotsTxt.length} characters
              </span>
            </div>
            <textarea
              value={robotsTxt}
              onChange={(e) => setRobotsTxt(e.target.value)}
              rows={6}
              placeholder="User-agent: *&#10;Allow: /"
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm font-mono focus:outline-none focus:border-nfw-blackberry resize-none"
            />
            <p className="text-xs text-nfw-blackberry/40 mt-1">
              Controls search engine crawler access to your site
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !gtmIdValid}
              className="px-4 py-2 text-sm font-bold text-white bg-nfw-blackberry rounded-lg hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
            {saved && (
              <span className="text-sm text-green-600">Saved!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
