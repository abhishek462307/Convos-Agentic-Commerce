import React from 'react';

const Header = () => {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 h-16 bg-transparent transition-colors duration-200 px-safe pt-safe">
      <div className="container relative z-10 flex h-full items-center">
        {/* Logo */}
        <a className="transition-all duration-200" href="/">
          <span className="sr-only">Huly</span>
          <img
            alt="Huly logo"
            width={71}
            height={24}
            className="block h-[24px] w-[71px]"
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/d97ea0940c0302a26ddd7c1b56cf3346-1.svg"
          />
        </a>

        {/* Desktop Navigation */}
        <nav className="ml-[77px] hidden md:flex items-center lg:flex">
          <ul className="flex items-center">
            <li>
              <a
                className="inline-flex whitespace-pre p-3 text-[14px] font-medium text-white transition-colors duration-200 hover:text-[#4E95FF]"
                href="/pricing"
              >
                Pricing
              </a>
            </li>
            <li className="group relative">
              <button className="inline-flex items-center gap-x-1.5 whitespace-pre p-3 text-[14px] font-medium text-white">
                Resources
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60 transition-transform group-hover:rotate-180">
                  <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.4" />
                </svg>
              </button>
              <div className="invisible absolute bottom-0 left-1/2 w-max -translate-x-1/2 translate-y-full opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
                <ul className="mt-2 flex min-w-[300px] flex-col gap-y-0.5 rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#16171B] p-2.5 pb-3 shadow-[0px_14px_20px_rgba(0,0,0,0.5)]">
                  <li>
                    <a className="flex items-center rounded-[10px] p-2 transition-colors hover:bg-[rgba(255,255,255,0.05)]" href="/blog">
                      <span className="flex flex-col">
                        <span className="text-[14px] leading-tight text-white">Blog</span>
                        <span className="text-[13px] font-light text-[rgba(255,255,255,0.6)]">Read our latest insights</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a className="flex items-center rounded-[10px] p-2 transition-colors hover:bg-[rgba(255,255,255,0.05)]" href="https://docs.huly.io">
                      <span className="flex flex-col">
                        <span className="text-[14px] leading-tight text-white">Docs</span>
                        <span className="text-[13px] font-light text-[rgba(255,255,255,0.6)]">Explore our tutorials</span>
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </li>
            <li className="group relative">
              <button className="inline-flex items-center gap-x-1.5 whitespace-pre p-3 text-[14px] font-medium text-white">
                Community
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60 transition-transform group-hover:rotate-180">
                  <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.4" />
                </svg>
              </button>
              <div className="invisible absolute bottom-0 left-1/2 w-max -translate-x-1/2 translate-y-full opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
                <ul className="mt-2 flex min-w-[300px] flex-col gap-y-1 rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#16171B] p-2.5 pb-3 shadow-[0px_14px_20px_rgba(0,0,0,0.5)]">
                  <li>
                    <a className="flex items-center gap-3 rounded-[10px] p-2 transition-colors hover:bg-[rgba(255,255,255,0.05)]" href="https://x.com/huly_io">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
                        <img alt="X" width="18" height="18" src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/3f5fe9b041516a394be6c647da1490f4-2.svg" />
                      </div>
                      <span className="flex flex-col">
                        <span className="text-[14px] leading-tight text-white">X.com</span>
                        <span className="text-[13px] font-light text-[rgba(255,255,255,0.6)]">Follow our latest news</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a className="flex items-center gap-3 rounded-[10px] p-2 transition-colors hover:bg-[rgba(255,255,255,0.05)]" href="https://github.com/hcengineering/platform">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
                        <img alt="GitHub" width="18" height="18" src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/8ad9f8e5-1e3a-43be-a9f6-ec74728aef3e-huly-io/assets/svgs/c38fff878bfff5de53290840299693b0-6.svg" />
                      </div>
                      <span className="flex flex-col">
                        <span className="text-[14px] leading-tight text-white">GitHub</span>
                        <span className="text-[13px] font-light text-[rgba(255,255,255,0.6)]">Star us</span>
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </li>
            <li>
              <a
                className="inline-flex whitespace-pre p-3 text-[14px] font-medium text-white transition-colors duration-200 hover:text-[#4E95FF]"
                href="/download"
              >
                Download
              </a>
            </li>
          </ul>
        </nav>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-x-[14px]">
          {/* GitHub Star Button */}
          <a
            className="group hidden items-center px-1.5 text-[14px] font-normal text-white transition-colors hover:text-[rgba(255,255,255,0.8)] sm:flex lg:mr-[20px]"
            href="https://github.com/hcengineering/platform"
          >
            <svg className="mr-2 h-4 w-4 fill-white transition-transform group-hover:scale-110" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            Star Us
          </a>

          {/* Auth Buttons */}
          <div className="flex items-center gap-x-3.5">
            <a
              className="relative hidden h-8 items-center justify-center px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-white transition-all duration-200 border border-[rgba(255,255,255,0.1)] rounded-sm hover:bg-[rgba(255,255,255,0.05)] md:flex lg:flex"
              href="/login"
            >
              Sign In
            </a>
            <a
              className="relative hidden h-8 items-center justify-center px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-white transition-all duration-200 border border-[rgba(255,255,255,0.1)] rounded-sm hover:bg-[rgba(255,255,255,0.05)] md:flex lg:flex"
              href="/signup"
            >
              Sign Up
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden lg:hidden flex flex-col gap-1.5 p-2" aria-label="Open menu">
            <span className="h-0.5 w-6 rounded-full bg-white"></span>
            <span className="h-0.5 w-6 rounded-full bg-white"></span>
            <span className="h-0.5 w-6 rounded-full bg-white"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;