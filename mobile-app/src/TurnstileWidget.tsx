import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "baitlogic-turnstile";
let loader: Promise<TurnstileApi> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loader) return loader;

  loader = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile_unavailable"));
    script.onerror = () => reject(new Error("turnstile_unavailable"));
    document.head.append(script);
  });

  return loader;
}

export default function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let widgetId = "";

    loadTurnstile().then((turnstile) => {
      if (disposed || !container.current) return;
      widgetId = turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "dark",
        size: "flexible",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    }).catch(() => onToken(""));

    return () => {
      disposed = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken, siteKey]);

  return <div ref={container} className="turnstile-slot" aria-label="Submission verification" />;
}
