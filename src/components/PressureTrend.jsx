// src/components/PressureTrend.jsx
//
// Displays current barometric pressure and a 3-hour trend for a lake, with
// a plain-language fishing note. Data comes from the pressure-trend Supabase
// Edge Function — this component never calls NWS directly.
//
// Usage:
//   <PressureTrend lakeSlug="carlyle-lake" />
//
// Requires a tailwind.config.js theme extension along these lines:
//   colors: {
//     teal:  { DEFAULT: '#16433F' },
//     clay:  { DEFAULT: '#C9A77C' },
//     coral: { DEFAULT: '#E8734A' },
//     sand:  { DEFAULT: '#F7F4EE' },
//   },
//   fontFamily: {
//     display: ['"EB Garamond"', 'serif'],
//     ui: ['Inter', 'sans-serif'],
//     data: ['"IBM Plex Mono"', 'monospace'],
//   }

import { useEffect, useState } from "react";

const SUPABASE_FUNCTIONS_URL = import.meta.env?.VITE_SUPABASE_FUNCTIONS_URL
  ?? "https://YOUR-PROJECT-REF.supabase.co/functions/v1";

const TREND_META = {
  rising_fast: { arrow: "↑", label: "Rising fast", tone: "text-coral" },
  rising: { arrow: "↑", label: "Rising", tone: "text-clay" },
  steady: { arrow: "→", label: "Steady", tone: "text-teal" },
  falling: { arrow: "↓", label: "Falling", tone: "text-clay" },
  falling_fast: { arrow: "↓", label: "Falling fast", tone: "text-coral" },
};

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function PressureTrend({ lakeSlug, lat, lon, className = "" }) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });

    const params = lakeSlug
      ? `lake=${encodeURIComponent(lakeSlug)}`
      : `lat=${lat}&lon=${lon}`;

    fetch(`${SUPABASE_FUNCTIONS_URL}/quick-processor?${params}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load pressure data.");
        return body;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [lakeSlug, lat, lon]);

  return (
    <div
      className={`rounded-2xl border border-clay/30 bg-sand p-5 font-ui ${className}`}
    >
      <h3 className="font-display text-xl text-teal mb-3">Barometric Pressure</h3>

      {state.status === "loading" && (
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-32 rounded bg-clay/20" />
          <div className="h-4 w-48 rounded bg-clay/20" />
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-teal/80">
          <p className="font-medium text-coral mb-1">Pressure data isn't available right now.</p>
          <p>{state.error}</p>
        </div>
      )}

      {state.status === "ready" && (
        <PressureReady data={state.data} />
      )}
    </div>
  );
}

function PressureReady({ data }) {
  const meta = TREND_META[data.trend] ?? TREND_META.steady;

  return (
    <>
      <div className="flex items-baseline gap-3">
        <span className="font-data text-3xl text-teal">
          {data.latest.pressureInHg.toFixed(2)}
          <span className="text-base text-teal/60"> inHg</span>
        </span>
        <span className={`font-ui font-semibold ${meta.tone}`}>
          {meta.arrow} {meta.label}
        </span>
      </div>

      <p className="font-data text-xs text-teal/60 mt-1">
        {data.delta3hrInHg >= 0 ? "+" : ""}
        {data.delta3hrInHg.toFixed(2)} inHg over the last 3 hrs
      </p>

      <p className="text-sm text-teal/90 mt-3 leading-relaxed">{data.guidance}</p>

      <p className="text-xs text-teal/50 mt-4">
        Via NWS station {data.station.name} ({data.station.id}) · read at{" "}
        {formatTimestamp(data.latest.timestamp)}
      </p>
    </>
  );
}
