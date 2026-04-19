"use client"

import Image from 'next/image';
import { MovingBorder } from '@/components/ui/aceternity/moving-border';
import { cn } from '@/lib/utils';

interface ConvosAiLauncherProps {
  theme: 'light' | 'dark';
  onClick: () => void;
  className?: string;
}

export function ConvosAiLauncher({ theme, onClick, className }: ConvosAiLauncherProps) {
  const isLight = theme === 'light';

  return (
    <MovingBorder
      as="button"
      type="button"
      duration={4200}
      borderRadius="9999px"
      onClick={onClick}
      containerClassName={cn(
        "h-11 min-w-[158px] rounded-full transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isLight
          ? "shadow-[0_14px_30px_rgba(15,23,42,0.16)] focus-visible:ring-offset-[#f8f8f5]"
          : "shadow-[0_16px_36px_rgba(0,0,0,0.38)] focus-visible:ring-offset-[#050505]",
        className
      )}
      className={cn(
        "h-full w-full rounded-full border px-3.5 text-white",
        isLight
          ? "border-black/10 bg-[linear-gradient(180deg,#111114_0%,#07070a_100%)]"
          : "border-white/10 bg-[linear-gradient(180deg,#111114_0%,#050507_100%)]"
      )}
      borderClassName={cn(
        "h-20 w-20 opacity-90 blur-lg",
        isLight
          ? "bg-[radial-gradient(circle,#f5d0fe_10%,#e879f9_34%,#8b5cf6_58%,transparent_74%)]"
          : "bg-[radial-gradient(circle,#ffffff_6%,#f0abfc_26%,#8b5cf6_54%,transparent_74%)]"
      )}
    >
      <span className="flex w-full items-center gap-3">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <span className="absolute inset-[2px] rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.32),transparent_28%),linear-gradient(145deg,#1a1a1d,#040405)]" />
          <Image
            src="/convos-avatar.png"
            alt="Convos"
            width={26}
            height={26}
            className="relative z-10 h-full w-full object-cover scale-[1.1]"
          />
        </span>
        <span className="truncate text-[15px] font-medium tracking-tight text-white">Store AI</span>
      </span>
    </MovingBorder>
  );
}
