"use client";
import * as React from "react";
export function TextField({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${className}`} />;
}
