import Image from "next/image";

const techStack = [
  { name: "Next.js", src: "/logos/nextjs-logotype-dark-background.svg", width: 394, height: 80, displayHeight: 22 },
  { name: "Supabase", src: "/logos/supabase-logo-wordmark--dark.png", width: 581, height: 113, displayHeight: 24 },
  { name: "Tailwind CSS", src: "/logos/tailwindcss-logotype-white.svg", width: 262, height: 33, displayHeight: 18 },
  { name: "Stripe", src: "/logos/Stripe wordmark - White - Large.png", width: 1872, height: 890, displayHeight: 32 },
  { name: "OpenAI", src: "/logos/openai-combined.svg", width: 305, height: 86, displayHeight: 26 },
];

export default function Logos() {
  const duplicated = [...techStack, ...techStack];

  return (
    <section className="relative w-full py-8 md:py-14 overflow-hidden bg-black border-y border-purple-500/[0.08]">
      <div className="container mx-auto px-4">
        <p className="text-center text-[11px] md:text-[12px] uppercase tracking-[0.2em] text-purple-300/30 mb-5 md:mb-8 font-medium">
          Built with
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="flex items-center gap-12 md:gap-20 animate-marquee w-max">
            {duplicated.map((tech, i) => (
                <div
                  key={`${tech.name}-${i}`}
                  className="flex items-center opacity-60 hover:opacity-100 transition-opacity shrink-0"
                >
                <Image
                  src={tech.src}
                  alt={tech.name}
                  width={tech.width}
                  height={tech.height}
                  className="object-contain"
                  style={{ height: `${tech.displayHeight}px`, width: "auto" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
