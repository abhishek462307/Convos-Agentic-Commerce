import React from 'react';
import Image from 'next/image';

const features = [
  {
    icon: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/3ec2b3159fe89423fa1464d20ffea3b0-13.svg",
    title: "Two-way synchronization",
    description: "Integrate your task tracker with GitHub to sync changes instantly."
  },
  {
    icon: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/2a9e454742efc41c8de5d3889bf55d34-14.svg",
    title: "Private tasks",
    description: "Integration and management of multiple data repositories effectively."
  },
  {
    icon: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/4d5dd04473e9f2ebc5c49291c1f73681-15.svg",
    title: "Multiple repositories",
    description: "Organize multiple projects for more effective planning and collaboration."
  },
  {
    icon: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/7338cddab3021d50f73a3d36c88df490-16.svg",
    title: "Milestone migration",
    description: "Seamless migration of key project milestones between repositories."
  },
  {
    icon: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/c1edb00984cbfb46dd8eda516738f4f0-17.svg",
    title: "Track progress",
    description: "Keep track of GitHub contributions and changes within your workspace."
  },
  {
    icon: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/352118264d839bffe60735ff4aeed26f-18.svg",
    title: "Advanced filtering",
    description: "Precise project data search with advanced filtering capabilities."
  }
];

export default function GitHubSync() {
  return (
    <section className="relative overflow-hidden bg-[#090A0C] py-[120px] lg:py-[100px] md:py-[80px]">
      <div className="container relative z-10">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Header Content */}
          <div className="mb-[64px] max-w-[640px]">
            <h2 className="mb-6 text-56 font-semibold tracking-[-0.03em] leading-[1.1] text-white lg:text-48 md:text-40">
              Sync with GitHub.<br /> Both&nbsp;ways.
            </h2>
            <p className="text-18 leading-[1.5] tracking-[-0.01em] text-white/60 md:text-16">
              Manage your tasks efficiently with Huly&apos;s bidirectional GitHub synchronization. Use Huly as an advanced front-end for GitHub Issues and GitHub Projects.
            </p>
          </div>

          {/* GitHub Mockup */}
          <div className="relative mb-[88px] w-full">
            <div className="relative mx-auto max-w-[1024px] overflow-hidden rounded-[14px] border border-white/10 bg-[#16171B]/50 backdrop-blur-sm">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_7.png"
                alt="GitHub Synchronization Interface"
                width={2048}
                height={1138}
                className="h-auto w-full"
                priority
              />
              {/* Blur Overlay at bottom for transition */}
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#090A0C] to-transparent" />
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-3 gap-y-12 gap-x-8 md:grid-cols-2 sm:grid-cols-1">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-start group">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 transition-colors group-hover:bg-white/10">
                  <Image 
                    src={feature.icon} 
                    alt="" 
                    width={20} 
                    height={20} 
                    className="h-5 w-5 brightness-150"
                  />
                </div>
                <h3 className="mb-2.5 text-20 font-semibold leading-[1.2] text-white">
                  {feature.title}
                </h3>
                <p className="text-14 leading-[1.5] text-white/60 max-w-[280px]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute left-1/2 top-1/2 -z-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(78,149,255,0.05)_0%,transparent_70%)] blur-[100px]" />
    </section>
  );
}