"use client";

import { cn } from "@/lib/utils";
import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";

interface SparklesCoreProps {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
  particleSpeed?: number;
}

export function SparklesCore({
  id,
  className,
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 100,
  particleColor = "#FFF",
  particleSpeed = 1,
}: SparklesCoreProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    driftX: number;
    driftY: number;
    blur: number;
  }>>([]);
  const generatedId = useId();
  const containerId = id || generatedId;

    useEffect(() => {
      const newParticles = Array.from({ length: particleDensity }, (_, i) => {
        const size = Math.random() * (maxSize - minSize) + minSize;
        return {
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: size,
          duration: (Math.random() * 3 + 2) / (particleSpeed * (size / maxSize)),
          delay: Math.random() * 5,
          driftX: (Math.random() - 0.5) * 15,
          driftY: (Math.random() - 0.5) * 15,
          blur: size < 0.8 ? 1 : 0,
        };
      });
      setParticles(newParticles);
    }, [particleDensity, minSize, maxSize, particleSpeed]);

  return (
    <div
      id={containerId}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ background }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particleColor,
            filter: particle.blur ? `blur(${particle.blur}px)` : "none",
            boxShadow: particle.size > 0.8 ? `0 0 ${particle.size * 4}px ${particleColor}` : "none",
          }}
          animate={{
            opacity: [0, 1, 0.8, 1, 0],
            scale: [0, 1, 1.1, 1, 0],
            x: [0, particle.driftX * 0.5, particle.driftX],
            y: [0, particle.driftY * 0.5, particle.driftY],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

export function Sparkles({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0">
        <SparklesCore
          particleDensity={50}
          particleColor="#8b5cf6"
          minSize={0.6}
          maxSize={1.4}
        />
      </div>
      {children}
    </div>
  );
}
