import React from 'react';
import Image from 'next/image';
import { Copy, Plus, Camera, Edit2 } from 'lucide-react';

/**
 * KnowledgeBase Component
 * This component clones the "Knowledge at Your Fingertips" section of Huly.io.
 * It features a light theme contrast, real-time collaboration examples,
 * a large billboard imagery, and stylized code blocks.
 */
const KnowledgeBase = () => {
  return (
    <section className="light-section relative bg-white py-[120px] lg:py-[100px] md:py-[80px] sm:py-[60px] overflow-hidden">
      {/* Grid Pattern Background - Matches .bg-grid-subtle from globals.css but adapted for light theme */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #090A0C 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }} 
      />

      <div className="container relative z-10 px-6 sm:px-5 mx-auto max-w-[1280px]">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-16 md:mb-12">
          <div className="relative inline-block">
            <h2 className="text-section text-[#090A0C] mb-6 tracking-[-0.03em] font-semibold leading-[1.1] text-[56px] lg:text-[48px] md:text-[40px] sm:text-[32px]">
              Knowledge at <br className="hidden sm:block" />
              Your Fingertips
              <div className="absolute -right-12 top-0 md:hidden animate-bounce transition-transform duration-1000">
                <div className="relative bg-white shadow-xl rounded-full p-0.5 border border-gray-100">
                   <Image 
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_14.png"
                    alt="User"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 h-4 w-px bg-[#4E95FF]"></div>
                </div>
              </div>
            </h2>
          </div>
          
          <div className="max-w-[800px] text-[18px] leading-[1.5] text-[#090A0C]/70 tracking-[-0.01em] space-y-6">
            <p>
              Huly offers a wide range of features to create and manage your project documentation. 
              Huly&apos;s suite of collaborative editing tools boosts team efficiency.
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="max-w-[800px] mx-auto space-y-12">
          
          {/* Detailed Description Block 1 */}
          <div className="text-[18px] leading-[1.5] text-[#090A0C]/70 tracking-[-0.01em]">
            <p>
              Documents in <strong>Huly</strong> can be used for sharing reference materials among team members, 
              collaborating on plans and roadmaps, storing meeting notes and assigning action items.
            </p>
          </div>

          {/* Billboard Image Section */}
          <div className="relative group">
            <div className="overflow-hidden rounded-[14px] border border-[#090A0C]/10 shadow-sm">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_14.png"
                alt="Huly Billboard"
                width={800}
                height={400}
                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>
            {/* Attribution styling hidden or subtle as per original screenshot */}
          </div>

          {/* Detailed Description Block 2 with Collaboration Indicator */}
          <div className="relative">
            <div className="absolute -left-16 top-4 md:hidden">
              <div className="relative flex flex-col items-center">
                <div className="bg-white shadow-lg rounded-full p-0.5 border border-[#FFAA81]/50">
                  <Image 
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/images/images_15.png"
                    alt="User"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </div>
                <div className="h-10 w-px bg-[#FFAA81]/40 mt-1"></div>
                <div className="w-2 h-2 rounded-full bg-[#FFAA81]"></div>
              </div>
            </div>
            <p className="text-[18px] leading-[1.5] text-[#090A0C]/70 tracking-[-0.01em]">
              With live real-time collaboration, remote teams are able to work together to bring a unified 
              vision to life on the page. Tagging users, linking to issues, and assigning action items 
              are just a few of the advanced solutions available within the Huly document editor.
            </p>
          </div>

          {/* Code Block Snippet */}
          <div className="rounded-[10px] bg-[#1E1E1E] p-6 shadow-2xl relative overflow-hidden font-mono text-[14px]">
            <div className="absolute top-4 right-4 text-white/30 hover:text-white/60 cursor-pointer transition-colors">
              <Copy size={16} />
            </div>
            <div className="space-y-1">
              <p><span className="text-[#D5D8F6]">interface</span> <span className="text-[#FFAA81]">User</span> {'{'}</p>
              <p className="pl-6"><span className="text-[#FFAA81]">name</span>: <span className="text-[#4E95FF]">string</span>;</p>
              <p className="pl-6"><span className="text-[#FFAA81]">age</span>: <span className="text-[#4E95FF]">number</span>;</p>
              <p>{'}'}</p>
              <p className="mt-4"><span className="text-[#D5D8F6]">const</span> <span className="text-[#4E95FF]">users</span>: <span className="text-[#FFAA81]">User</span>[] = [</p>
              <p className="pl-6">{'{'} <span className="text-[#FFAA81]">name</span>: <span className="text-[#D5D8F6]">&quot;Alice&quot;</span>, <span className="text-[#FFAA81]">age</span>: <span className="text-[#4E95FF]">30</span> {'}'},</p>
              <p className="pl-6">{'{'} <span className="text-[#FFAA81]">name</span>: <span className="text-[#D5D8F6]">&quot;Bob&quot;</span>, <span className="text-[#FFAA81]">age</span>: <span className="text-[#4E95FF]">22</span> {'}'},</p>
              <p>];</p>
              <p className="mt-4"><span className="text-[#D5D8F6]">const</span> <span className="text-[#4E95FF]">findUser</span> = (<span className="text-[#FFAA81]">name</span>: <span className="text-[#4E95FF]">string</span>): <span className="text-[#FFAA81]">User</span> | <span className="text-[#4E95FF]">undefined</span> =&gt; {'{'}</p>
              <p className="pl-6"><span className="text-[#4E95FF]">users</span>.<span className="text-[#FFAA81]">find</span>((<span className="text-[#FFAA81]">user</span>) =&gt; <span className="text-[#FFAA81]">user</span>.<span className="text-[#FFAA81]">name</span> === <span className="text-[#FFAA81]">name</span>);</p>
              <p>{'}'};</p>
            </div>
          </div>

          {/* Description Block 3 */}
          <div className="text-[18px] leading-[1.5] text-[#090A0C]/70 tracking-[-0.01em]">
            <p>
              Documents can be enhanced with rich text formatting, images, attachments and code blocks. 
              Use documents to organize team plans, create technical documentation and support your 
              team&apos;s progress towards shared goals.
            </p>
          </div>

          {/* Collaborative Editor UI Simulation */}
          <div className="pt-8 border-t border-[#090A0C]/5">
            <div className="flex items-center gap-3 text-[#090A0C]/30 text-[14px] mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-[#090A0C]/30"></div>
              <span>Tap here to continue...</span>
            </div>
            <div className="inline-flex items-center gap-1.5 p-1 bg-[#F5F5F5] rounded-full border border-[#090A0C]/5 shadow-sm">
              <button className="p-2 rounded-full bg-[#090A0C] text-white hover:bg-[#222] transition-colors">
                <Plus size={16} />
              </button>
              <button className="p-2 rounded-full text-[#090A0C]/60 hover:bg-white hover:text-[#090A0C] transition-all">
                <Camera size={16} />
              </button>
              <button className="p-2 rounded-full text-[#090A0C]/60 hover:bg-white hover:text-[#090A0C] transition-all">
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Grid Transitioning to Version History */}
        <div className="mt-32 lg:mt-24 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1000px] mx-auto">
          {/* Feature: Collaborate */}
          <div className="group p-8 rounded-[14px] bg-[#F9F9F9] border border-[#090A0C]/5 transition-all hover:shadow-md">
            <h3 className="text-[20px] font-semibold mb-3 text-[#090A0C]">Collaborate</h3>
            <p className="text-[#090A0C]/60 text-[16px] leading-[1.5]">
              Enhance teamwork with powerful real-time collaboration features.
            </p>
          </div>

          {/* Feature: Version History Card - Simulation as per Screenshot 8 */}
          <div className="relative group p-8 rounded-[14px] bg-white border border-[#090A0C]/10 shadow-[0px_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
             {/* Abstract card stacking effect from screenshot */}
             <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D5D8F6]/20 to-transparent blur-2xl"></div>
             <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[20px] font-semibold text-[#090A0C]">Version History</h3>
                  <div className="w-8 h-8 rounded-full bg-[#4E95FF]/10 flex items-center justify-center text-[#4E95FF]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                </div>
                <p className="text-[#090A0C]/60 text-[16px] leading-[1.5]">
                  Track every edit effortlessly, and never lose a single change.
                </p>
                {/* Visual Stack Element */}
                <div className="mt-6 space-y-2 opacity-40 group-hover:opacity-60 transition-opacity">
                  <div className="h-2 w-full bg-gray-100 rounded"></div>
                  <div className="h-2 w-4/5 bg-gray-100 rounded"></div>
                  <div className="h-2 w-24 bg-[#4E95FF]/30 rounded"></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeBase;