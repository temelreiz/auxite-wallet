// src/app/auth/verify-email/page.tsx
// Web Email Verification Page

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, AlertCircle, CheckCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && email) {
      verifyEmail();
    } else {
      setStatus('error');
      setError('Invalid verification link');
    }
  }, [token, email]);

  const verifyEmail = async () => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email || '')}`);
      const data = await response.json();

      if (data.success) {
        if (data.alreadyVerified) {
          setStatus('already');
        } else {
          setStatus('success');
          // Store token if provided
          if (data.token) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } else {
        setStatus('error');
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setStatus('error');
      setError('Connection error. Please try again.');
    }
  };

  // Verifying State
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-12 h-12 text-[#2F6F62] animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-3">Verifying Email...</h1>
          <p className="text-slate-400">Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  // Success State
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2F6F62]/20 mb-6">
            <CheckCircle className="w-10 h-10 text-[#2F6F62]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Email Verified!</h1>
          <p className="text-slate-400 mb-8">
            Your email has been successfully verified. You can now access all features of your Auxite account.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Already Verified State
  if (status === 'already') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-6">
            <CheckCircle className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Already Verified</h1>
          <p className="text-slate-400 mb-8">
            This email address has already been verified. You can sign in to your account.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Error State
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Verification Failed</h1>
        <p className="text-slate-400 mb-2">{error}</p>
        <p className="text-slate-500 text-sm mb-8">
          The verification link may have expired or already been used.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            Sign In
          </Link>
          <button
            onClick={() => router.push('/auth/register')}
            className="px-6 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
