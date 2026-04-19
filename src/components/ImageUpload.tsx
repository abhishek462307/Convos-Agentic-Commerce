"use client"

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Image as ImageIcon, Loader2, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  bucket?: string;
  className?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  disabled, 
  bucket = 'products',
  className
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className={cn("w-full flex flex-col items-center justify-center", className)}>
      <div 
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={cn(
          "relative cursor-pointer hover:opacity-75 transition border-dashed border-2 flex flex-col gap-2 items-center justify-center text-neutral-600 rounded-lg w-full bg-[#f6f6f7] border-[#d2d2d2]",
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          !value && "aspect-video"
        )}
      >
        {value ? (
          <div className="relative w-full aspect-video">
            <img 
              src={value} 
              alt="Upload" 
              className="object-cover w-full h-full rounded-lg"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white shadow-sm hover:bg-red-600 z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-[#008060]" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-[#bababa]" />
                <div className="font-semibold text-[11px]">
                  Click to upload
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
}
