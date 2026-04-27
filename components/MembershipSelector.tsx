"use client";

import { useState } from "react";

const plans = [
  {
    id: "free",
    name: "Free Member",
    price: "$0",
    period: "forever",
    description: "Basic access to NFW community",
    features: ["Community access", "Newsletter", "Event notifications"],
    priceId: null,
  },
  {
    id: "contributing",
    name: "Contributing Member",
    price: "$1",
    period: "/year",
    description: "Support NFW and unlock perks",
    features: [
      "All Free features",
      "Member perks & discounts",
      "Voting rights",
      "Member badge",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CONTRIBUTING,
  },
  {
    id: "founding",
    name: "Founding Member",
    price: "$100",
    period: "/year",
    description: "Maximum support for NFW mission",
    features: [
      "All Contributing features",
      "Founding member recognition",
      "Early access to events",
      "Direct input on initiatives",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FOUNDING,
    highlighted: true,
  },
];

export default function MembershipSelector() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelectPlan = async (plan: (typeof plans)[0]) => {
    if (!plan.priceId) {
      // Free plan - just update profile
      window.location.href = "/profile";
      return;
    }

    setLoading(plan.id);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.priceId,
          membershipLevel: plan.id,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`border p-6 ${
              plan.highlighted
                ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            {plan.highlighted && (
              <span className="bg-blue-500 text-white text-xs px-3 py-1 mb-4 inline-block">
                Most Impact
              </span>
            )}

            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>

            <div className="mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-gray-500">{plan.period}</span>
            </div>

            <p className="text-gray-600 mb-4">{plan.description}</p>

            <ul className="space-y-2 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center text-sm">
                  <svg
                    className="w-4 h-4 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={loading === plan.id}
              className={`w-full py-3 px-4 font-medium transition ${
                plan.highlighted
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {loading === plan.id
                ? "Loading..."
                : plan.priceId
                  ? "Select Plan"
                  : "Continue Free"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
