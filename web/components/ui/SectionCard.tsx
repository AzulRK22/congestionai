"use client";
import * as React from "react";
import { motion } from "framer-motion";

export function SectionCard({
  children,
  className = "",
  staticCard = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** true = sin animación (útil para MapContainer) */
  staticCard?: boolean;
}) {
  if (staticCard) {
    return <div className={`card p-4 ${className}`}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`card p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}
