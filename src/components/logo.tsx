"use client";

import Image from "next/image";
import { motion } from "motion/react";

const SIZES = {
  sm: 28,
  md: 36,
  lg: 56,
} as const;

export function Logo({
  size = "md",
  animated = true,
  className = "",
}: {
  size?: keyof typeof SIZES;
  animated?: boolean;
  className?: string;
}) {
  const px = SIZES[size];

  return (
    <motion.span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      initial={animated ? { opacity: 0, scale: 0.8, rotate: -8 } : undefined}
      animate={animated ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.08, rotate: -2 }}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-xl bg-primary/40 blur-md"
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <Image
        src="/brand/logo-mark-192.png"
        alt="SunoBro"
        width={px}
        height={px}
        className="relative rounded-xl"
        priority
      />
    </motion.span>
  );
}
