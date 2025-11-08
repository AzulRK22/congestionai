"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Route, Clock, History, Settings } from "lucide-react";

const items = [
  { href: "/", label: "Plan", Icon: Route },
  { href: "/result", label: "Result", Icon: Clock },
  { href: "/history", label: "History", Icon: History },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-3xl grid grid-cols-4 text-sm">
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
