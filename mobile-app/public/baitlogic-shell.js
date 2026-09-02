(() => {
  const path = window.location.pathname;
  const pages = [
    ["/", "Home"],
    ["/barometer.html", "Barometer"],
    ["/catches.html", "Catches"],
    ["/nature-check.html", "Nature Check"],
    ["/trails.html", "Trails"],
    ["/outdoor.html", "Education"],
  ];

  const header = document.createElement("header");
  header.className = "bl-site-header";
  header.innerHTML = `
    <div class="bl-site-header__inner">
      <a class="bl-site-brand" href="/" aria-label="BaitLogic Outdoors home">
        <img src="/assets/baitlogic-boysenberry-logo.svg" alt="" width="58" height="58">
        <span><strong>BAITLOGIC OUTDOORS</strong><small>Beyond the Bite. Powered by People and Purpose.</small></span>
      </a>
      <nav class="bl-site-nav" aria-label="Primary navigation">
        ${pages.map(([href, label]) => `<a href="${href}"${path === href ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
        ${path === "/barometer.html" ? '<button class="bl-install" id="installButton" type="button" hidden>Install</button>' : ""}
      </nav>
    </div>`;

  const oldHeader = document.querySelector("body > header");
  if (oldHeader) oldHeader.replaceWith(header);
  else document.body.prepend(header);

  if (!document.querySelector(".bl-site-footer")) {
    const footer = document.createElement("footer");
    footer.className = "bl-site-footer";
    footer.innerHTML = "<strong>BaitLogic Outdoors</strong><br>Beyond the Bite. Powered by People and Purpose.";
    document.body.append(footer);
  }
})();
