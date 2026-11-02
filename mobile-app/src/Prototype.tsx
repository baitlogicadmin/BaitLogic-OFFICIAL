import { lazy, Suspense, useEffect, useState } from "react";
import MobileDashboard from "./MobileDashboard";

// Keep the Android/mobile entrypoint in the initial bundle. Desktop code and
// styles are fetched only when the viewport actually needs them.
const DesktopDashboard = lazy(() => import("./DesktopDashboard"));
const DESKTOP_QUERY = "(min-width: 761px)";

function useDesktopMode() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setDesktop(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return desktop;
}

export default function Prototype() {
  const desktop = useDesktopMode();
  return desktop
    ? <Suspense fallback={<main role="status" aria-live="polite">Loading BaitLogic desktop view…</main>}><DesktopDashboard /></Suspense>
    : <MobileDashboard />;
}
