"use client";

import * as React from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = React.useState("");
  const [plan, setPlan] = React.useState<"starter" | "pro">("pro");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            SoulLogic AI Accountant
          </Link>
          <p className="mt-2 text-sm text-gray-500">Start your free 14-day trial</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Plan selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Choose a plan</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "starter", name: "Starter", price: "$29/mo" },
                  { id: "pro", name: "Pro", price: "$79/mo" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id as "starter" | "pro")}
                    className={`rounded-lg border p-3 text-left transition ${
                      plan === p.id
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Redirecting to checkout..." : "Continue to payment"}
            </button>

            <p className="text-center text-xs text-gray-400">
              14-day free trial · Cancel anytime · Secure payment via Stripe
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
