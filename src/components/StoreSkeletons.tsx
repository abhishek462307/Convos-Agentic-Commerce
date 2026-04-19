"use client"

import React from 'react';

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-md animate-pulse ${className}`}
      style={{ background: 'color-mix(in srgb, var(--store-text-muted, #999) 15%, transparent)', ...style }}
    />
  );
}

function NavSkeleton() {
  return (
    <div className="sticky top-0 z-30 border-b" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-bg, #f6f6f7)' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4 h-14">
          <Bone className="w-12 h-6 rounded-lg shrink-0" />
          <div className="flex-1" />
          <Bone className="w-8 h-8 rounded-lg" />
          <Bone className="w-16 h-8 rounded-lg" />
        </div>
      </div>
      <div className="border-t" style={{ borderColor: 'var(--store-border, #e5e5e5)' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2 py-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} className="w-16 h-6 rounded-md shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
      <Bone className="w-full aspect-square !rounded-none" />
      <div className="p-3 space-y-2">
        <Bone className="w-3/4 h-3.5" />
        <Bone className="w-1/2 h-3" />
        <Bone className="w-1/3 h-4" />
      </div>
    </div>
  );
}

export function StorefrontSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #f6f6f7)' }}>
      {/* Mobile layout - matches SwiggyMinisHeader */}
      <div className="md:hidden">
        {/* Cover image area */}
        <div className="relative h-[220px] w-full">
          <Bone className="w-full h-full !rounded-none" />
          {/* Top buttons */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            <Bone className="w-9 h-9 rounded-full" />
            <div className="flex items-center gap-2">
              <Bone className="w-20 h-9 rounded-full" />
              <Bone className="w-9 h-9 rounded-full" />
            </div>
          </div>
        </div>
        {/* Store info card */}
        <div className="px-4 -mt-16 relative z-10 pb-5">
          <div className="rounded-[32px] border p-4" style={{ background: 'var(--store-card-bg, white)', borderColor: 'var(--store-border, #e5e5e5)' }}>
            <div className="flex gap-4">
              <Bone className="w-20 h-20 rounded-[24px] shrink-0" />
              <div className="flex-1 py-1 space-y-2">
                <Bone className="w-full h-3" />
                <Bone className="w-2/3 h-3" />
                <div className="flex items-center gap-1.5 mt-1">
                  <Bone className="w-3.5 h-3.5 rounded-full" />
                  <Bone className="w-24 h-3" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--store-border, #e5e5e5)' }}>
              <Bone className="w-24 h-8 rounded-lg" />
              <Bone className="w-24 h-8 rounded-lg" />
            </div>
          </div>
        </div>
        {/* Product grid */}
        <div className="px-4 pb-32">
          <Bone className="w-32 h-5 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
        {/* Bottom chat input placeholder */}
        <div className="fixed bottom-0 left-0 right-0 z-20 p-3 md:hidden">
          <Bone className="w-full h-12 rounded-2xl" />
        </div>
      </div>

      {/* Desktop layout - matches LandingHero */}
      <div className="hidden md:flex flex-col h-screen items-center justify-center relative">
        {/* Top header */}
        <div className="absolute top-0 inset-x-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bone className="w-16 h-8 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Bone className="w-[140px] h-9 rounded-lg" />
              <Bone className="w-16 h-9 rounded-lg" />
              <Bone className="w-20 h-9 rounded-lg" />
            </div>
          </div>
        </div>
        {/* Center content */}
        <div className="w-full max-w-2xl mx-auto px-6 flex flex-col items-center -mt-8">
          <Bone className="w-40 h-7 rounded-full mb-6" />
          <Bone className="w-[420px] h-12 mb-3" />
          <Bone className="w-[300px] h-12 mb-5" />
          <Bone className="w-[360px] h-4 mb-2" />
          <Bone className="w-[280px] h-4 mb-10" />
          <Bone className="w-full max-w-xl h-14 rounded-2xl mb-6" />
          <div className="flex items-center gap-2">
            <Bone className="w-10 h-4" />
            <Bone className="w-32 h-8 rounded-full" />
            <Bone className="w-28 h-8 rounded-full" />
            <Bone className="w-28 h-8 rounded-full" />
          </div>
        </div>
        {/* Bottom footer */}
        <div className="absolute bottom-6 flex items-center gap-4">
          <Bone className="w-28 h-3" />
          <Bone className="w-1 h-1 rounded-full" />
          <Bone className="w-24 h-3" />
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #f6f6f7)' }}>
      <NavSkeleton />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Bone className="w-6 h-6 rounded" />
          <Bone className="w-40 h-5" />
        </div>
        <Bone className="w-full h-10 rounded-lg mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #F1F1F6)' }}>
      <div className="sticky top-0 z-10 border-b" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bone className="w-8 h-8 rounded-lg" />
            <Bone className="w-20 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <Bone className="w-8 h-8 rounded-lg" />
            <Bone className="w-16 h-8 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Profile card */}
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
          <Bone className="w-11 h-11 rounded-full" />
          <div className="space-y-1.5">
            <Bone className="w-32 h-4" />
            <Bone className="w-48 h-3" />
          </div>
        </div>
        {/* Orders */}
        <div className="space-y-1.5 mb-3">
          <Bone className="w-20 h-4" />
          <Bone className="w-40 h-3" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
            <div className="flex items-center justify-between">
              <Bone className="w-24 h-3.5" />
              <Bone className="w-16 h-5 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <Bone className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Bone className="w-3/4 h-3" />
                <Bone className="w-1/2 h-3" />
              </div>
              <Bone className="w-16 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #F1F1F6)' }}>
      <div className="sticky top-0 z-10 border-b" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Bone className="w-8 h-8 rounded-lg" />
          <Bone className="w-20 h-4" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <React.Fragment key={i}>
              <Bone className="w-8 h-8 rounded-full" />
              {i < 2 && <Bone className="flex-1 h-0.5" />}
            </React.Fragment>
          ))}
        </div>
        {/* Form fields */}
        <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bone className="w-16 h-3" />
              <Bone className="w-full h-10 rounded-lg" />
            </div>
          ))}
        </div>
        {/* Order summary */}
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
          <Bone className="w-24 h-4" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Bone className="w-3/4 h-3" />
                <Bone className="w-1/3 h-3" />
              </div>
              <Bone className="w-14 h-4" />
            </div>
          ))}
          <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--store-border, #e5e5e5)' }}>
            <div className="flex justify-between">
              <Bone className="w-16 h-3" />
              <Bone className="w-14 h-3" />
            </div>
            <div className="flex justify-between">
              <Bone className="w-12 h-4" />
              <Bone className="w-16 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-20 px-6">
      <div 
        className="w-full max-w-md bg-white border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-10 rounded-[40px] relative overflow-hidden"
      >
        {/* Subtle Background Accent */}
        <Bone className="absolute top-0 left-0 right-0 h-1.5 !rounded-none" />

        <div className="mb-10 flex flex-col items-center text-center">
          <Bone className="w-24 h-3 mb-8 opacity-40" />
          <Bone className="w-48 h-8 mb-3" />
          <Bone className="w-64 h-4 opacity-40" />
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Bone className="w-24 h-3 pl-1" />
            <Bone className="w-full h-14 rounded-2xl" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Bone className="w-16 h-3" />
              <Bone className="w-12 h-3" />
            </div>
            <Bone className="w-full h-14 rounded-2xl" />
          </div>

          <div className="pt-2 space-y-4">
            <Bone className="w-full h-[60px] rounded-2xl" />
            <Bone className="w-full h-[60px] rounded-2xl" />
          </div>

          <div className="pt-8 text-center border-t border-gray-50">
            <Bone className="w-48 h-4 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrackSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #f6f6f7)' }}>
      <div className="border-b" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Bone className="w-8 h-8 rounded-lg" />
          <Bone className="w-28 h-4" />
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="text-center space-y-2 mb-8">
          <Bone className="w-40 h-5 mx-auto" />
          <Bone className="w-56 h-3 mx-auto" />
        </div>
        <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--store-border, #e5e5e5)', background: 'var(--store-card-bg, white)' }}>
          <div className="space-y-1.5">
            <Bone className="w-16 h-3" />
            <Bone className="w-full h-10 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Bone className="w-12 h-3" />
            <Bone className="w-full h-10 rounded-lg" />
          </div>
          <Bone className="w-full h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #f6f6f7)' }}>
      {/* Search header — matches the sticky bar with back arrow + search input */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 border-b"
        style={{ background: 'var(--store-bg, #f6f6f7)', borderColor: 'var(--store-border, #eee)' }}>
        <Bone className="w-9 h-9 rounded-full shrink-0" />
        <Bone className="flex-1 h-10 rounded-full" />
      </div>
      {/* Results count placeholder */}
      <div className="px-4 pt-4 pb-2">
        <Bone className="w-32 h-3.5" />
      </div>
      {/* Grid */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #f6f6f7)' }}>
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-8%] w-[500px] h-[500px] rounded-full opacity-[0.06] animate-pulse"
          style={{ background: 'radial-gradient(circle, var(--store-text-muted, #999) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04] animate-pulse"
          style={{ background: 'radial-gradient(circle, var(--store-text-muted, #999) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      </div>

      {/* Header — matches sticky frosted header */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-5 h-14 border-b"
        style={{ background: 'color-mix(in srgb, var(--store-bg, #f6f6f7) 85%, transparent)', backdropFilter: 'blur(20px)', borderColor: 'var(--store-border, #e5e5e5)' }}>
        <div className="flex items-center gap-2.5">
          <Bone className="w-7 h-7 rounded-lg shrink-0" />
          <Bone className="w-6 h-6 rounded-md shrink-0" />
          <Bone className="w-28 h-3.5 hidden sm:block" />
        </div>
        {/* Centered product title */}
        <Bone className="absolute left-1/2 -translate-x-1/2 w-36 h-3.5" />
        <div className="flex items-center gap-1.5">
          <Bone className="w-8 h-8 rounded-lg" />
          <Bone className="w-8 h-8 rounded-lg" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* LEFT — Image column */}
          <div className="lg:w-[52%]">
            {/* Main image container */}
              <Bone className="w-full rounded-2xl aspect-square" />
            {/* Thumbnail strip */}
            <div className="flex gap-2 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="w-16 h-16 rounded-xl shrink-0" />
              ))}
            </div>
          </div>

          {/* RIGHT — Info column */}
          <div className="lg:w-[48%] flex flex-col gap-4">
            {/* Category pill */}
            <Bone className="w-24 h-6 rounded-full" />
            {/* Title */}
            <div className="space-y-2">
              <Bone className="w-full h-9" />
              <Bone className="w-3/4 h-9" />
            </div>
            {/* Rating */}
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Bone key={i} className="w-3.5 h-3.5 rounded-sm" />
              ))}
              <Bone className="w-32 h-3" />
            </div>
            {/* Price block */}
            <Bone className="w-full h-16 rounded-2xl" />
            <Bone className="w-full h-px" />
            {/* Variants */}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 3 }).map((_, i) => (
                <Bone key={i} className="w-20 h-9 rounded-xl" />
              ))}
            </div>
            {/* Qty + Add to cart */}
            <div className="flex gap-3">
              <Bone className="w-[88px] h-11 rounded-xl shrink-0" />
              <Bone className="flex-1 h-11 rounded-xl" />
            </div>
            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Bone key={i} className="h-16 rounded-xl" />
              ))}
            </div>
            {/* Tabs card */}
            <Bone className="w-full h-48 rounded-2xl" />
          </div>
        </div>

        {/* Related products */}
        <div className="mt-16 pt-10 border-t" style={{ borderColor: 'var(--store-border, #e5e5e5)' }}>
          <Bone className="w-44 h-4 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Bone className="w-full aspect-square rounded-2xl" />
                <Bone className="w-3/4 h-3.5" />
                <Bone className="w-1/3 h-3.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--store-bg, #f6f6f7)' }}>
      {/* Header — matches frosted header with back + store name + bag title */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'color-mix(in srgb, var(--store-card-bg, white) 85%, transparent)', backdropFilter: 'blur(20px)', borderColor: 'var(--store-border, #e5e5e5)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Bone className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex items-center gap-2 flex-1">
            <Bone className="w-7 h-7 rounded-lg shrink-0" />
            <Bone className="w-28 h-3.5 hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <Bone className="w-4 h-4 rounded" />
            <Bone className="w-20 h-4" />
            <Bone className="w-6 h-5 rounded-full" />
          </div>
        </div>
      </div>

      {/* Body — two-column on desktop */}
      <div className="max-w-5xl mx-auto px-4 py-6 lg:flex lg:gap-8 lg:items-start">

        {/* Left — item cards */}
        <div className="flex-1 space-y-3 mb-6 lg:mb-0">
          {/* Items count + clear row */}
          <div className="flex items-center justify-between mb-1">
            <Bone className="w-20 h-3.5" />
            <Bone className="w-14 h-3.5" />
          </div>

          {/* 3 cart item skeletons */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4 flex gap-4"
              style={{ background: 'var(--store-card-bg, white)', borderColor: 'var(--store-border, #e5e5e5)' }}>
              {/* Thumbnail */}
              <Bone className="w-20 h-20 rounded-xl shrink-0" />
              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Bone className="w-3/4 h-4" />
                    <Bone className="w-1/3 h-5 rounded-full" />
                  </div>
                  <Bone className="w-7 h-7 rounded-full shrink-0" />
                </div>
                <Bone className="w-24 h-4" />
                <div className="flex items-center justify-between mt-1">
                  <Bone className="w-[88px] h-8 rounded-xl" />
                  <Bone className="w-16 h-3.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Bone key={i} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Right — order summary panel */}
        <div className="lg:w-[360px] space-y-4">
          {/* Coupon card */}
          <div className="rounded-2xl border p-4 space-y-3"
            style={{ background: 'var(--store-card-bg, white)', borderColor: 'var(--store-border, #e5e5e5)' }}>
            <div className="flex items-center gap-2">
              <Bone className="w-3.5 h-3.5 rounded" />
              <Bone className="w-24 h-4" />
            </div>
            <Bone className="w-full h-11 rounded-xl" />
          </div>

          {/* Summary card */}
          <div className="rounded-2xl border p-5 space-y-3"
            style={{ background: 'var(--store-card-bg, white)', borderColor: 'var(--store-border, #e5e5e5)' }}>
            <Bone className="w-32 h-4 mb-1" />
            {/* Line items */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Bone className="w-32 h-3.5" />
                <Bone className="w-20 h-3.5" />
              </div>
            ))}
            <Bone className="w-full h-px" />
            {/* Total */}
            <div className="flex items-center justify-between">
              <Bone className="w-16 h-5" />
              <Bone className="w-24 h-6" />
            </div>
            {/* Checkout button */}
              <Bone className="w-full h-[52px] rounded-2xl mt-2" />
            {/* Continue link */}
            <Bone className="w-36 h-3.5 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
