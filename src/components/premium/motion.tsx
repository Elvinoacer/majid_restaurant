"use client";

/**
 * Reusable scroll-triggered animation wrapper using framer-motion.
 *
 * Wraps children in a `motion.div` that fades/slides into view when the
 * element enters the viewport. Plays once, so scrolling back up doesn't
 * re-trigger (less distracting, more premium feel).
 *
 * Usage:
 *   <FadeIn>          — fade up (default)
 *   <FadeIn dir="left"> — slide in from left
 *   <FadeIn delay={0.2}> — 200ms entrance delay (for staggering siblings)
 */
import { motion, type Variants } from "framer-motion";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

export function FadeIn({
  children,
  className,
  dir = "up",
  delay = 0,
  duration = 0.5,
  once = true,
  amount = 0.15,
  as,
}: {
  children: React.ReactNode;
  className?: string;
  dir?: Direction;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  as?: React.ElementType;
}) {
  const offset = OFFSETS[dir];
  const Comp = as ? (motion as Record<string, unknown>)[as as string] ?? motion.div : motion.div;

  const variants: Variants = {
    hidden: { opacity: 0, x: offset.x, y: offset.y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.22, 0.61, 0.36, 1], // matches --ease-out
      },
    },
  };

  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants}
    >
      {children}
    </Comp>
  );
}

/**
 * Stagger container — wraps children that each have their own
 * entrance animation. Children must use `variants` from `staggerChild`.
 */
export function StaggerContainer({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Child variant for use inside a StaggerContainer */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 0.61, 0.36, 1],
    },
  },
};

export { motion };
