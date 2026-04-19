"use client";

import { cn } from "@/lib/utils";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useRef, useState, useEffect } from "react";

export function MovingBorder({
  children,
  duration = 2000,
  rx,
  ry,
  className,
  containerClassName,
    borderClassName,
    borderRadius,
    as: Component = "div",
    ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  borderRadius?: string;
  as?: React.ElementType;
  [key: string]: unknown;
}) {
  const pathRef = useRef<SVGRectElement>(null);
  const [length, setLength] = useState<number>(0);
  const progress = useMotionValue<number>(0);

  useEffect(() => {
    if (pathRef.current) {
      try {
        setLength(pathRef.current.getTotalLength());
      } catch (e) {
        // Handle non-rendered element
      }
    }
  }, []);

  useAnimationFrame((time) => {
    if (length > 0) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(
    progress,
    (val) => {
      try {
        return pathRef.current?.getPointAtLength(val).x ?? 0;
      } catch (e) {
        return 0;
      }
    }
  );
  const y = useTransform(
    progress,
    (val) => {
      try {
        return pathRef.current?.getPointAtLength(val).y ?? 0;
      } catch (e) {
        return 0;
      }
    }
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  const finalRadius = borderRadius || rx || "1.75rem";

    return (
      <Component
        className={cn(
          "relative h-full w-fit overflow-hidden bg-transparent p-[1px] text-xl",
          containerClassName
        )}
        style={{
          borderRadius: finalRadius,
          ...((otherProps.style as React.CSSProperties) || {}),
        }}
        {...otherProps}
      >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${finalRadius} * 0.96)` }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute h-full w-full"
          width="100%"
          height="100%"
        >
          <rect
            fill="none"
            width="100%"
            height="100%"
            rx={finalRadius}
            ry={ry || finalRadius}
            ref={pathRef}
          />
        </svg>
          <motion.div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              display: "inline-block",
              transform,
            }}
          >
            <div
              className={cn(
                "h-12 w-12 bg-[radial-gradient(var(--primary)_40%,transparent_60%)] opacity-[0.6] blur-xl",
                borderClassName
              )}
            />
          </motion.div>
        </div>

        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center bg-slate-900/[0.8] border-none text-white antialiased backdrop-blur-xl",
            className
          )}
          style={{ borderRadius: `calc(${finalRadius} * 0.96)` }}
        >
        {children}
      </div>
    </Component>
  );
}
