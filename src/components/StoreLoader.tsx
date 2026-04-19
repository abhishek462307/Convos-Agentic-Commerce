"use client"

import React from 'react';
import Image from 'next/image';
import { Loader2, Store } from 'lucide-react';
import { motion } from 'framer-motion';

interface StoreLoaderProps {
  style: 'spinner' | 'dots' | 'pulse' | 'bars' | 'logo';
  logoUrl?: string | null;
  logoWidth?: number;
  logoHeight?: number;
  primaryColor?: string;
}

export function StoreLoader({ style, logoUrl, logoWidth = 64, logoHeight = 64, primaryColor = '#008060' }: StoreLoaderProps) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center" 
      style={{ background: 'var(--store-bg, #f6f6f7)' }}
    >
      {style === 'spinner' && (
        <Loader2 
          className="w-8 h-8 animate-spin" 
          style={{ color: primaryColor }}
        />
      )}

      {style === 'dots' && (
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: primaryColor }}
              animate={{
                y: [0, -12, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}

      {style === 'pulse' && (
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute w-16 h-16 rounded-full"
            style={{ backgroundColor: primaryColor, opacity: 0.2 }}
            animate={{
              scale: [1, 2],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="absolute w-16 h-16 rounded-full"
            style={{ backgroundColor: primaryColor, opacity: 0.2 }}
            animate={{
              scale: [1, 2],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.4
            }}
          />
          <div 
            className="w-8 h-8 rounded-full z-10"
            style={{ backgroundColor: primaryColor, opacity: 0.6 }}
          />
        </div>
      )}

      {style === 'bars' && (
        <div className="flex items-end gap-1 h-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
              animate={{
                height: ['12px', '28px', '12px'],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}

      {style === 'logo' && (
        <div className="flex flex-col items-center gap-4">
          {logoUrl ? (
            <motion.div
              className="rounded-xl overflow-hidden shadow-lg"
              style={{ width: logoWidth, height: logoHeight }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Image 
                src={logoUrl} 
                alt="Store" 
                width={logoWidth} 
                height={logoHeight} 
                className="object-contain w-full h-full"
              />
            </motion.div>
          ) : (
            <motion.div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Store className="w-8 h-8" style={{ color: primaryColor }} />
            </motion.div>
          )}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
