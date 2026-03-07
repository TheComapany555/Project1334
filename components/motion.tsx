"use client";

import { motion } from "framer-motion";

export const MotionDiv = motion.div;
export const MotionSection = motion.section;
export const MotionSpan = motion.span;
export const MotionP = motion.p;
export const MotionH1 = motion.h1;
export const MotionH2 = motion.h2;
export const MotionUl = motion.ul;
export const MotionLi = motion.li;

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};
