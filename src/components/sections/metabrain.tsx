import React from 'react';

/**
 * MetabrainSection
 * 
 * This component clones the "Huly MetaBrain" section.
 * It features a dark theme layout with a grid-like assembly of floating app components
 * representing tasks, planner, status, chats, notes, and projects.
 */
export default function MetabrainSection() {
  return (
    <section className="relative bg-[#090A0C] pt-[120px] pb-[160px] overflow-hidden">
      {/* Background radial glows to match the "Future-Tech" ethereal aesthetic */}
      <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-[#4E95FF] opacity-[0.05] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-[#D5D8F6] opacity-[0.08] blur-[100px] rounded-full pointer-events-none" />

      <div className="container relative z-10 mx-auto px-6">
        {/* Header Content */}
        <div className="max-w-[800px] mb-16">
          <h2 className="text-[56px] font-semibold tracking-[-0.03em] leading-[1.1] text-white mb-6">
            Huly MetaBrain
          </h2>
          <p className="text-[18px] text-white/60 leading-[1.5] tracking-[-0.01em] max-w-[640px]">
            Connect every element of your workflow to build a dynamic knowledge base. Soon, Huly AI will turn it into a powerful asset — a second brain for your team.
          </p>
        </div>

        {/* The "MetaBrain" Visualization Grid */}
        <div className="relative w-full max-w-[1100px] mx-auto">
          {/* 
            Grid/Flex layout for the app components. 
            Using a flex-wrap approach with specific widths to match the Bento-style visual.
          */}
          <div className="flex flex-wrap gap-4 justify-center items-start">
            
            {/* Create Tasks Card */}
            <div className="w-full md:w-[260px] flex flex-col gap-4">
              <div className="bg-[#16171B] border border-white/10 rounded-[14px] p-5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <h4 className="text-[14px] font-semibold text-white mb-1">Create tasks.</h4>
                <p className="text-[13px] text-white/50 mb-4">Schedule your personal events and todos.</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md p-2 text-[12px] text-white/80">
                    <div className="w-4 h-4 border border-white/20 rounded flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white/40"><path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    Automated testing
                  </div>
                  <div className="flex items-center gap-2 bg-[#4E95FF]/20 border border-[#4E95FF]/30 rounded-md p-2 text-[12px] text-white shadow-[0_0_15px_rgba(78,149,255,0.2)]">
                    <div className="w-4 h-4 bg-white/20 border border-white/40 rounded flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white"><path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    Initial usability assessment
                  </div>
                  <div className="flex items-center gap-2 opacity-40 bg-white/5 border border-white/10 rounded-md p-2 text-[12px] text-white/80">
                    <div className="w-4 h-4 border border-white/20 rounded" />
                    Updating documentation
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Your Work Card */}
            <div className="w-full md:w-[240px]">
              <div className="bg-[#16171B] border border-white/10 rounded-[14px] p-5 overflow-hidden">
                <h4 className="text-[14px] font-semibold text-white mb-1">Plan your work.</h4>
                <p className="text-[13px] text-white/50 mb-5">Visualize your workday in your planner.</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#FFAA81] rounded-l-lg" />
                  <div className="text-[11px] text-white/40 mb-1">01:00 — 03:30 pm</div>
                  <div className="text-[12px] text-white font-medium">Discuss detailed project plans outlining tasks</div>
                  <div className="mt-2 flex -space-x-1.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border border-[#16171B] bg-grey-500 overflow-hidden">
                         <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div className="w-5 h-5 rounded-full border border-[#16171B] bg-white/10 flex items-center justify-center text-[8px] text-white/60">+2</div>
                  </div>
                </div>
                <div className="mt-3 opacity-30 flex items-center gap-2 bg-white/5 p-2 rounded text-[11px] text-white/50">
                  <div className="w-4 h-4 rounded-sm border border-white/20" />
                   10:00 - 11:30 am
                </div>
              </div>
            </div>

            {/* Status / Date Display */}
            <div className="w-full md:w-[220px] flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 rounded-full border border-white/10 flex flex-col items-center justify-center group">
                {/* Glowing border effect */}
                <div className="absolute inset-0 rounded-full border border-white/5 ring-1 ring-white/10" />
                <span className="text-[64px] font-semibold leading-none text-white tracking-tighter">08</span>
                <span className="text-[14px] text-white/60 font-medium">March</span>
                
                {/* Floating plus button */}
                <button className="absolute bottom-1 right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            {/* Chat with Team Card */}
            <div className="w-full md:w-[240px]">
              <div className="bg-[#16171B] border border-white/10 rounded-[14px] p-5 h-full flex flex-col">
                <h4 className="text-[14px] font-semibold text-white mb-1">Chat with team.</h4>
                <p className="text-[13px] text-white/50 mb-5">Send DM and create group chats.</p>
                <div className="space-y-3 flex-grow">
                   <div className="flex justify-end">
                      <div className="bg-white/10 border border-white/10 rounded-2xl p-2 px-3 text-[12px] text-white max-w-[80%]">
                        Mark: Their decision is very important
                      </div>
                   </div>
                   <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-400 overflow-hidden flex-shrink-0">
                         <img src="https://i.pravatar.cc/100?img=32" alt="Justin" className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-[#5A250A]/40 border border-[#FFAA81]/20 rounded-2xl p-2 px-3 text-[12px] text-white max-w-[85%]">
                        <span className="text-[#FFAA81] block text-[10px] font-bold mb-0.5">@Justin</span>
                        Have they signed their contract yet?
                      </div>
                   </div>
                </div>
                <div className="mt-4 bg-white/5 rounded-full p-2 px-4 text-[11px] text-white/30 border border-white/10 flex items-center justify-between">
                   Type a message...
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </div>
              </div>
            </div>

            {/* Row 2: Bottom components */}
            <div className="w-full flex flex-wrap gap-4 mt-4 justify-center">
              
              {/* Take Notes Card */}
              <div className="w-full md:w-[240px]">
                <div className="bg-[#16171B] border border-white/10 rounded-[14px] p-5 h-[200px] flex flex-col relative overflow-hidden">
                  {/* Glowing intersection trail from the layout image */}
                  <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-[#4E95FF] blur-[60px] opacity-10 rounded-full" />
                  
                  <div className="w-6 h-6 mb-2 flex items-center justify-center bg-white/5 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <h4 className="text-[14px] font-semibold text-white mb-1">Take notes.</h4>
                  <p className="text-[13px] text-white/50 mb-4">Create documents to keep track of team resources</p>
                  <div className="bg-white/5 rounded-md border border-white/5 p-2 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="text-[10px] bg-white/10 px-1 rounded text-white/60">Aa</div>
                       <div className="text-[11px] text-white/80">Text</div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 border border-white/20 rounded-sm" />
                       <div className="text-[11px] text-white/80">To-do list</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync in Real Time Card (Wide) */}
              <div className="w-full md:w-[480px]">
                <div className="bg-[#16171B] border border-white/10 rounded-[14px] p-5 h-[200px] relative overflow-hidden flex flex-col items-center">
                  <h4 className="text-[14px] font-semibold text-white mb-1 text-center">Sync in real time.</h4>
                  <p className="text-[13px] text-white/50 text-center mb-6">Connect with your team instantly to monitor progress and track updates.</p>
                  
                  <div className="relative mt-2 flex items-center justify-center">
                    {/* Pulsing AI/Voice central icon */}
                    <div className="relative z-10 w-14 h-14 rounded-full bg-[#16171B] border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(78,149,255,0.4)] ring-4 ring-[#4E95FF]/10">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="22"/>
                      </svg>
                    </div>
                    
                    {/* Connection trails / orbits visual effect */}
                    <div className="absolute inset-x-[-120px] top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#4E95FF]/40 to-transparent" />
                    
                    {/* Floating avatars along connection lines */}
                    <div className="absolute -left-20 top-[-10px] flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full border border-white/20 p-0.5 bg-[#090A0C]">
                        <img src="https://i.pravatar.cc/100?img=1" className="w-full h-full rounded-full object-cover" alt="user" />
                      </div>
                      <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-white font-bold">AN</div>
                    </div>
                    
                    <div className="absolute -right-20 top-[0px] flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full border border-[#4E95FF] p-0.5 bg-[#090A0C] shadow-[0_0_15px_rgba(78,149,255,0.5)]">
                        <img src="https://i.pravatar.cc/100?img=12" className="w-full h-full rounded-full object-cover" alt="user" />
                      </div>
                       <div className="w-7 h-7 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                         <div className="w-1 h-1 rounded-full bg-white opacity-40" />
                       </div>
                    </div>

                    {/* Gradient background flares inside the card */}
                    <div className="absolute bottom-[-80px] w-full h-[120px] bg-[radial-gradient(circle_at_center,rgba(78,149,255,0.3)_0%,transparent_70%)] blur-[20px]" />
                  </div>
                </div>
              </div>

              {/* Manage Projects Card */}
              <div className="w-full md:w-[320px]">
                <div className="bg-[#16171B] border border-white/10 rounded-[14px] p-5 h-[200px] overflow-hidden">
                  <h4 className="text-[14px] font-semibold text-white mb-1">Manage projects.</h4>
                  <p className="text-[13px] text-white/50 mb-4">Customize your workspace to fit the needs of your teams.</p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex gap-4 h-full">
                    <div className="w-16 flex flex-col gap-1 border-r border-white/5 pr-2">
                      <div className="text-[10px] text-white/30 mb-1">CRM</div>
                      <div className="text-[10px] text-white/80 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Leads</div>
                      <div className="text-[10px] text-white/40">Customers</div>
                    </div>
                    <div className="flex-grow">
                      <div className="bg-white/[0.03] border border-white/10 rounded p-2 mb-2">
                        <div className="text-[10px] text-white/80 font-medium mb-1">Strategic digital campaign</div>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {[7, 8].map(i => (
                              <div key={i} className="w-4 h-4 rounded-full border border-[#16171B] bg-grey-500 overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i+40}`} alt="user" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                          <div className="text-[8px] text-white/40">6 members</div>
                        </div>
                      </div>
                      <div className="space-y-1 opacity-50">
                        <div className="h-2 w-full bg-white/5 rounded-full" />
                        <div className="h-2 w-2/3 bg-white/5 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Soft glowing light trails visual enhancer (simulated with SVGs/Divs) */}
        <div className="absolute top-[60%] left-[10%] w-[300px] h-[300px] bg-blue-500 opacity-10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[30%] right-[15%] w-[400px] h-[400px] bg-orange-500 opacity-[0.05] blur-[100px] rounded-full" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-subtle opacity-10 pointer-events-none" />
    </section>
  );
}