"use client";

import { motion } from "motion/react";

// The name just fades up out of a soft blur, no letter tricks.
export function DnaName({ text, delay = 0.3 }: { text: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, filter: "blur(12px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.6, delay, ease: "easeOut" }}
      className="dna-text inline-block pb-[0.06em] pr-[0.04em]"
    >
      {text}
    </motion.span>
  );
}
