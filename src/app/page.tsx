import Link from "next/link";

const features = [
  {
    icon: "📧",
    title: "Email Invoice Capture",
    description: "Forward or share any invoice PDF or photo to your inbox. AI extracts every field automatically.",
  },
  {
    icon: "🤖",
    title: "AI GL Categorization",
    description: "Each line item is automatically categorized to the right GL account using Claude AI.",
  },
  {
    icon: "📊",
    title: "Google Sheets as your ledger",
    description: "All data lives in your own Google Spreadsheet — transparent, auditable, and always accessible.",
  },
  {
    icon: "🌍",
    title: "Multi-tax support",
    description: "Handles GST, HST, QST, PST, VAT, and US state taxes — all tracked separately per invoice.",
  },
  {
    icon: "📁",
    title: "Auto Drive filing",
    description: "Every invoice PDF is renamed and organized in Google Drive under the right year folder.",
  },
  {
    icon: "💬",
    title: "AI Chat interface",
    description: "Create invoices, query balances, and run reports just by chatting — in English or French.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$25",
    period: "/month",
    description: "Perfect for freelancers and small businesses.",
    features: [
      "Unlimited invoice capture",
      "AI GL categorization",
      "Google Sheets ledger",
      "Google Drive filing",
      "Email + image support",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "For growing businesses with more complexity.",
    features: [
      "Everything in Starter",
      "Multi-currency support",
      "Payroll management",
      "P&L, Balance Sheet, Aging reports",
      "AI Chat assistant",
      "Priority support",
    ],
    cta: "Get started",
    highlight: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-indigo-600">SoulLogic</span>
          <span className="text-xl font-light text-gray-700">AI Accountant</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Your invoices, filed and categorized
          <span className="block text-indigo-600">by AI. Automatically.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
          Forward an invoice email or snap a photo. SoulLogic AI Accountant extracts every field,
          categorizes each line item to the right GL account, uploads to Google Drive, and logs it
          to your Google Sheets ledger — without you lifting a finger.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-indigo-700"
          >
            Start free trial
          </Link>
          <Link
            href="#features"
            className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            Everything your bookkeeper does, automatically
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            Simple, transparent pricing
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlight
                    ? "border-2 border-indigo-600 shadow-lg"
                    : "border border-gray-200 shadow-sm"
                }`}
              >
                {plan.highlight && (
                  <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="mb-1 text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold ${
                    plan.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} SoulLogic AI Accountant. All rights reserved.</p>
      </footer>
    </div>
  );
}
