import React from 'react';
import Image from 'next/image';

const ProductivityGrid = () => {
  return (
    <section className="bg-background py-[120px] lg:py-[100px] md:py-[80px] sm:py-[60px] relative overflow-hidden">
      <div className="container px-6 mx-auto max-w-[1280px]">
        {/* Header Section */}
        <div className="mb-14 lg:mb-12 md:mb-10">
          <h2 className="text-[56px] font-semibold tracking-[-0.03em] leading-[1.1] text-foreground mb-5 lg:text-[48px] md:text-[40px] sm:text-[32px]">
            Unmatched productivity
          </h2>
          <p className="text-[18px] leading-[1.5] tracking-[-0.01em] text-muted-foreground max-w-[640px] md:text-[16px]">
            Huly is a process, project, time, and knowledge management platform that provides amazing collaboration opportunities for developers and product teams alike.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-6 lg:gap-5 md:gap-4 auto-rows-fr">
          
          {/* Keyboard Shortcuts - Col Span 5 */}
          <div className="col-span-12 lg:col-span-5 bg-card rounded-[14px] border border-border overflow-hidden relative group h-[400px] lg:h-[360px] flex flex-col justify-end">
            <div className="absolute inset-0 z-0">
               <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_2.png"
                alt="Keyboard Shortcuts"
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60" />
              {/* Orb effect placeholder simulation */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            </div>
            <div className="relative z-10 p-8 lg:p-6 md:p-5 mt-auto">
              <p className="text-[14px] font-semibold leading-[1.2] text-foreground">
                Keyboard shortcuts. <span className="font-normal text-muted-foreground">Work efficiently with instant access to common actions.</span>
              </p>
            </div>
          </div>

          {/* Team Planner - Col Span 7 */}
          <div className="col-span-12 lg:col-span-7 bg-card rounded-[14px] border border-border overflow-hidden relative group h-[400px] lg:h-[360px] flex flex-col justify-end">
            <div className="absolute inset-0 z-0">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_3.png"
                alt="Team Planner"
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60" />
              <div className="absolute top-0 left-1/2 w-[400px] h-[400px] bg-ring/15 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="relative z-10 p-8 lg:p-6 md:p-5 mt-auto">
              <p className="text-[14px] font-semibold leading-[1.2] text-foreground">
                Team Planner. <span className="font-normal text-muted-foreground">Keep track of the bigger picture by viewing all individual tasks in one centralized team calendar.</span>
              </p>
            </div>
          </div>

          {/* Time-blocking - Col Span 7 */}
          <div className="col-span-12 lg:col-span-7 bg-card rounded-[14px] border border-border overflow-hidden relative group h-[400px] lg:h-[360px] flex flex-col justify-end">
            <div className="absolute inset-0 z-0">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_4.png"
                alt="Time-blocking"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60" />
              <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-accent/15 blur-[100px] rounded-full" />
            </div>
            <div className="relative z-10 p-8 lg:p-6 md:p-5 mt-auto">
              <p className="text-[14px] font-semibold leading-[1.2] text-foreground">
                Time-blocking. <span className="font-normal text-muted-foreground">Transform daily tasks into structured time blocks for focused productivity.</span>
              </p>
            </div>
          </div>

          {/* Notifications - Col Span 5 */}
          <div className="col-span-12 lg:col-span-5 bg-card rounded-[14px] border border-border overflow-hidden relative group h-[400px] lg:h-[360px] flex flex-col justify-end">
            <div className="absolute inset-0 z-0">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_5.png"
                alt="Notifications"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60" />
              {/* Purple/Blue Orb effect */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(78,149,255,0.4)_0%,transparent_70%)] blur-[40px]" />
                 <div className="absolute w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(213,216,246,0.3)_0%,transparent_70%)] blur-[30px]" />
              </div>
            </div>
            <div className="relative z-10 p-8 lg:p-6 md:p-5 mt-auto">
              <p className="text-[14px] font-semibold leading-[1.2] text-foreground">
                Notifications. <span className="font-normal text-muted-foreground">Keep up to date with any changes by receiving instant notifications.</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProductivityGrid;