import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isInStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(isInStandaloneMode);
    };

    // Check if it's iOS device
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(isIOSDevice);
    };

    checkInstalled();
    checkIOS();

    // Check if user dismissed recently (within 7 days)
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    const wasRecentlyDismissed = dismissedTime && Date.now() - parseInt(dismissedTime) < 7 * 24 * 60 * 60 * 1000;

    // For iOS, always show the prompt (with instructions) if not installed and not recently dismissed
    if (!isInstalled && !wasRecentlyDismissed && isIOS) {
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000); // Show after 5 seconds for iOS
    }

    // Listen for beforeinstallprompt event (for Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after a delay for better UX
      if (!isInstalled && !wasRecentlyDismissed) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, isIOS]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  // For Android/Chrome, require deferredPrompt to be available
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0">
            <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Install Chronicle App
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isIOS ? (
                <>
                  Install Chronicle for the best experience. 
                  Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
                </>
              ) : (
                <>
                  Install Chronicle for faster access and offline features. 
                  Get the full app experience on your device.
                </>
              )}
            </p>
            <div className="mt-3 flex space-x-2">
              {!isIOS && (
                <Button 
                  onClick={handleInstallClick}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDismiss}
                className="border-slate-300 dark:border-slate-600"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="ml-2 -mr-1 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
