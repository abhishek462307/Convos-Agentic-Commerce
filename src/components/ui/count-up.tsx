"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";

interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  separator?: string;
  decimals?: number;
}

export default function CountUp({
  from = 0,
  to,
  duration = 2,
  prefix = "",
  suffix = "",
  className = "",
  separator = ",",
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(from);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState(
    `${prefix}${formatNumber(from, separator, decimals)}${suffix}`
  );

  useEffect(() => {
    if (inView) {
      motionValue.set(to);
    }
  }, [inView, motionValue, to]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v: number) => {
      setDisplay(`${prefix}${formatNumber(v, separator, decimals)}${suffix}`);
    });
    return unsubscribe;
  }, [spring, prefix, suffix, separator, decimals]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

function formatNumber(n: number, separator: string, decimals: number): string {
  const fixed = n.toFixed(decimals);
  if (!separator) return fixed;
  const [int, dec] = fixed.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}
