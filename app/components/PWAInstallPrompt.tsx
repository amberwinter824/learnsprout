'use client';

import { useState, useEffect } from 'react';
import { X, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { getVapidKey } from '@/lib/webPush';

// Add this at the top of the file, after the imports
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * InstallPWA component - Provides an interface for users to install the PWA on their device
 * Shows conditionally based on installability and user preferences
 */
export default function InstallPWA() {
  // Track if the app is installable
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  // Track if the banner should be visible
  const [showBanner, setShowBanner] = useState<boolean>(false);
  // Track if the user has seen/dismissed the banner
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  // Track installation status
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  // Track if this is an iOS device (requires special instructions)
  const [isIOS, setIsIOS] = useState<boolean>(false);
  // Track if this is a standalone PWA already
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  // Detect if the app is already installed/standalone mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Detect if running in standalone mode (already installed)
      const isInStandaloneMode = () => 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone || 
        document.referrer.includes('android-app://');
      
      setIsStandalone(isInStandaloneMode());
      
      // Detect iOS devices
      const isIOSDevice = () => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      };
      
      setIsIOS(isIOSDevice());
      
      // Check if user has previously dismissed or installed
      const pwaBannerInteracted = localStorage.getItem('pwa-banner-interacted');
      if (pwaBannerInteracted === 'true') {
        setHasInteracted(true);
      }
    }
  }, []);

  // Listen for the beforeinstallprompt event to detect installability
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e);
      // Check if we should show the banner
      const pwaBannerInteracted = localStorage.getItem('pwa-banner-interacted') === 'true';
      if (!pwaBannerInteracted && !isStandalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      localStorage.setItem('pwa-installed', 'true');
      // Track installation event with analytics if needed
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'pwa_installed');
      }
    });

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, [isStandalone]);

  // Show the banner 3 seconds after page load to not interrupt immediate user interaction
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (installPrompt && !hasInteracted && !isStandalone) {
      timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    }
    
    // Special case for iOS which doesn't support beforeinstallprompt
    if (isIOS && !hasInteracted && !isStandalone) {
      timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    }
    
    return () => clearTimeout(timer);
  }, [installPrompt, hasInteracted, isIOS, isStandalone]);

  // Handle the installation process
  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    
    try {
      // Show the installation prompt
      const result = await installPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
      
      // Mark as interacted either way
      setHasInteracted(true);
      localStorage.setItem('pwa-banner-interacted', 'true');
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  // Handle user dismiss action
  const handleDismiss = () => {
    setShowBanner(false);
    setHasInteracted(true);
    localStorage.setItem('pwa-banner-interacted', 'true');
  };

  // Reset saved preferences (for testing)
  const resetPreferences = () => {
    localStorage.removeItem('pwa-banner-interacted');
    localStorage.removeItem('pwa-installed');
    setHasInteracted(false);
    setShowBanner(true);
  };

  // Register service worker and handle push subscription
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => {
          // Check if we already have a subscription
          return registration.pushManager.getSubscription()
            .then(subscription => {
              if (subscription) {
                return subscription;
              }
              
              // Get the VAPID key
              const vapidKey = getVapidKey();
              if (!vapidKey) {
                throw new Error('VAPID key is not available');
              }
              
              // Create a new subscription
              return registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey
              });
            });
        })
        .then(subscription => {
          // Send the subscription to your server
          if (subscription) {
            console.log('Push subscription successful:', subscription);
            // TODO: Send to your backend
          }
        })
        .catch(error => {
          console.error('Push subscription failed:', error);
        });
    }
  }, []);

  // Show nothing if conditions aren't met
  if (!showBanner || isStandalone) {
    return null;
  }

  // Render iOS-specific instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-blue-50 border-t border-blue-200 p-4 shadow-lg z-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Install Learn Sprout on your device</h3>
              <p className="mt-1 text-sm text-blue-700">
                To install this app on your iOS device:
                <ol className="ml-5 mt-1 list-decimal text-xs">
                  <li>Tap the Share button <span className="inline-block w-5 h-5 leading-5 text-center bg-gray-300 rounded">⤴</span></li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" in the top right corner</li>
                </ol>
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-3 flex-shrink-0 p-1 rounded-full text-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // Default banner for other browsers
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-emerald-50 border-t border-emerald-200 p-4 shadow-lg z-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <Download className="h-5 w-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-emerald-800">Install Learn Sprout on your device</h3>
            <p className="mt-1 text-sm text-emerald-700">
              Add this app to your home screen for quick and easy access, even when offline.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 flex space-x-2">
          <button
            onClick={handleDismiss}
            className="p-2 rounded-md text-emerald-600 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Not now
          </button>
          <button
            onClick={handleInstallClick}
            className="bg-emerald-600 text-white px-3 py-1 rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Install App
          </button>
        </div>
      </div>
      
      {/* Success message when installed */}
      {isInstalled && (
        <div className="mt-2 flex items-center text-emerald-700 bg-emerald-100 p-2 rounded">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">Successfully installed! You can now launch from your home screen.</span>
        </div>
      )}
    </div>
  );
}