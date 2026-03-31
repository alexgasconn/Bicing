import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'bicing_install_banner_dismissed';

const getStandaloneState = () => {
  const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
  const isIosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return isStandaloneMedia || isIosStandalone;
};

export const usePwaInstall = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsStandalone(getStandaloneState());
    setIsDismissed(localStorage.getItem(DISMISS_KEY) === '1');

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        return;
      }
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
      localStorage.removeItem(DISMISS_KEY);
      setIsDismissed(false);
    };

    const onVisibility = () => {
      setIsStandalone(getStandaloneState());
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('focus', onVisibility);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('focus', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) {
      return false;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome !== 'accepted') {
      localStorage.setItem(DISMISS_KEY, '1');
      setIsDismissed(true);
    }
    setInstallEvent(null);
    return choice.outcome === 'accepted';
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setIsDismissed(true);
    setInstallEvent(null);
  }, []);

  return {
    canInstall: Boolean(installEvent) && !isDismissed && !isStandalone,
    isStandalone,
    promptInstall,
    dismissInstall
  };
};