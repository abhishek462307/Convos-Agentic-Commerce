import React from 'react';
import Image from 'next/image';

/**
 * JoinCTASection Component
 * Clones the "Join the Movement" section with pixel-perfect accuracy.
 * Features a large 3D clock/emblem video with orange and blue light beams.
 */
export default function JoinCTASection() {
  return (
    <section className="relative overflow-hidden bg-[#090A0C] py-[120px] lg:py-[100px] md:py-[80px]">
      {/* Background visual container */}
      <div className="absolute inset-0 z-0">
        {/* The 3D decorative light rays (approximated via gradients/masking as per visual) */}
        <div className="absolute left-[5%] top-1/2 h-[2px] w-[40%] -translate-y-[80%] -rotate-[15deg] bg-gradient-to-r from-transparent via-[#FFAA81]/30 to-transparent blur-xl" />
        <div className="absolute left-[15%] top-1/2 h-[2px] w-[50%] -translate-y-[20%] rotate-[10deg] bg-gradient-to-r from-transparent via-[#4E95FF]/20 to-transparent blur-xl" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="flex flex-col items-center justify-center text-center lg:flex-row lg:text-left">
          
          {/* Left Side: Visual Asset (Clock Video/Image) */}
          <div className="relative mb-12 flex h-[360px] w-full max-w-[440px] items-center justify-center lg:mb-0 lg:max-w-[500px]">
            {/* Main Clock Video */}
            <div className="relative z-20 h-full w-full">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-contain"
                poster="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_18.png"
              >
                <source src="https://huly.io/videos/cta/clock.mp4?updated=20240531154316" type="video/mp4" />
              </video>
            </div>
            
            {/* Glow effects around the clock */}
            <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFAA81]/10 blur-[80px]" />
            <div className="absolute left-[60%] top-[60%] h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4E95FF]/10 blur-[60px]" />
          </div>

          {/* Right Side: Content & Buttons */}
          <div className="max-w-[560px] lg:ml-12 lg:flex-1">
            <h2 className="mb-4 text-display font-semibold leading-[0.9] tracking-tight text-white lg:text-[72px] md:text-[56px]">
              Join the <br className="hidden lg:block" /> Movement
            </h2>
            <p className="mb-10 text-18 font-light leading-relaxed text-[#FFFFFF]/60 md:text-16 sm:max-w-[280px] sm:mx-auto lg:mx-0">
              Unlock the future of productivity with Huly. <br className="hidden md:block" />
              Remember, this journey is just getting started.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              {/* See in Action Button */}
              <div className="relative group">
                {/* Visual Glow behind button */}
                <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-[#FFAA81] to-[#FFFFFF] opacity-20 blur-[2px] transition duration-200 group-hover:opacity-40" />
                
                <a 
                  href="https://front.hc.engineering/workbench/platform"
                  className="relative flex h-10 items-center justify-center rounded-full bg-[#D1D1D1] px-10 text-[11px] font-bold uppercase tracking-[0.05em] text-[#5A250A] transition-all hover:bg-white"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    See in Action
                    <svg width="17" height="9" viewBox="0 0 17 9" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-[1px]">
                      <path d="M12.5 1L16 4.5L12.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 4.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                  
                  {/* Subtle animated light effect inside */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,245,0.4)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>

              {/* Join our Slack Button */}
              <a 
                href="https://huly.link/slack"
                className="flex h-10 items-center justify-center rounded-full border border-white/10 bg-[#16171B] px-8 text-[11px] font-bold uppercase tracking-[0.05em] text-white transition-all hover:border-white/20 hover:bg-[#1E1F24]"
              >
                <div className="mr-2 flex h-5 w-5 items-center justify-center">
                  <Image 
                    src="/_next/static/media/dd5884a192d875e57571a1a449d66e6a.svg" 
                    alt="Slack" 
                    width={18} 
                    height={18}
                    className="opacity-80"
                  />
                </div>
                Join our Slack
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Subtle Bottom Divider - visually separating from possible footer */}
      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </section>
  );
}