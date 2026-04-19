"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MissionsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/conversations');
  }, [router]);

  return null;
}
