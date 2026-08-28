"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Settings } from "lucide-react";

interface SystemSettings {
  shopify_checkout_enabled: boolean;
  shopify_last_health_check: string | null;
  shopify_health_status: string;
  shopify_health_message: string | null;
  shopify_external_status: string;
  shopify_external_message: string;
  shopify_external_updated_at: string | null;
  updated_at: string;
}

interface ExternalStatus {
  status: string;
  description: string;
  components: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  updated_at: string;
}

interface HealthCheckResult {
  status: string;
  message: string;
  timestamp: string;
  responseTime?: number;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "healthy":
    case "operational":
      return "text-green-600";
    case "degraded_performance":
      return "text-yellow-500";
    case "partial_outage":
    case "unhealthy":
      return "text-orange-500";
    case "major_outage":
      return "text-red-600";
    case "maintenance":
      return "text-blue-500";
    case "error":
    case "unknown":
    default:
      return "text-gray-400";
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case "healthy":
    case "operational":
      return "bg-green-100 text-green-700";
    case "degraded_performance":
      return "bg-yellow-100 text-yellow-700";
    case "partial_outage":
    case "unhealthy":
      return "bg-orange-100 text-orange-700";
    case "major_outage":
      return "bg-red-100 text-red-700";
    case "maintenance":
      return "bg-blue-100 text-blue-700";
    case "error":
    case "unknown":
    default:
      return "bg-gray-100 text-gray-500";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "healthy":
    case "operational":
      return <CheckCircle className="w-4 h-4" />;
    case "degraded_performance":
    case "partial_outage":
    case "unhealthy":
    case "major_outage":
      return <AlertTriangle className="w-4 h-4" />;
    case "maintenance":
      return <RefreshCw className="w-4 h-4" />;
    default:
      return <XCircle className="w-4 h-4" />;
  }
}

export default function SystemSettingsClient() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [externalStatus, setExternalStatus] = useState<ExternalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [checkingExternal, setCheckingExternal] = useState(false);

  console.log("SystemSettingsClient rendering, settings:", settings, "loading:", loading);

  const fetchSettings = useCallback(async () => {
    console.log("fetchSettings called");
    try {
      const res = await fetch("/api/system-settings");
      console.log("fetchSettings response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("fetchSettings data:", data);
        setSettings(data);
      } else {
        console.log("fetchSettings failed with status:", res.status);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExternalStatus = useCallback(async () => {
    try {
      setCheckingExternal(true);
      const res = await fetch("/api/system-settings/external-status");
      if (res.ok) {
        const data = await res.json();
        setExternalStatus(data);
      }
    } catch (err) {
      console.error("Error fetching external status:", err);
    } finally {
      setCheckingExternal(false);
    }
  }, []);

  useEffect(() => {
    console.log("useEffect ran");
    async function doFetch() {
      console.log("doFetch starting");
      try {
        const res = await fetch("/api/system-settings");
        console.log("doFetch response:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("doFetch data:", data);
          setSettings(data);
        }
      } catch (err) {
        console.error("doFetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    doFetch();
  }, []);

  const handleToggleCheckout = async () => {
    console.log("Toggle clicked, settings:", settings);
    if (!settings) {
      console.log("Settings is null, returning early");
      return;
    }
    
    const newValue = !settings.shopify_checkout_enabled;
    console.log("Toggling from", settings.shopify_checkout_enabled, "to", newValue);
    
    // Optimistic update
    setSettings((prev) => {
      console.log("Updating settings, prev:", prev);
      return prev ? { ...prev, shopify_checkout_enabled: newValue } : null;
    });
    setSaving(true);
    
    try {
      const res = await fetch("/api/system-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopify_checkout_enabled: newValue }),
      });
      
      if (!res.ok) {
        // Revert on error
        setSettings((prev) => prev ? { ...prev, shopify_checkout_enabled: !newValue } : null);
        setSaving(false);
        alert("Failed to update setting");
      } else {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      // Revert on error
      setSettings((prev) => prev ? { ...prev, shopify_checkout_enabled: !newValue } : null);
      console.error("Error saving setting:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setCheckingHealth(true);
    
    try {
      const res = await fetch("/api/system-settings/health-check", {
        method: "POST",
      });
      
      if (res.ok) {
        const data: HealthCheckResult = await res.json();
        setSettings((prev) => prev ? {
          ...prev,
          shopify_last_health_check: data.timestamp,
          shopify_health_status: data.status,
          shopify_health_message: data.message,
        } : null);
      } else {
        alert("Failed to run health check");
      }
    } catch (err) {
      console.error("Error running health check:", err);
      alert("Failed to run health check");
    } finally {
      setCheckingHealth(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-nfw-blackberry/40" />
      </div>
    );
  }

  const checkoutEnabled = settings?.shopify_checkout_enabled ?? true;
  const healthStatus = settings?.shopify_health_status ?? "unknown";
  const healthMessage = settings?.shopify_health_message;
  const lastHealthCheck = settings?.shopify_last_health_check ?? null;

  return (
    <div className="space-y-8">
      {/* Shopify Checkout Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-nfw-wisteria/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-nfw-wisteria/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-nfw-wisteria" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-nfw-blackberry font-serif">
                Shopify Checkout
              </h2>
              <p className="text-sm text-nfw-blackberry/60">
                Control whether users can claim items from the Zero Dollar Store
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-nfw-blackberry">
                Enable Shopify Checkout
              </h3>
              <p className="text-sm text-nfw-blackberry/60">
                When disabled, users will see an unavailable message
              </p>
            </div>
            <button
              onClick={handleToggleCheckout}
              disabled={saving}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                checkoutEnabled ? "bg-green-500" : "bg-gray-300"
              } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  checkoutEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Status Indicator */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusBgColor(checkoutEnabled ? "operational" : "unknown")}`}>
            {getStatusIcon(checkoutEnabled ? "operational" : "unknown")}
            <span className="font-semibold text-sm">
              {checkoutEnabled ? "Checkout Enabled" : "Checkout Disabled"}
            </span>
          </div>

          {/* Health Check */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-nfw-blackberry mb-4">
              Internal Health Check
            </h3>
            <p className="text-sm text-nfw-blackberry/60 mb-4">
              Tests our specific store&apos;s Shopify Admin API access
            </p>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleRunHealthCheck}
                disabled={checkingHealth}
                className="flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white rounded-lg hover:bg-nfw-blackberry/90 transition-colors disabled:opacity-50"
              >
                {checkingHealth ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Run Health Check
              </button>
              
              <div className="text-sm text-nfw-blackberry/60">
                Last check: {formatTimeAgo(lastHealthCheck)}
              </div>
            </div>

            {/* Health Result */}
            {healthMessage && (
              <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${getStatusBgColor(healthStatus)}`}>
                {getStatusIcon(healthStatus)}
                <div>
                  <div className="font-semibold capitalize">{healthStatus}</div>
                  <div className="text-sm opacity-80">{healthMessage}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* External Status Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-nfw-lilac/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nfw-lilac/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-nfw-lilac" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-nfw-blackberry font-serif">
                  Shopify Status (External)
                </h2>
                <p className="text-sm text-nfw-blackberry/60">
                  Global Shopify infrastructure status from shopifystatus.com
                </p>
              </div>
            </div>
            <button
              onClick={fetchExternalStatus}
              disabled={checkingExternal}
              className="flex items-center gap-2 text-sm text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkingExternal ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Overall Status */}
          <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg mb-6 ${getStatusBgColor(externalStatus?.status || "unknown")}`}>
            {getStatusIcon(externalStatus?.status || "unknown")}
            <span className="font-semibold">
              {externalStatus?.description || "Loading..."}
            </span>
          </div>
          
          {/* Last Updated */}
          <p className="text-xs text-nfw-blackberry/50 mb-4">
            Last updated: {externalStatus?.updated_at ? formatTimeAgo(externalStatus.updated_at) : "Never"}
          </p>

          {/* Components */}
          {externalStatus?.components && externalStatus.components.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-semibold text-nfw-blackberry mb-3">Components</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {externalStatus.components.map((component) => (
                  <div
                    key={component.id}
                    className={`p-3 rounded-lg ${getStatusBgColor(component.status)}`}
                  >
                    <div className="font-medium text-sm">{component.name}</div>
                    <div className="text-xs opacity-80 capitalize">
                      {component.status.replace(/_/g, " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info Box */}
      <div className="bg-nfw-citrine/20 border border-nfw-citrine/40 rounded-lg p-4">
        <p className="text-sm text-nfw-blackberry">
          <strong>Note:</strong> When checkout is disabled, users will see a message when attempting to claim items from the Zero Dollar Store. 
          The internal health check tests your store&apos;s Shopify Admin API access. The external status shows Shopify&apos;s global infrastructure status.
        </p>
      </div>

      {/* Future Services Placeholder */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-nfw-blackberry font-serif">
            Future Monitoring
          </h2>
          <p className="text-sm text-nfw-blackberry/60">
            Additional services to be added
          </p>
        </div>
        <div className="p-6 space-y-3 opacity-60">
          {[
            { name: "Supabase Database", icon: "🗄️" },
            { name: "Resend Email", icon: "📧" },
          ].map((service) => (
            <div
              key={service.name}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-xl">{service.icon}</span>
              <span className="text-nfw-blackberry">{service.name}</span>
              <span className="ml-auto text-xs text-nfw-blackberry/50">(Coming soon)</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
