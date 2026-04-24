"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Route, Clock3, History, Settings, Waves } from "lucide-react";

const items = [
  { href: "/", label: "Plan", Icon: Route },
  { href: "/result", label: "Result", Icon: Clock3 },
  { href: "/forecast", label: "Forecast", Icon: Waves },
  { href: "/history", label: "History", Icon: History },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-white/40 bg-[rgba(248,246,241,0.78)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-2 py-2 text-sm">
        {items.map(({ href, label, Icon }) => {
          const active =
            path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? "nav-item-active" : "text-slate-600"}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
