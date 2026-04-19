"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Bot,
  Mic,
  BarChart3,
  Globe,
  Shield,
  Clock,
  MessageCircle,
  TrendingUp,
  Languages,
  Lock,
  Sparkles,
} from "lucide-react";

function AIConversationDemo() {
  const messages = [
    { role: "user", text: "Show me red sneakers" },
    { role: "ai", text: "Here are 3 trending options..." },
    { role: "user", text: "Add the first one to cart" },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-violet-950/50 to-purple-950/50 p-4">
      <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-violet-500/20 px-2 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-[9px] text-violet-300">AI Active</span>
      </div>
      <div className="space-y-2 mt-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.5 + 0.3, duration: 0.3 }}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-1.5 text-[10px]",
                msg.role === "user"
                  ? "bg-violet-500/30 text-violet-100"
                  : "bg-white/10 text-zinc-200"
              )}
            >
              {msg.role === "ai" && (
                <Bot className="inline h-2.5 w-2.5 mr-1 text-violet-400" />
              )}
              {msg.text}
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.3 }}
          className="flex justify-start"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -3, 0] }}
                transition={{ delay: i * 0.15, repeat: Infinity, duration: 0.6 }}
                className="h-1.5 w-1.5 rounded-full bg-violet-400/60"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function VoiceShoppingDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-950/50 to-pink-950/50 p-4 flex flex-col items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full bg-fuchsia-500/20 blur-xl" />
        <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
          <Mic className="h-6 w-6 text-white" />
        </div>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-fuchsia-400/30"
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ repeat: Infinity, duration: 4, times: [0, 0.1, 0.8, 1] }}
        className="mt-4 text-[10px] text-fuchsia-200 text-center"
      >
        "Show me summer dresses under $50"
      </motion.p>
      <div className="absolute bottom-3 left-3 right-3 flex gap-1">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: [4, Math.random() * 16 + 4, 4] }}
            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
            className="flex-1 rounded-full bg-gradient-to-t from-fuchsia-500 to-pink-400"
            style={{ height: 4 }}
          />
        ))}
      </div>
    </div>
  );
}

function AnalyticsDemo() {
  const bars = [35, 55, 40, 70, 60, 85, 75];
  
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-950/50 to-cyan-950/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] text-blue-300 font-medium">Conversion Rate</span>
        <div className="flex items-center gap-1 text-emerald-400 text-[9px]">
          <TrendingUp className="h-2.5 w-2.5" />
          <span>+23%</span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ delay: i * 0.1 + 0.3, duration: 0.5, ease: "easeOut" }}
            className={cn(
              "flex-1 rounded-t-sm",
              i === bars.length - 1
                ? "bg-gradient-to-t from-blue-500 to-cyan-400"
                : "bg-blue-500/40"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[8px] text-zinc-500">
        <span>Mon</span>
        <span>Sun</span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-3 right-3 bg-black/40 backdrop-blur rounded-lg px-2 py-1"
      >
        <div className="text-[9px] text-zinc-400">Total Sales</div>
        <div className="text-sm font-bold text-white">$12,847</div>
      </motion.div>
    </div>
  );
}

function MultiLanguageDemo() {
  const languages = [
    { code: "EN", text: "Hello! How can I help?" },
    { code: "ES", text: "¡Hola! ¿Cómo puedo ayudar?" },
    { code: "FR", text: "Bonjour! Comment puis-je aider?" },
    { code: "JP", text: "こんにちは！お手伝いしますか？" },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950/50 to-teal-950/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[9px] text-emerald-300 font-medium">50+ Languages</span>
      </div>
      <div className="space-y-1.5">
        {languages.map((lang, i) => (
          <motion.div
            key={lang.code}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 + 0.3 }}
            className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5"
          >
            <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
              {lang.code}
            </span>
            <span className="text-[9px] text-zinc-300 truncate">{lang.text}</span>
          </motion.div>
        ))}
      </div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className="absolute -bottom-6 -right-6 opacity-10"
      >
        <Languages className="h-24 w-24 text-emerald-400" />
      </motion.div>
    </div>
  );
}

function SecurityDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-orange-950/50 to-red-950/50 p-4 flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.3 }}
        className="relative"
      >
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <Lock className="h-2 w-2 text-white" />
        </motion.div>
      </motion.div>
      <div className="mt-3 flex gap-2">
          {["GDPR", "PCI", "Encrypted"].map((badge, i) => (
          <motion.span
            key={badge}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.15 }}
            className="text-[8px] font-bold text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded-full"
          >
            {badge}
          </motion.span>
        ))}
      </div>
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.1)_0%,transparent_70%)]"
      />
    </div>
  );
}

function AvailabilityDemo() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-indigo-950/50 to-violet-950/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-3.5 w-3.5 text-indigo-400" />
        <span className="text-[9px] text-indigo-300 font-medium">Always Online</span>
      </div>
      <div className="relative">
        <div className="grid grid-cols-12 gap-0.5">
          {hours.map((hour, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 + 0.3 }}
              className="h-3 rounded-sm bg-indigo-500/40 hover:bg-indigo-500/60 transition-colors"
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[7px] text-zinc-500">
          <span>12AM</span>
          <span>12PM</span>
          <span>11PM</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-2 flex items-center gap-1.5"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] text-zinc-400">342 conversations today</span>
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
        className="absolute -bottom-8 -right-8 opacity-5"
      >
        <Clock className="h-32 w-32 text-indigo-400" />
      </motion.div>
    </div>
  );
}

function BargainModeDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-950/50 to-orange-950/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] text-amber-300 font-medium">Price Negotiation</span>
      </div>
      <div className="space-y-2">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end"
        >
          <div className="bg-amber-500/20 rounded-xl rounded-tr-sm px-2.5 py-1.5 max-w-[85%]">
            <p className="text-[10px] text-amber-100">Can I get this for $35?</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-start"
        >
          <div className="bg-white/10 rounded-xl rounded-tl-sm px-2.5 py-1.5 max-w-[85%]">
            <p className="text-[10px] text-zinc-200">
              <Bot className="inline h-2.5 w-2.5 mr-1 text-amber-400" />
              I can offer <span className="text-amber-400 font-bold">$38</span> - best price!
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.3 }}
          className="flex justify-end"
        >
          <div className="bg-amber-500/20 rounded-xl rounded-tr-sm px-2.5 py-1.5 max-w-[85%]">
            <p className="text-[10px] text-amber-100">Deal! Add to cart</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 }}
          className="flex justify-center mt-2"
        >
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-1">
            <span className="text-[9px] text-emerald-400 font-medium">You saved $7!</span>
          </div>
        </motion.div>
      </div>
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute -bottom-4 -right-4 opacity-10"
      >
        <svg className="h-20 w-20 text-amber-400" viewBox="0 0 32 32" fill="currentColor">
          <path d="M16 2L4 8v8c0 7.5 5.5 13 12 16 6.5-3 12-8.5 12-16V8L16 2z" />
        </svg>
      </motion.div>
    </div>
  );
}

function AppStoreDemo() {
  const apps = [
    { name: "Analytics Pro", color: "bg-blue-500", icon: "📊" },
    { name: "Email Magic", color: "bg-purple-500", icon: "✉️" },
    { name: "Ship Fast", color: "bg-emerald-500", icon: "🚀" },
    { name: "SEO Boost", color: "bg-pink-500", icon: "🔍" },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-pink-950/50 to-purple-950/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] text-pink-300 font-medium">App Marketplace</span>
        <span className="text-[8px] text-zinc-500">200+ apps</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {apps.map((app, i) => (
          <motion.div
            key={app.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15 + 0.3 }}
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 rounded-lg p-2 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className={`w-7 h-7 rounded-lg ${app.color}/20 flex items-center justify-center mb-1.5`}>
              <span className="text-sm">{app.icon}</span>
            </div>
            <p className="text-[8px] text-zinc-300 font-medium truncate">{app.name}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-2 flex items-center justify-center gap-1"
      >
        <span className="text-[8px] text-pink-400">+ Install more</span>
      </motion.div>
    </div>
  );
}

const featureComponents: Record<string, () => React.ReactElement> = {
  "AI Conversations": AIConversationDemo,
  "Voice Shopping": VoiceShoppingDemo,
  "Deep Analytics": AnalyticsDemo,
  "Multi-language": MultiLanguageDemo,
  "Enterprise Security": SecurityDemo,
  "24/7 Availability": AvailabilityDemo,
  "Bargain Mode": BargainModeDemo,
  "App Store": AppStoreDemo,
};

export function FeatureGrid({
  features,
  className,
}: {
  features: {
    title: string;
    description: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4",
        className
      )}
    >
      {features.map((feature, idx) => {
        const DemoComponent = featureComponents[feature.title];
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative h-full rounded-2xl border border-white/[0.08] bg-zinc-900/80 backdrop-blur-sm overflow-hidden group-hover:border-white/[0.15] transition-colors">
              <div className="h-28 sm:h-36 overflow-hidden">
                {DemoComponent ? (
                  <DemoComponent />
                ) : (
                  <div className="h-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-violet-500/20" />
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5 border-t border-white/[0.05]">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  {feature.icon}
                  <h3 className="font-semibold text-white text-sm">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-zinc-400 text-[11px] sm:text-xs leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
