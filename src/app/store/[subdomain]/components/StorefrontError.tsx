"use client"

import React from 'react';

type StorefrontErrorProps = {
  errorType: 'not_found' | 'load_failed' | null;
  onRetry: () => void;
};

export function StorefrontError({ errorType, onRetry }: StorefrontErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center" style={{ color: 'var(--store-text-muted, #6d7175)' }}>
        <p className="font-medium mb-3">
          {errorType === 'load_failed' ? 'Unable to load this store right now.' : 'Store not found.'}
        </p>
        {errorType === 'load_failed' && (
          <button
            onClick={onRetry}
            className="h-10 px-4 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--primary, #008060)' }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
