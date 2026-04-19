"use client";

import {
  MessageSquare,
  Bot,
  Mic,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Sparkles,
  Zap,
  Globe,
  ArrowRight,
  ShoppingCart,
  Smartphone,
  CreditCard,
  Brain,
  Shield,
  Clock,
  Users,
  Star,
  Check,
} from "lucide-react";

const LOGO_URL =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/Blue-and-Black-Minimalist-Brand-Logo-3-1768609870958.png?width=8000&height=8000&resize=contain";

function HeroBg() {
  return (
    <>
      {/* Light rays from top center */}
      <div
        style={{
          position: "absolute",
          top: "-40%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "140%",
          height: "100%",
          background: "conic-gradient(from 90deg at 50% 0%, rgba(168,85,247,0.08) 0deg, transparent 60deg, transparent 120deg, rgba(168,85,247,0.06) 180deg, transparent 240deg, transparent 300deg, rgba(168,85,247,0.08) 360deg)",
          pointerEvents: "none",
        }}
      />
      {/* Purple center glow */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(168,85,247,0.12) 0%, rgba(126,34,206,0.06) 40%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Secondary pink glow */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "15%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function LogoBadge({ position = "top-left" }: { position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" }) {
  const posStyle: React.CSSProperties =
    position === "top-left"
      ? { top: 28, left: 32 }
      : position === "top-right"
        ? { top: 28, right: 32 }
        : position === "bottom-left"
          ? { bottom: 28, left: 32 }
          : position === "bottom-right"
            ? { bottom: 28, right: 32 }
            : { top: 28, left: "50%", transform: "translateX(-50%)" };

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 0,
        ...posStyle,
      }}
    >
      { }
      <img
        src={LOGO_URL}
        alt="Convos"
        style={{ height: 28, width: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

function ScreenFrame({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 64 }}>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#555",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
          }}
        >
          Screenshot {index}
        </span>
        <span style={{ fontSize: 10, color: "#444" }}>1270 x 760</span>
      </div>
      <div
        id={`ph-screenshot-${index}`}
        style={{
          position: "relative",
          width: 1270,
          height: 760,
          overflow: "hidden",
          flexShrink: 0,
          borderRadius: 12,
          border: "1px solid #222",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Screenshot1() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#050505",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
        <HeroBg />
        <LogoBadge position="top-left" />

          {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "0 60px",
            maxWidth: 1000,
          }}
        >
          {/* Pill badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 20px",
              borderRadius: 9999,
              border: "1px solid rgba(168, 85, 247, 0.2)",
              background: "rgba(168, 85, 247, 0.06)",
              backdropFilter: "blur(20px)",
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 44,
              letterSpacing: "0.02em",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 12px",
                borderRadius: 9999,
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.2))",
                fontSize: 10,
                fontWeight: 800,
                color: "#c084fc",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
              }}
            >
              <Sparkles style={{ width: 10, height: 10 }} />
              NEW
            </span>
            The future of commerce is conversational
          </div>

          {/* Main heading */}
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 0.95,
              marginBottom: 16,
              backgroundImage: "linear-gradient(160deg, #ffffff 0%, #f0f0f0 30%, #a855f7 55%, #ec4899 80%, #f5f5f5 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Your Store Never
          </div>
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 0.95,
              marginBottom: 24,
              backgroundImage: "linear-gradient(160deg, #ec4899 0%, #a855f7 40%, #ffffff 70%, #e2e2e2 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Sleeps Again.
          </div>

          {/* Subheading */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.42)",
              marginBottom: 44,
              maxWidth: 540,
            }}
          >
            Deploy AI agents that <span style={{ color: "rgba(255,255,255,0.7)" }}>converse</span>,{" "}
            <span style={{ color: "rgba(255,255,255,0.7)" }}>negotiate</span>, and{" "}
            <span style={{ color: "rgba(255,255,255,0.7)" }}>close deals</span> on WhatsApp, Voice & Web
            — autonomously, 24/7, in 50+ languages.
          </div>

          {/* CTA row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 52 }}>
            <div
              style={{
                padding: "15px 38px",
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(135deg, #a855f7, #ec4899)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 0 30px rgba(168, 85, 247, 0.35), 0 0 80px rgba(236, 72, 153, 0.15)",
                letterSpacing: "0.01em",
              }}
            >
              Launch Your Agent
              <ArrowRight style={{ width: 15, height: 15 }} />
            </div>
            <div
              style={{
                padding: "15px 32px",
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 500,
                color: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                backdropFilter: "blur(10px)",
              }}
            >
              <Zap style={{ width: 14, height: 14, color: "#a855f7" }} />
              Watch Demo
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 40,
            }}
          >
            {[
              { value: "2.4x", label: "Higher Conversions" },
              { value: "<3s", label: "Response Time" },
              { value: "50+", label: "Languages" },
              { value: "24/7", label: "Always On" },
            ].map((stat, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    backgroundImage: "linear-gradient(135deg, #c084fc, #f472b6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* Bottom bar with features */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(20px)",
        }}
      >
        {[
          { icon: MessageSquare, label: "Chat Commerce" },
          { icon: Mic, label: "Voice AI" },
          { icon: Globe, label: "50+ Languages" },
          { icon: ShoppingCart, label: "Auto Checkout" },
          { icon: Brain, label: "Smart Negotiation" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <item.icon style={{ width: 13, height: 13, color: "rgba(168, 85, 247, 0.5)" }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.02em",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Screenshot2() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#000",
        position: "relative",
      }}
        >
          <HeroBg />
          <LogoBadge position="top-left" />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 64px",
            gap: 60,
          }}
        >
          {/* Left side */}
        <div style={{ flex: 1, maxWidth: 460 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 9999,
              border: "1px solid rgba(168, 85, 247, 0.2)",
              background: "rgba(168, 85, 247, 0.06)",
              fontSize: 11,
              fontWeight: 700,
              color: "#c084fc",
              marginBottom: 24,
            }}
          >
            <Brain style={{ width: 12, height: 12 }} />
            AUTONOMOUS AI AGENTS
          </div>
          <div
            style={{
              fontSize: "2.75rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "#fff",
              marginBottom: 20,
            }}
          >
            Your AI Agent{" "}
            <span
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Negotiates,
              <br />
              Recommends
            </span>{" "}
            & Closes
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#737373",
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 380,
            }}
          >
            AI agents that understand intent, recommend products, negotiate
            prices autonomously, and complete purchases — all through natural
            conversation.
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { value: "2.4x", label: "Conversion", icon: TrendingUp },
              { value: "< 3s", label: "Response", icon: Clock },
              { value: "50+", label: "Languages", icon: Globe },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "14px 20px",
                  borderRadius: 16,
                  background: "#0a0a0a",
                  border: "1px solid #1f1f1f",
                  flex: 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <stat.icon style={{ width: 12, height: 12, color: "#a855f7" }} />
                  <span style={{ fontSize: 10, color: "#737373", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {stat.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Chat UI */}
        <div style={{ flex: 1, maxWidth: 560 }}>
          <div
            style={{
              borderRadius: 20,
              background: "#0a0a0a",
              border: "1px solid #1f1f1f",
              padding: 24,
              overflow: "hidden",
            }}
          >
            {/* Chat header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: "1px solid #1f1f1f",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7, #ec4899)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot style={{ width: 16, height: 16, color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  Convos AI Agent
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#34d399",
                    }}
                  />
                  <span style={{ fontSize: 10, color: "rgba(52,211,153,0.7)" }}>
                    Active now
                  </span>
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", fontSize: 10, fontWeight: 600, color: "#a855f7" }}>
                  AI Powered
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Bot greeting */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.03))",
                    border: "1px solid rgba(168,85,247,0.1)",
                    borderRadius: "16px 4px 16px 16px",
                    padding: "10px 16px",
                    maxWidth: "85%",
                  }}
                >
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    Hey! Welcome to Artisan Coffee. Looking for something
                    specific or want me to show you our bestsellers?
                  </span>
                </div>
              </div>

              {/* User */}
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "10px 16px",
                  }}
                >
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                    I need a gift set under $50, something premium-looking
                  </span>
                </div>
              </div>

              {/* Bot with product card */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.03))",
                    border: "1px solid rgba(168,85,247,0.1)",
                    borderRadius: "16px 4px 16px 16px",
                    padding: "10px 16px",
                    maxWidth: "85%",
                  }}
                >
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    Perfect! I found 3 gift sets. The{" "}
                    <span style={{ color: "#a855f7", fontWeight: 600 }}>
                      Signature Collection
                    </span>{" "}
                    is our top pick at $54 — but I can do{" "}
                    <span style={{ color: "#34d399", fontWeight: 700 }}>
                      $45 just for you
                    </span>
                    .
                  </span>
                  {/* Mini product card */}
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShoppingBag style={{ width: 18, height: 18, color: "#a855f7" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
                        Signature Collection
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "#737373", textDecoration: "line-through" }}>$54</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>$45</span>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", fontWeight: 700 }}>-17%</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          style={{ width: 10, height: 10, color: "#f59e0b", fill: "#f59e0b" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* User accepts */}
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "4px 16px 16px 16px",
                    padding: "10px 16px",
                  }}
                >
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                    Deal! Let&apos;s do it
                  </span>
                </div>
              </div>

              {/* Order confirmed */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))",
                    border: "1px solid rgba(16,185,129,0.15)",
                    borderRadius: "16px 4px 16px 16px",
                    padding: "10px 16px",
                    maxWidth: "85%",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Check style={{ width: 14, height: 14, color: "#34d399" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>
                      Order Placed
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    Done! Checkout link sent. Total: $45.00 + free gift wrapping.
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid #1f1f1f",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Sparkles style={{ width: 12, height: 12, color: "#34d399" }} />
              <span style={{ fontSize: 10, color: "rgba(52,211,153,0.6)" }}>
                Negotiated, personalized & closed in 28 seconds
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screenshot3() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#000",
        position: "relative",
      }}
        >
          <HeroBg />
          <LogoBadge position="top-left" />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 64px",
          }}
        >
          {/* Header */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 9999,
            border: "1px solid rgba(16,185,129,0.2)",
            background: "rgba(16,185,129,0.06)",
            fontSize: 11,
            fontWeight: 700,
            color: "#6ee7b7",
            marginBottom: 24,
          }}
        >
          <Globe style={{ width: 12, height: 12 }} />
          OMNICHANNEL COMMERCE
        </div>
        <div
          style={{
            fontSize: "3rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#fff",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          One AI Agent.{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(135deg, #34d399 0%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Every Channel.
          </span>
        </div>
        <div
          style={{
            fontSize: 15,
            color: "#737373",
            lineHeight: 1.6,
            textAlign: "center",
            maxWidth: 500,
            marginBottom: 48,
          }}
        >
          Customers shop on WhatsApp, your website, or through voice — same AI
          agent, same intelligence, zero friction.
        </div>

        {/* Three channel cards */}
        <div style={{ display: "flex", gap: 20, width: "100%", maxWidth: 1100 }}>
          {/* WhatsApp */}
          <div
            style={{
              flex: 1,
              borderRadius: 20,
              background: "#0a0a0a",
              border: "1px solid #1f1f1f",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #1f1f1f",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(37,211,102,0.1)",
                  border: "1px solid rgba(37,211,102,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>WhatsApp</div>
                <div style={{ fontSize: 10, color: "rgba(37,211,102,0.7)" }}>2.4B users worldwide</div>
              </div>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px 12px 12px 12px", padding: "8px 12px" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Show me gift sets</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <div style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.12)", borderRadius: "12px 4px 12px 12px", padding: "8px 12px", maxWidth: "85%" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Here are 3 curated picks! Tap to browse or buy instantly.</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <span style={{ padding: "6px 12px", borderRadius: 9999, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)", fontSize: 11, color: "#25d366", fontWeight: 600 }}>Buy Now</span>
                <span style={{ padding: "6px 12px", borderRadius: 9999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>See More</span>
              </div>
            </div>
          </div>

          {/* Web Store */}
          <div
            style={{
              flex: 1,
              borderRadius: 20,
              background: "#0a0a0a",
              border: "1px solid rgba(168,85,247,0.15)",
              overflow: "hidden",
              boxShadow: "0 0 60px rgba(168,85,247,0.06)",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #1f1f1f",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7, #ec4899)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MessageSquare style={{ width: 14, height: 14, color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Web Storefront</div>
                <div style={{ fontSize: 10, color: "rgba(168,85,247,0.7)" }}>shop.yourdomain.com</div>
              </div>
              <div style={{ marginLeft: "auto", padding: "3px 8px", borderRadius: 6, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", fontSize: 9, fontWeight: 700, color: "#a855f7" }}>
                PRIMARY
              </div>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px 12px 12px 12px", padding: "8px 12px" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Looking for running shoes</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <div style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.03))", border: "1px solid rgba(168,85,247,0.1)", borderRadius: "12px 4px 12px 12px", padding: "8px 12px", maxWidth: "85%" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Nike Pegasus 41 — $109. I can offer 10% off!</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "12px 4px 12px 12px", padding: "8px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CreditCard style={{ width: 12, height: 12, color: "#34d399" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#34d399" }}>Checkout ready — $98.10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voice */}
          <div
            style={{
              flex: 1,
              borderRadius: 20,
              background: "#0a0a0a",
              border: "1px solid #1f1f1f",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #1f1f1f",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #ec4899, #f97316)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mic style={{ width: 14, height: 14, color: "#fff" }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Voice AI</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 10, color: "rgba(249,115,22,0.7)" }}>Listening...</span>
                </div>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              {/* Waveform */}
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                {[6, 14, 10, 18, 5, 16, 12, 20, 8, 15, 18, 6, 15, 10, 17, 13, 20, 8, 12, 18].map(
                  (h, i) => (
                    <div
                      key={i}
                      style={{
                        width: 3,
                        height: h * 2,
                        borderRadius: 9999,
                        background: "linear-gradient(to top, rgba(236,72,153,0.3), rgba(249,115,22,0.8))",
                      }}
                    />
                  )
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px 12px 12px 12px", padding: "8px 12px" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>&quot;Order my usual coffee&quot;</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <div style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(249,115,22,0.03))", border: "1px solid rgba(236,72,153,0.1)", borderRadius: "12px 4px 12px 12px", padding: "8px 12px", maxWidth: "85%" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Ethiopian Yirgacheffe, added! Delivering to your usual address.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screenshot4() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#000",
        position: "relative",
      }}
      >
        <HeroBg />
        <LogoBadge position="top-left" />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 48px",
            gap: 40,
          }}
        >
          {/* Left side - info */}
        <div style={{ flexShrink: 0, width: 400 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 9999,
              border: "1px solid rgba(168,85,247,0.2)",
              background: "rgba(168,85,247,0.06)",
              fontSize: 11,
              fontWeight: 700,
              color: "#c084fc",
              marginBottom: 24,
            }}
          >
            <BarChart3 style={{ width: 12, height: 12 }} />
            MERCHANT INTELLIGENCE
          </div>
          <div
            style={{
              fontSize: "2.75rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "#fff",
              marginBottom: 20,
            }}
          >
            Real-Time{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(135deg, #a855f7, #ec4899, #f97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Deep Intelligence
            </span>
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#737373",
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 360,
            }}
          >
            Live analytics, AI intent streams, and actionable insights. Know
            what your customers want before they do.
          </div>

          {/* KPI Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Revenue", value: "$12,847", change: "+12.5%", icon: TrendingUp },
              { label: "AI Sessions", value: "1,847", change: "+8.1%", icon: Bot },
              { label: "Conversion", value: "15.4%", change: "+2.3%", icon: BarChart3 },
              { label: "Avg. Order", value: "$45.20", change: "+6.7%", icon: ShoppingCart },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #1f1f1f",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    {stat.label}
                  </span>
                  <stat.icon style={{ width: 12, height: 12, color: "#555" }} />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                    {stat.value}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: 2 }}>
                    <TrendingUp style={{ width: 10, height: 10 }} />
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Dashboard mock */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              borderRadius: 24,
              padding: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                background: "#0a0a0a",
                border: "1px solid #1f1f1f",
              }}
            >
              {/* Browser chrome */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderBottom: "1px solid #1f1f1f",
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b3b3b" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b3b3b" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b3b3b" }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    margin: "0 24px",
                    height: 28,
                    borderRadius: 8,
                    background: "#171717",
                    border: "1px solid #1f1f1f",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                  }}
                >
                  <span style={{ fontSize: 10, color: "#737373" }}>
                    shop.yourdomain.com/dashboard
                  </span>
                </div>
              </div>

              <div style={{ display: "flex" }}>
                {/* Sidebar */}
                <div
                  style={{
                    width: 150,
                    borderRight: "1px solid #1f1f1f",
                    padding: "16px 10px",
                    background: "#050505",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", marginBottom: 16 }}>
                    <div style={{ width: 24, height: 24, background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
                      <ShoppingBag style={{ width: 12, height: 12 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>My Store</span>
                  </div>
                  {[
                    { icon: BarChart3, label: "Home", active: true },
                    { icon: MessageSquare, label: "Conversations" },
                    { icon: ShoppingBag, label: "Orders" },
                    { icon: Bot, label: "AI Agent" },
                    { icon: TrendingUp, label: "Analytics" },
                    { icon: Users, label: "Customers" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 500,
                        marginBottom: 2,
                        color: item.active ? "#fff" : "#737373",
                        background: item.active ? "#1f1f1f" : "transparent",
                      }}
                    >
                      <item.icon style={{ width: 12, height: 12 }} />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Main dashboard content */}
                <div style={{ flex: 1, padding: 20, background: "#000" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", border: "1px solid rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>Live</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Overview</div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div
                    style={{
                      background: "#0a0a0a",
                      border: "1px solid #1f1f1f",
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.15em" }}>Net Sales</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 2 }}>$12,847.00</div>
                      </div>
                      <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 9, fontWeight: 700, background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)", display: "flex", alignItems: "center", gap: 4 }}>
                        <TrendingUp style={{ width: 10, height: 10 }} />
                        Trending
                      </span>
                    </div>
                    <div style={{ height: 80 }}>
                      <svg viewBox="0 0 400 80" style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="s4fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="s4line" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                        <path d="M0,55 C30,50 60,45 90,40 C120,35 150,20 200,25 C250,30 280,15 340,10 C370,7 400,12 400,12 L400,80 L0,80 Z" fill="url(#s4fill)" />
                        <path d="M0,55 C30,50 60,45 90,40 C120,35 150,20 200,25 C250,30 280,15 340,10 C370,7 400,12 400,12" fill="none" stroke="url(#s4line)" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>

                  {/* Insights */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { icon: Sparkles, color: "#a855f7", title: "AI Optimization", desc: "Product videos can boost conversion by 18%" },
                      { icon: TrendingUp, color: "#ec4899", title: "Traffic Spike", desc: "Instagram referrals up 45% today" },
                      { icon: Shield, color: "#34d399", title: "Trust Score", desc: "Consumer Matrix rating: 94/100" },
                    ].map((insight) => (
                      <div
                        key={insight.title}
                        style={{
                          padding: 12,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid #1f1f1f",
                          borderRadius: 10,
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `${insight.color}20`,
                            flexShrink: 0,
                          }}
                        >
                          <insight.icon style={{ width: 12, height: 12, color: insight.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{insight.title}</div>
                          <div style={{ fontSize: 9, color: "#737373", marginTop: 1 }}>{insight.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screenshot5() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <HeroBg />
      <LogoBadge position="top-left" />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 1100, padding: "0 64px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 9999,
              border: "1px solid rgba(168,85,247,0.25)",
              background: "rgba(168,85,247,0.08)",
              fontSize: 11,
              fontWeight: 700,
              color: "#c084fc",
              marginBottom: 24,
              letterSpacing: "0.05em",
            }}
          >
            <Sparkles style={{ width: 12, height: 12 }} />
            SMART CATALOG
          </div>
          <div
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "#fff",
              marginBottom: 14,
            }}
          >
            AI That Knows What{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(135deg, #a855f7, #ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              They Want
            </span>
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
            Every product recommendation is personalized. Your AI learns taste, budget, and intent in real-time.
          </div>
        </div>

        {/* Product cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { name: "Midnight Rose Perfume", price: "$89", match: 98, tag: "Perfect Match", img: "🌹", cat: "Fragrance", reason: "Based on floral preferences & past purchases" },
            { name: "Silk Cashmere Scarf", price: "$124", match: 94, tag: "Trending", img: "🧣", cat: "Accessories", reason: "Matches winter collection interest" },
            { name: "Artisan Coffee Set", price: "$67", match: 91, tag: "Gift Pick", img: "☕", cat: "Gourmet", reason: "Aligned with gift-giving intent detected" },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                borderRadius: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 28,
                position: "relative",
                overflow: "hidden",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(168,85,247,0.08), transparent)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#c084fc",
                    background: "rgba(168,85,247,0.1)",
                    border: "1px solid rgba(168,85,247,0.2)",
                  }}
                >
                  {item.tag}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{item.cat}</span>
              </div>

              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  marginBottom: 20,
                }}
              >
                {item.img}
              </div>

              <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginBottom: 4, letterSpacing: "-0.01em" }}>
                {item.name}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 16, letterSpacing: "-0.02em" }}>
                {item.price}
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(168,85,247,0.06)",
                  border: "1px solid rgba(168,85,247,0.1)",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Brain style={{ width: 12, height: 12, color: "#c084fc" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#c084fc" }}>AI REASONING</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  {item.reason}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 36,
                      height: 6,
                      borderRadius: 9999,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${item.match}%`,
                        height: "100%",
                        borderRadius: 9999,
                        background: "linear-gradient(90deg, #a855f7, #ec4899)",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#c084fc" }}>{item.match}%</span>
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>match score</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Screenshot6() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <HeroBg />
      <LogoBadge position="top-left" />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 1100, padding: "0 64px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 9999,
              border: "1px solid rgba(168,85,247,0.25)",
              background: "rgba(168,85,247,0.08)",
              fontSize: 11,
              fontWeight: 700,
              color: "#c084fc",
              marginBottom: 24,
              letterSpacing: "0.05em",
            }}
          >
            <Zap style={{ width: 12, height: 12 }} />
            REAL-TIME INTELLIGENCE
          </div>
          <div
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "#fff",
              marginBottom: 14,
            }}
          >
            Every Conversation.{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(135deg, #a855f7, #ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              One Dashboard.
            </span>
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 500, margin: "0 auto" }}>
            Your AI agents are always working. Watch negotiations, checkouts, and recommendations unfold live.
          </div>
        </div>

        {/* Live feed */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { status: "Closing Deal", color: "#34d399", customer: "Sarah M.", msg: "Negotiated 15% off — buyer accepted", product: "Signature Box Set", value: "$45.00", channel: "WhatsApp", time: "Just now" },
            { status: "Recommending", color: "#a855f7", customer: "James K.", msg: "Matched 3 products from browsing history", product: "Nike Pegasus 41", value: "$109.00", channel: "Web", time: "12s ago" },
            { status: "Processing", color: "#3b82f6", customer: "Aisha R.", msg: "Payment confirmed, generating receipt", product: "Ethiopian Yirgacheffe", value: "$32.00", channel: "Voice", time: "28s ago" },
            { status: "Upselling", color: "#ec4899", customer: "Mike T.", msg: "Suggesting complementary accessories", product: "Home Office Bundle", value: "$247.50", channel: "Web", time: "45s ago" },
            { status: "Negotiating", color: "#f97316", customer: "Lin W.", msg: "Counter-offer sent: $72 for bundle", product: "Premium Skincare Set", value: "$89 → $72", channel: "WhatsApp", time: "1m ago" },
            { status: "Completed", color: "#34d399", customer: "David P.", msg: "Order shipped, follow-up scheduled", product: "Custom Necklace", value: "$156.00", channel: "Web", time: "2m ago" },
            { status: "Closing Deal", color: "#34d399", customer: "Emma S.", msg: "Bulk discount applied, awaiting confirm", product: "Party Pack x20", value: "$340.00", channel: "Voice", time: "3m ago" },
            { status: "Browsing", color: "#60a5fa", customer: "Raj P.", msg: "Exploring tech category, 4 items viewed", product: "MagSafe Bundle", value: "$79.99", channel: "Web", time: "4m ago" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 18,
                backdropFilter: "blur(20px)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 8,
                    fontSize: 9,
                    fontWeight: 700,
                    color: item.color,
                    background: `${item.color}12`,
                    border: `1px solid ${item.color}25`,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                  {item.status}
                </span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{item.time}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{item.customer}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{item.msg}</div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{item.product}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>{item.value}</span>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)", color: "#c084fc", fontWeight: 600 }}>{item.channel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Screenshot7() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <HeroBg />
      <LogoBadge position="top-left" />

      <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 1000, padding: "0 64px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 9999,
            border: "1px solid rgba(168,85,247,0.25)",
            background: "rgba(168,85,247,0.08)",
            fontSize: 11,
            fontWeight: 700,
            color: "#c084fc",
            marginBottom: 24,
            letterSpacing: "0.05em",
          }}
        >
          <Zap style={{ width: 12, height: 12 }} />
          3 STEPS. ZERO CODE.
        </div>
        <div
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "#fff",
            marginBottom: 14,
          }}
        >
          From Zero to{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(135deg, #a855f7, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Revenue
          </span>
          <br />
          in Minutes
        </div>
        <div
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
            marginBottom: 56,
            maxWidth: 460,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          No developers. No integrations. Just upload, configure, and let AI sell.
        </div>

        {/* Steps */}
        <div style={{ display: "flex", gap: 24, position: "relative" }}>
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              top: 48,
              left: "16.67%",
              width: "66.67%",
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.3), rgba(236,72,153,0.3), transparent)",
              zIndex: 0,
            }}
          />
          {[
            {
              step: "01",
              title: "Upload Catalog",
              desc: "Drag & drop your products, or sync from Shopify, WooCommerce, or any CSV.",
              icon: ShoppingBag,
              stat: "< 2 min",
              statLabel: "avg setup",
            },
            {
              step: "02",
              title: "Train Your Agent",
              desc: "Define your brand voice, pricing rules, discount limits, and negotiation style.",
              icon: Brain,
              stat: "30 sec",
              statLabel: "to configure",
            },
            {
              step: "03",
              title: "Go Live",
              desc: "Share one link. Your AI handles conversations, sales, and support 24/7.",
              icon: Sparkles,
              stat: "Instant",
              statLabel: "activation",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 36,
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
                backdropFilter: "blur(20px)",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: i === 0
                    ? "linear-gradient(90deg, transparent, rgba(168,85,247,0.4), transparent)"
                    : i === 1
                    ? "linear-gradient(90deg, transparent, rgba(200,100,200,0.4), transparent)"
                    : "linear-gradient(90deg, transparent, rgba(236,72,153,0.4), transparent)",
                }}
              />
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                  position: "relative",
                }}
              >
                <item.icon style={{ width: 24, height: 24, color: "#c084fc" }} />
                <div
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #a855f7, #ec4899)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {item.step}
                </div>
              </div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  marginBottom: 10,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.4)",
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                {item.desc}
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: "rgba(168,85,247,0.06)",
                  border: "1px solid rgba(168,85,247,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    backgroundImage: "linear-gradient(135deg, #a855f7, #ec4899)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {item.stat}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{item.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductHuntPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        padding: 32,
        overflowX: "auto",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ width: "fit-content", margin: "0 auto" }}>
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Product Hunt Screenshots
          </div>
          <div style={{ fontSize: 14, color: "#737373" }}>
            7 screenshots at 1270x760px — right-click each frame to save.
          </div>
        </div>

        <ScreenFrame index={1}>
          <Screenshot1 />
        </ScreenFrame>

        <ScreenFrame index={2}>
          <Screenshot2 />
        </ScreenFrame>

        <ScreenFrame index={3}>
          <Screenshot3 />
        </ScreenFrame>

        <ScreenFrame index={4}>
          <Screenshot4 />
        </ScreenFrame>

        <ScreenFrame index={5}>
          <Screenshot5 />
        </ScreenFrame>

        <ScreenFrame index={6}>
          <Screenshot6 />
        </ScreenFrame>

        <ScreenFrame index={7}>
          <Screenshot7 />
        </ScreenFrame>
      </div>
    </div>
  );
}
