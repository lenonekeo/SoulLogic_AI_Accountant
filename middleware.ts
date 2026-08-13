export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/receipts/:path*",
    "/clients/:path*",
    "/purchases/:path*",
    "/payments/:path*",
    "/vendors/:path*",
    "/payroll/:path*",
    "/employees/:path*",
    "/bank/:path*",
    "/credit-cards/:path*",
    "/ledger/:path*",
    "/subledger/:path*",
    "/chart-of-accounts/:path*",
    "/reports/:path*",
    "/dimensions/:path*",
    "/tax-rates/:path*",
    "/items/:path*",
    "/settings/:path*",
    "/chat/:path*",
    "/voice-log/:path*",
  ],
};
