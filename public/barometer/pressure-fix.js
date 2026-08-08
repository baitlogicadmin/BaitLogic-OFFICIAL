"use strict";

// Live pressure fallback for BaitLogic. Uses Open-Meteo directly so the barometer
// is not dependent on a removed Supabase Edge Function from an old project.
async function loadPressure(){
  if(state.pressureController) state.pressureController.abort();
  state.pressureController = new AbortController();
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(state.latitude)}&longitude=${encodeURIComponent(state.longitude)}&current=pressure_msl&hourly=pressure_msl&past_days=1&forecast_days=1&timezone=auto`;
    const response = await fetch(url, { signal: state.pressureController.signal, cache: "no-store" });
    const data = await response.json();
    if(!response.ok || !data.current || !Number.isFinite(Number(data.current.pressure_msl))) throw new Error("Pressure data unavailable");

    const hpaToInHg = value => Number(value) * 0.0295299830714;
    const currentHpa = Number(data.current.pressure_msl);
    const pressure = hpaToInHg(currentHpa);

    const times = Array.isArray(data.hourly?.time) ? data.hourly.time : [];
    const values = Array.isArray(data.hourly?.pressure_msl) ? data.hourly.pressure_msl : [];
    const nowMs = Date.now();
    let currentIndex = 0;
    let bestDistance = Infinity;
    times.forEach((time, index) => {
      const distance = Math.abs(new Date(time).getTime() - nowMs);
      if(distance < bestDistance){ bestDistance = distance; currentIndex = index; }
    });

    const startIndex = Math.max(0, currentIndex - 6);
    const series = [];
    for(let i = startIndex; i <= currentIndex && i < values.length; i++){
      const v = Number(values[i]);
      if(Number.isFinite(v)) series.push({ pressureInHg: hpaToInHg(v) });
    }

    const threeHoursBack = Number(values[Math.max(0, currentIndex - 3)]);
    const delta = Number.isFinite(threeHoursBack) ? pressure - hpaToInHg(threeHoursBack) : 0;
    let trend = "steady";
    if(delta <= -0.12) trend = "falling_fast";
    else if(delta <= -0.03) trend = "falling";
    else if(delta >= 0.12) trend = "rising_fast";
    else if(delta >= 0.03) trend = "rising";

    const guidance = {
      falling_fast: "Pressure falling quickly — active feeding window may be developing",
      falling: "Pressure falling — often favorable for active fish",
      steady: "Pressure steady — focus on repeatable patterns and proven cover",
      rising: "Pressure rising — fish may tighten to cover or structure",
      rising_fast: "Pressure rising quickly — slow down and target high-percentage holding areas"
    }[trend];

    elements.pressureValue.textContent = pressure.toFixed(2);
    elements.pressureTrend.textContent = guidance;
    const meta = trendMeta[trend] || trendMeta.steady;
    elements.biteStatus.textContent = meta.badge;
    elements.biteStatus.className = `status-pill ${meta.cls}`.trim();
    elements.pressureNeedle.style.transform = `translateX(-50%) rotate(${meta.angle}deg)`;
    if(series.length > 1) drawTrendLine(series);
    return true;
  }catch(error){
    if(error.name === "AbortError") return false;
    console.error("BaitLogic pressure update failed", error);
    elements.pressureValue.textContent = "--.--";
    elements.pressureTrend.textContent = "Live pressure temporarily unavailable — tap Refresh to retry";
    elements.biteStatus.textContent = "RETRY";
    elements.biteStatus.className = "status-pill bad";
    return false;
  }
}
