"use client";

import { useState, useEffect, useCallback } from 'react';

/**
 * Push Notification Hook
 * Bildirim izni, subscription yönetimi
 */

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

// VAPID Public Key - Backend'den alınmalı
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function usePushNotification(): UsePushNotificationReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check support and current status
  useEffect(() => {
    async function checkSupport() {
      try {
        // Browser desteği kontrol
        const supported = 
          'serviceWorker' in navigator && 
          'PushManager' in window &&
          'Notification' in window;
        
        setIsSupported(supported);

        if (!supported) {
          setIsLoading(false);
          return;
        }

        // Mevcut izin durumu
        setPermission(Notification.permission);

        // Service worker kayıt
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);

        // Mevcut subscription kontrol
        const subscription = await reg.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

      } catch (err) {
        console.error('Push notification check failed:', err);
        setError('Bildirim desteği kontrol edilemedi');
      } finally {
        setIsLoading(false);
      }
    }

    checkSupport();
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.error('Permission request failed:', err);
      setError('İzin isteği başarısız');
      return 'denied';
    }
  }, []);

  // Subscribe to push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!registration || !VAPID_PUBLIC_KEY) {
      setError('Push servisi hazır değil');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // İzin iste
      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          setError('Bildirim izni verilmedi');
          return false;
        }
      }

      // VAPID key'i Uint8Array'e çevir
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Push subscription oluştur
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Backend'e gönder
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dhKey ? arrayBufferToBase64(p256dhKey) : '',
          auth: authKey ? arrayBufferToBase64(authKey) : '',
        },
      };

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        throw new Error('Subscription kaydedilemedi');
      }

      setIsSubscribed(true);
      return true;

    } catch (err) {
      console.error('Subscribe failed:', err);
      setError('Bildirim aboneliği başarısız');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, permission, requestPermission]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!registration) {
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Backend'den sil
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Subscription'ı iptal et
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      return true;

    } catch (err) {
      console.error('Unsubscribe failed:', err);
      setError('Abonelik iptali başarısız');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
