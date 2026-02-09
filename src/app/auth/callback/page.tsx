// src/app/auth/callback/page.tsx
// OAuth Callback Handler - Saves token to localStorage and redirects

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      router.push(`/auth/login?error=${error}`);
      return;
    }

    if (token && userParam) {
      try {
        // Save to localStorage
        localStorage.setItem('authToken', token);
        
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('user', JSON.stringify(user));

        // Redirect to home
        router.push('/');
      } catch (e) {
        console.error('Failed to parse user data:', e);
        router.push('/auth/login?error=parse_failed');
      }
    } else {
      router.push('/auth/login?error=missing_data');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#2F6F62] animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Completing sign in...</p>
        <p className="text-slate-400 text-sm mt-2">Please wait</p>
      </div>
    </div>
  );
}
