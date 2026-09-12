"use strict";

(function () {
  const pill = document.querySelector("#connectionPill");
  const status = document.querySelector("#connectionStatus");
  if (!pill || !status) return;

  function sync() {
    const value = (status.textContent || "").trim().toLowerCase();
    const loading = /loading|locating|working|fetching|requesting|reading/.test(value);
    const offline = value.includes("offline");
    const saved = value.includes("saved");
    const failed = /unavailable|retry|error|failed/.test(value);
    const ready = /ready|choose/.test(value);

    pill.dataset.mode = offline ? "offline" : saved ? "saved" : loading ? "loading" : failed ? "error" : ready ? "ready" : "live";

    const label = pill.querySelector("span");
    if (!label) return;
    label.textContent = offline
      ? "OFFLINE"
      : saved
        ? "SAVED • REFRESHING"
        : loading
          ? "CONNECTING"
          : failed
            ? "RETRY"
            : ready
              ? "READY"
              : "LIVE";
  }

  // One lightweight observer replaces the old 300ms polling loop.
  const observer = new MutationObserver(sync);
  observer.observe(status, { childList: true, characterData: true, subtree: true });
  window.addEventListener("online", sync, { passive: true });
  window.addEventListener("offline", sync, { passive: true });
  sync();
})();
