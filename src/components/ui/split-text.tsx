"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface SplitTextProps {
  text?: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: "left" | "center" | "right";
  onLetterAnimationComplete?: () => void;
}

export default function SplitText({
  text = "",
  className = "",
  delay = 0.05,
  duration = 1.2,
  ease = "power3.out",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onLetterAnimationComplete,
}: SplitTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const [inView, setInView] = useState(false);

  const letters = text.split("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useGSAP(
    () => {
      if (!inView) return;

      const el = containerRef.current;
      if (!el) return;

      gsap.fromTo(el.querySelectorAll(".letter"), { ...from }, {
        ...to,
        duration,
        ease,
        stagger: delay,
        onComplete: () => {
          if (onLetterAnimationComplete) onLetterAnimationComplete();
        },
      });
    },
    { scope: containerRef, dependencies: [inView] }
  );

  return (
    <span
      ref={containerRef}
      className={className}
      style={{ textAlign, overflow: "hidden", display: "inline-block" }}
    >
      {letters.map((letter, i) => (
        <span
          key={i}
          className="letter"
          style={{
            display: "inline-block",
            whiteSpace: letter === " " ? "pre" : "normal",
            opacity: 0,
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
