"use client";
import * as React from "react";
import { clsx } from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};
export function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={clsx(
        "btn",
        variant === "primary" ? "btn-primary" : "btn-outline",
        disabled && "cursor-not-allowed",
        className,
      )}
    />
  );
}
