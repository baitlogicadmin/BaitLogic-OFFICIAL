import { useEffect, useState } from "react";
import { Crosshair2Icon, EyeOpenIcon, GlobeIcon, LockClosedIcon } from "@radix-ui/react-icons";
import "./feature-tools.css";
import RegionalExploreEnhancer from "./RegionalExploreEnhancer";

const tools = [
  { href: "/barometer.html", label: "Barometer", icon: Crosshair2Icon, action: "barometer" },
  { href: "#field-check", label: "Field Check", icon: EyeOpenIcon, action: "field-check" },
  { href: "#water-intel", label: "Water Intel", icon: GlobeIcon, action: "water-intel" },
  { href: "#protect", label: "Protect", icon: LockClosedIcon, action: "protect" },
] as const;

const LOCATION_ERROR_EVENT = "baitlogic:location-error";
let lastLocationErrorCode = 0;

function installLocationErrorBridge() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  const geolocation = navigator.geolocation as Geolocation & { __baitlogicErrorBridge?: boolean };
  if (geolocation.__baitlogicErrorBridge) return;

  const original = geolocation.getCurrentPosition.bind(geolocation);
  const wrapped: Geolocation["getCurrentPosition"] = (success, error, options) => {
    original(success, (positionError) => {
      lastLocationErrorCode = Number(positionError?.code || 0);
      window.dispatchEvent(new CustomEvent(LOCATION_ERROR_EVENT, { detail: { code: lastLocationErrorCode } }));
      error?.(positionError);
    }, options);
  };

  try {
    Object.defineProperty(geolocation, "getCurrentPosition", { configurable: true, value: wrapped });
    Object.defineProperty(geolocation, "__baitlogicErrorBridge", { configurable: true, value: true });
  } catch {
    // Some browsers expose Geolocation methods as non-configurable. The core app still handles the error.
  }
}

installLocationErrorBridge();

function scrollToRegionalIntel(attempt = 0) {
  const host = document.querySelector<HTMLElement>("#regional-explore-host");
  if (host) {
    host.scrollIntoView({ behavior: "auto", block: "start" });
    return;
  }
  if (attempt < 20) window.setTimeout(() => scrollToRegionalIntel(attempt + 1), 50);
}

function activateInAppTool(action: string) {
  if (action === "field-check" || action === "protect") {
    document.querySelector<HTMLButtonElement>(".report-tab")?.click();
    return;
  }
  if (action === "water-intel") {
    const exploreButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button"))
      .find((button) => button.textContent?.trim().toLowerCase().includes("explore"));
    exploreButton?.click();
    window.setTimeout(() => scrollToRegionalIntel(), 0);
  }
}

function enhanceReportingCard() {
  const watchCopy = document.querySelector<HTMLElement>(".watch-copy");
  if (watchCopy && !watchCopy.querySelector(".watch-safety-note")) {
    const safety = document.createElement("p");
    safety.className = "watch-safety-note";
    safety.textContent = "Document safely. Never confront anyone or put yourself at risk.";
    watchCopy.appendChild(safety);
  }

  const reportingButton = document.querySelector<HTMLButtonElement>(".watch-cta");
  if (reportingButton) reportingButton.setAttribute("aria-label", "Open the official reporting guide");
}

export default function FeatureTools() {
  const [locationErrorCode, setLocationErrorCode] = useState(lastLocationErrorCode);

  useEffect(() => {
    const onLocationError = (event: Event) => {
      const code = Number((event as CustomEvent<{ code?: number }>).detail?.code || 0);
      setLocationErrorCode(code);
    };
    window.addEventListener(LOCATION_ERROR_EVENT, onLocationError);

    enhanceReportingCard();
    const observer = new MutationObserver(enhanceReportingCard);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener(LOCATION_ERROR_EVENT, onLocationError);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <nav className="feature-tools" aria-label="BaitLogic quick tools">
        <div className="feature-tools-scroll">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <a
                key={tool.href}
                href={tool.href}
                onClick={(event) => {
                  if (tool.action === "barometer") return;
                  event.preventDefault();
                  activateInAppTool(tool.action);
                }}
              >
                <Icon aria-hidden="true" />
                <span>{tool.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
      {locationErrorCode === 1 ? (
        <div className="location-recovery-banner" role="status">
          <strong>Location permission is off.</strong>
          <span>Allow location for bait-logic.com, then use My Location to retry.</span>
        </div>
      ) : null}
      <RegionalExploreEnhancer />
    </>
  );
}
