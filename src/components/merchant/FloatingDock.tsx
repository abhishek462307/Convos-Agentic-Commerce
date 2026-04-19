"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  MessageSquare, 
  Settings,
  BarChart3,
  Users2
} from "lucide-react";
import { cn } from "@/lib/utils";

const dockItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/products", label: "Catalog", icon: Package },
  { href: "/conversations", label: "Inbox", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Users2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function FloatingDock() {
  const pathname = usePathname();
  const mouseX = useMotionValue(Infinity);

  // Don't show on missions page as requested
  if (pathname?.startsWith("/missions")) return null;

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-end gap-3 md:flex"
    >
      {dockItems.map((item) => (
        <DockIcon key={item.href} mouseX={mouseX} {...item} isActive={pathname === item.href} />
      ))}
    </motion.div>
  );
}

function DockIcon({
  mouseX,
  href,
  label,
  icon: Icon,
  isActive
}: {
  mouseX: MotionValue;
  href: string;
  label: string;
  icon: any;
  isActive: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 64, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 64, 40]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href}>
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative flex items-center justify-center rounded-xl transition-colors pointer-events-auto",
          isActive ? "bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(15,23,42,0.18)]" : "border border-border/50 bg-background/70 text-muted-foreground shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md hover:bg-background/90 hover:text-foreground"
        )}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-10 left-1/2 w-fit -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-sm"
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
        <Icon className="h-5 w-5" />
      </motion.div>
    </Link>
  );
}
