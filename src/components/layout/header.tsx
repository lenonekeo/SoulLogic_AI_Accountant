"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const breadcrumbMap: Record<string, string> = {
  "": "Dashboard",
  invoices: "Invoices",
  purchases: "Purchases",
  receipts: "Receipts",
  payments: "Payments",
  payroll: "Payroll",
  clients: "Clients",
  vendors: "Vendors",
  items: "Items",
  employees: "Employees",
  bank: "Bank Accounts",
  "credit-cards": "Credit Cards",
  ledger: "General Ledger",
  subledger: "Subledger",
  "chart-of-accounts": "Chart of Accounts",
  "tax-rates": "Tax Rates",
  dimensions: "Dimensions",
  reports: "Reports",
  settings: "Settings",
  "voice-log": "Voice Log",
  new: "New",
  edit: "Edit",
};

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const name = session?.user?.name ?? "User";
  const image = session?.user?.image;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
          Home
        </Link>
        {segments.map((seg, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/");
          const label = breadcrumbMap[seg] ?? seg;
          const isLast = i === segments.length - 1;
          return (
            <span key={href} className="flex items-center gap-2">
              <span className="text-gray-300">/</span>
              {isLast ? (
                <span className="font-medium text-gray-900">{label}</span>
              ) : (
                <Link href={href} className="text-gray-500 hover:text-gray-700">
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/chat"
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          AI Chat
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full focus:outline-none"
          >
            {image ? (
              <img src={image} alt={name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {initials}
              </div>
            )}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-xs font-medium text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
