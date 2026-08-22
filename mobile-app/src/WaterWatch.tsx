import { useEffect, useId, useState } from "react";
import { Cross2Icon, ExternalLinkIcon, EyeOpenIcon, GlobeIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { waterWatchCheckedAt, waterWatchItems } from "./data/waterWatchData";
import "./water-watch.css";

const illinoisEpaComplaint = "https://epa.illinois.gov/pollution-complaint/submit-a-complaint.html";
const illinoisDnrReporting = "https://dnr.illinois.gov/lawenforcement/target-poachers.html";

function readableDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${iso}T12:00:00`));
}

export default function WaterWatch() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="water-watch-launcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="water-watch-launcher-mark" aria-hidden="true">≈</span>
        <span><strong>Water Watch</strong><small>Illinois · source verified</small></span>
      </button>

      {open ? (
        <div className="water-watch-layer">
          <button type="button" className="water-watch-overlay" aria-label="Close Water Watch" onClick={() => setOpen(false)} />
          <section
            className="water-watch-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <header className="water-watch-header">
              <div>
                <span className="water-watch-kicker">BAITLOGIC CONSERVATION INTELLIGENCE</span>
                <h2 id={titleId}>Illinois Water Watch</h2>
                <p id={descriptionId}>What changed, why it matters outdoors, and what the source actually supports.</p>
              </div>
              <button type="button" className="water-watch-close" aria-label="Close Water Watch" onClick={() => setOpen(false)}><Cross2Icon /></button>
            </header>

            <div className="water-watch-trustbar">
              <GlobeIcon />
              <span><strong>Verified against Illinois General Assembly records</strong><small>Checked {readableDate(waterWatchCheckedAt)} · policy summaries are BaitLogic plain-language interpretation</small></span>
            </div>

            <div className="water-watch-content">
              <section className="water-watch-intro">
                <span>POLICY → FIELD MEANING → ACTION</span>
                <h3>Conservation information built for the people who notice change first.</h3>
                <p>Water Watch separates official legal status from BaitLogic interpretation and from community observations. No political endorsement is implied.</p>
              </section>

              <div className="water-watch-grid">
                {waterWatchItems.map((item) => (
                  <article className={`water-watch-card ${item.status === "awaiting-final-status" ? "needs-recheck" : "is-current"}`} key={item.id}>
                    <div className="water-watch-card-top">
                      <span className="water-watch-bill">{item.bill}</span>
                      <span className="water-watch-status">{item.status === "awaiting-final-status" ? "NEEDS RECHECK" : "OFFICIAL · CURRENT"}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p className="water-watch-statusline">{item.statusLabel}</p>
                    <dl>
                      <div><dt>FIELD MEANING</dt><dd>{item.fieldMeaning}</dd></div>
                      <div><dt>DO NOT ASSUME</dt><dd>{item.guardrail}</dd></div>
                      <div><dt>WHAT YOU CAN DO</dt><dd>{item.action}</dd></div>
                    </dl>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer">Source: {item.sourceAuthority} · checked {readableDate(item.checkedAt)} <ExternalLinkIcon /></a>
                  </article>
                ))}
              </div>

              <section className="water-watch-reporting" aria-labelledby="water-watch-reporting-title">
                <div className="water-watch-reporting-copy">
                  <span>SEE SOMETHING? SAY SOMETHING.</span>
                  <h3 id="water-watch-reporting-title">BaitLogic does not replace an official report.</h3>
                  <p>For a pollution concern or wildlife violation, contact the responsible agency directly. A community Field Check is optional and separate.</p>
                </div>
                <div className="water-watch-actions">
                  <a href={illinoisEpaComplaint} target="_blank" rel="noreferrer"><GlobeIcon /><span><strong>Pollution concern</strong><small>Illinois EPA official complaint</small></span><ExternalLinkIcon /></a>
                  <a href={illinoisDnrReporting} target="_blank" rel="noreferrer"><EyeOpenIcon /><span><strong>Wildlife violation</strong><small>Illinois DNR official reporting</small></span><ExternalLinkIcon /></a>
                  <a href="/field-intel.html#field-check"><LockClosedIcon /><span><strong>Community Field Check</strong><small>General area only · not sent to government</small></span></a>
                </div>
              </section>

              <section className="water-watch-next">
                <span>NEXT FOUNDATION</span>
                <h3>Follow My Water</h3>
                <p>The next protected layer will let people follow a named waterbody for meaningful official changes, verified conservation updates, and carefully moderated patterns—without exposing exact community locations.</p>
                <div className="water-watch-next-tags"><span>Consent-first alerts</span><span>Private subscription identity</span><span>Offline public intelligence</span><span>Source history</span></div>
              </section>

              <p className="water-watch-footnote"><LockClosedIcon /> Source dates remain visible. Stale or unresolved information must downgrade to “Needs Recheck” instead of silently appearing current.</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
