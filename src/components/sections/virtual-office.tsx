import React from 'react';
import Image from 'next/image';

const VirtualOffice = () => {
  return (
    <section className="light-section bg-white text-[#090A0C] py-[120px] lg:py-[100px] md:py-20 relative overflow-hidden">
      <div className="container relative z-10">
        {/* Header Content */}
        <div className="flex flex-col items-center text-center mb-16 lg:mb-20">
          <h2 className="text-section mb-6 md:text-[44px] sm:text-[32px]">
            Work together.<br />
            Like in the office.
          </h2>
          <p className="max-w-[480px] text-18 text-muted-foreground leading-snug md:text-16 sm:text-15">
            Create customized virtual office spaces for any department or event with high quality audio and video conferencing.
          </p>
        </div>

        {/* Visual Showcase */}
        <div className="relative w-full max-w-[1024px] mx-auto mb-20">
          {/* Background Virtual Office Environment */}
          <div className="relative aspect-[16/9] w-full rounded-[14px]">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_6.png"
              alt="Virtual Office Layout"
              width={1024}
              height={576}
              className="w-full h-full object-cover rounded-[14px]"
            />
            
            {/* Overlay Video UI Component - Pixel matched to visual reference */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="glass bg-white/60 backdrop-blur-2xl rounded-[20px] w-full h-full shadow-2xl relative flex flex-col items-center border border-white/40 overflow-hidden">
                {/* Simulated Video Placeholder Area */}
                <div className="flex-1 w-full flex items-center justify-center relative">
                   {/* Centered Video Stream Indicators */}
                   <div className="animate-pulse flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full bg-blue animate-bounce" />
                     <div className="w-2.5 h-2.5 rounded-full bg-blue animate-bounce delay-100" />
                     <div className="w-2.5 h-2.5 rounded-full bg-blue animate-bounce delay-200" />
                   </div>
                </div>

                {/* Floating Controls Bar */}
                <div className="absolute bottom-6 flex items-center gap-3 bg-black/80 rounded-full px-5 py-2.5 backdrop-blur-md">
                   <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <Image src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/0e5b98ef7d38250f3aee6888407436e3-12.svg" alt="Fullscreen" width={18} height={18} className="invert" />
                   </button>
                   <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                   </button>
                   <button className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                   </button>
                   <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                   </button>
                   <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Text Description Block */}
        <div className="max-w-[800px] mb-20 overflow-hidden">
          <p className="text-20 leading-tight font-medium tracking-tight md:text-18 sm:text-16">
            Collaborating with remote teams is easy in your virtual office environment. Enjoy real-time communication within your workspace without additional software hassle.
          </p>
        </div>

        {/* Feature 3-Column Grid */}
        <div className="grid grid-cols-3 gap-8 md:grid-cols-1 md:gap-12">
          {/* Feature 1 */}
          <div className="flex flex-col">
            <div className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg bg-[#EBF3FF] text-blue">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/6cad5c6f35277cc12565a6826b9940bf-10.svg" 
                alt="Customize workspace" 
                width={24} 
                height={24} 
              />
            </div>
            <h3 className="text-20 font-semibold mb-3 tracking-snug">Customize workspace</h3>
            <p className="text-14 text-muted-foreground leading-relaxed">
              Create your own offices and meeting rooms to suit your team&apos;s needs.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col">
            <div className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg bg-[#EBF3FF] text-blue">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/93e08622f4a0bbef839d81e681f8bba7-11.svg" 
                alt="Audio and video calls" 
                width={24} 
                height={24} 
              />
            </div>
            <h3 className="text-20 font-semibold mb-3 tracking-snug">Audio and video calls</h3>
            <p className="text-14 text-muted-foreground leading-relaxed">
              Collaborate efficiently and seamlessly with high quality virtual conferencing.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col">
            <div className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg bg-[#EBF3FF] text-blue">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/0e5b98ef7d38250f3aee6888407436e3-12.svg" 
                alt="Invite guests" 
                width={24} 
                height={24} 
              />
            </div>
            <h3 className="text-20 font-semibold mb-3 tracking-snug">Invite guests</h3>
            <p className="text-14 text-muted-foreground leading-relaxed">
              Meet with guests without ever needing to leave your workspace.
            </p>
          </div>
        </div>
      </div>
      
      {/* Subtle bottom gradient transition to dark mode */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
    </section>
  );
};

export default VirtualOffice;