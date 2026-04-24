export const metadata = {
  title: "CongestionAI",
  description: "Departure planning and congestion forecasting for smarter trips.",
};

import "./globals.css";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen text-slate-900">
        <header className="sticky top-0 z-20 border-b border-white/40 bg-[rgba(248,246,241,0.72)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="group flex items-center gap-3 hover:opacity-90"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-900 text-sm font-semibold text-white shadow-lg shadow-teal-900/20">
                CA
              </span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">
                  CongestionAI
                </span>
                <span className="block text-xs text-slate-500">
                  Plan smarter departures before traffic spikes.
                </span>
              </span>
            </Link>
            <span className="badge badge-warn">Forecast beta</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
