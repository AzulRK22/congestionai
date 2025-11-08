"use client";
import * as React from "react";
import { clsx } from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
  size?: "sm" | "md";
  loading?: boolean;
};
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "btn",
        variant === "primary" ? "btn-primary" : "btn-outline",
        size === "sm" ? "px-3 py-1.5 text-xs" : "",
        (disabled || loading) && "cursor-not-allowed",
        className,
      )}
    >
      {loading ? "…" : children}
    </button>
  );
}
