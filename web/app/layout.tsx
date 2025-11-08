export const metadata = {
  title: "CongestionAI",
  description: "Cuándo NO manejar",
};

import "./globals.css";
import Link from "next/link";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-screen text-slate-900`}>
        <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="font-bold tracking-tight hover:opacity-80"
            >
              CongestionAI
            </Link>
            <span className="badge badge-warn">Beta</span>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
