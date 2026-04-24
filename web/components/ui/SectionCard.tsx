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
  staticCard?: boolean;
}) {
  if (staticCard)
    return <div className={`card p-5 md:p-6 ${className}`}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`card p-5 md:p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}
