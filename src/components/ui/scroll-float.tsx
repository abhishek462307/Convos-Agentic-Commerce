"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollFloatProps {
  children: string;
  start?: string;
  end?: string;
  floatValue?: number;
  className?: string;
  containerClassName?: string;
  as?: "h2" | "h3" | "span" | "p";
}

export default function ScrollFloat({
  children,
  start = "top 95%",
  end = "bottom 25%",
  floatValue = 60,
  className = "",
  containerClassName = "",
  as: Tag = "h2",
}: ScrollFloatProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chars = el.querySelectorAll(".sf-char");

    gsap.set(chars, { y: floatValue, opacity: 0 });

      const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top 100%",
            toggleActions: "play none none none",
          },
        });

      tl.to(chars, {
        y: 0,
        opacity: 1,
        stagger: 0.02,
        duration: 0.35,
        ease: "power2.out",
      });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [start, end, floatValue]);

    return (
      <div ref={containerRef} className="overflow-hidden">
        <Tag className={containerClassName || className}>
          {children.split(" ").map((word, wi) => (
            <span key={wi} className="inline-block whitespace-nowrap">
              {word.split("").map((char, ci) => (
                <span
                  key={ci}
                  className="sf-char inline-block will-change-transform"
                  style={{ opacity: 0 }}
                >
                  {char}
                </span>
              ))}
              {wi < children.split(" ").length - 1 && (
                <span className="sf-char inline-block will-change-transform" style={{ opacity: 0 }}>
                  &nbsp;
                </span>
              )}
            </span>
          ))}
        </Tag>
      </div>
    );
}
