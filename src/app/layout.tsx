import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ToastProvider } from "@/components/ui/toast";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SoulLogic AI Accountant",
  description: "Canadian accounting powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ToastProvider>
            <div className="flex min-h-screen bg-gray-50">
              <Sidebar />
              <div className="flex flex-1 flex-col pl-56">
                <Header />
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
