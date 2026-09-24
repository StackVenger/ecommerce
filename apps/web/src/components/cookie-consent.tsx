'use client';

import { useState, useEffect, useCallback } from 'react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const COOKIE_CONSENT_KEY = 'cookie-consent';
const COOKIE_PREFERENCES_KEY = 'cookie-preferences';

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true, // Always required
  analytics: false,
  marketing: false,
  preferences: false,
};

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid layout shift on initial load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }

    // Load saved preferences
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  const saveConsent = useCallback((prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, new Date().toISOString());
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setIsVisible(false);

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: prefs }));
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  }, [saveConsent]);

  const acceptNecessary = useCallback(() => {
    saveConsent(DEFAULT_PREFERENCES);
  }, [saveConsent]);

  const saveCustom = useCallback(() => {
    saveConsent(preferences);
  }, [preferences, saveConsent]);

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') {
      return;
    } // Can't disable necessary cookies
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-foreground/[0.04] bg-card shadow-2xl shadow-black/10">
        {/* Main banner */}
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
              🍪
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-black tracking-tight text-gray-900">
                We use cookies
              </h3>
              <p className="mb-1 text-sm font-medium text-gray-600">
                We use cookies to enhance your browsing experience, serve personalized content, and
                analyze our traffic.
              </p>
              <p className="text-sm text-gray-500 font-bengali">
                আমরা আপনার ব্রাউজিং অভিজ্ঞতা উন্নত করতে, ব্যক্তিগতকৃত সামগ্রী পরিবেশন করতে এবং
                আমাদের ট্রাফিক বিশ্লেষণ করতে কুকিজ ব্যবহার করি।
              </p>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-2 text-sm font-bold text-brand-700 underline underline-offset-4 hover:text-brand-800"
              >
                {showDetails ? 'Hide details' : 'Customize preferences'}
              </button>
            </div>
          </div>

          {/* Detailed preferences */}
          {showDetails && (
            <div className="mt-5 space-y-3 border-t border-foreground/[0.05] pt-5">
              <CookieCategory
                title="Necessary"
                titleBn="প্রয়োজনীয়"
                description="Essential cookies for the website to function properly."
                checked={preferences.necessary}
                disabled
                onChange={() => {}}
              />
              <CookieCategory
                title="Analytics"
                titleBn="বিশ্লেষণ"
                description="Help us understand how visitors interact with our website."
                checked={preferences.analytics}
                onChange={() => togglePreference('analytics')}
              />
              <CookieCategory
                title="Marketing"
                titleBn="বিপণন"
                description="Used to deliver personalized advertisements."
                checked={preferences.marketing}
                onChange={() => togglePreference('marketing')}
              />
              <CookieCategory
                title="Preferences"
                titleBn="পছন্দ"
                description="Remember your settings and preferences."
                checked={preferences.preferences}
                onChange={() => togglePreference('preferences')}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={acceptAll} className="btn btn-primary flex-1">
              Accept All / সব গ্রহণ করুন
            </button>
            {showDetails ? (
              <button onClick={saveCustom} className="btn btn-dark flex-1">
                Save Preferences
              </button>
            ) : (
              <button onClick={acceptNecessary} className="btn btn-soft flex-1">
                Necessary Only / শুধু প্রয়োজনীয়
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CookieCategoryProps {
  title: string;
  titleBn: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function CookieCategory({
  title,
  titleBn,
  description,
  checked,
  disabled,
  onChange,
}: CookieCategoryProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{title}</span>
          <span className="text-sm text-gray-500 font-bengali">({titleBn})</span>
          {disabled && <span className="pill pill-neutral">Required</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
        />
        <div
          className={`w-10 h-5 rounded-full transition-colors ${
            disabled ? 'cursor-not-allowed bg-brand-300' : checked ? 'bg-primary' : 'bg-gray-300'
          } peer-focus:ring-4 peer-focus:ring-primary/20 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform ${
            checked ? 'after:translate-x-5' : ''
          }`}
        />
      </label>
    </div>
  );
}

/**
 * Hook to check cookie consent preferences
 */
export function useCookieConsent(): CookiePreferences | null {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        // Ignore invalid JSON
      }
    }

    const handler = (event: CustomEvent<CookiePreferences>) => {
      setPreferences(event.detail);
    };

    window.addEventListener('cookie-consent-updated', handler as EventListener);
    return () => window.removeEventListener('cookie-consent-updated', handler as EventListener);
  }, []);

  return preferences;
}
