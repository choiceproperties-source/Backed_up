export function registerPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app still works
    });
  }
}

export function trackEvent(eventName: string, eventData?: Record<string, any>) {
  try {
    const events = JSON.parse(localStorage.getItem('choiceProperties_analytics') || '[]');
    events.push({
      name: eventName,
      timestamp: new Date().toISOString(),
      data: eventData || {}
    });
    // Keep only last 100 events
    localStorage.setItem('choiceProperties_analytics', JSON.stringify(events.slice(-100)));

    // Also send to Google Analytics if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', eventName, eventData);
    }
  } catch (e) {
    // Silently fail
  }
}

export function trackFormCompletion(formName: string, success: boolean) {
  trackEvent('form_submission', {
    form: formName,
    success,
    timestamp: new Date().toISOString()
  });
}

// Push Notification Support
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null;
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!('Notification' in window)) return null;
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    return null;
  }
}

export async function subscribeToPushNotifications(token: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Get existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Generate a VAPID public key for push notifications
      // In production, this would come from environment variables
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.warn('[PUSH] VAPID public key not configured');
        return false;
      }
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }
    
    // Send subscription to backend
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      })
    });
    
    return response.ok;
  } catch (e) {
    console.error('[PUSH] Subscribe error:', e);
    return false;
  }
}

export async function unsubscribeFromPushNotifications(token: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Notify backend first
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
      
      // Then unsubscribe locally
      await subscription.unsubscribe();
    }
    
    return true;
  } catch (e) {
    console.error('[PUSH] Unsubscribe error:', e);
    return false;
  }
}

export async function getPushSubscriptionStatus(): Promise<boolean> {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (e) {
    return false;
  }
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
