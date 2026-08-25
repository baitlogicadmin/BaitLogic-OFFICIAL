import { Crosshair2Icon, EyeOpenIcon, GlobeIcon, LockClosedIcon } from "@radix-ui/react-icons";
import "./feature-tools.css";
import RegionalExploreEnhancer from "./RegionalExploreEnhancer";

const tools = [
  { href: "/barometer.html", label: "Barometer", icon: Crosshair2Icon, action: "barometer" },
  { href: "#field-check", label: "Field Check", icon: EyeOpenIcon, action: "field-check" },
  { href: "#water-intel", label: "Water Intel", icon: GlobeIcon, action: "water-intel" },
  { href: "#protect", label: "Protect", icon: LockClosedIcon, action: "protect" },
] as const;

function activateInAppTool(action: string) {
  if (action === "field-check" || action === "protect") {
    document.querySelector<HTMLButtonElement>(".report-tab")?.click();
    return;
  }
  if (action === "water-intel") {
    const exploreButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".bottom-nav button"))
      .find((button) => button.textContent?.trim().toLowerCase().includes("explore"));
    exploreButton?.click();
    requestAnimationFrame(() => document.querySelector("#regional-explore-host")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

export default function FeatureTools() {
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
                  history.replaceState(null, "", tool.href);
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
      <RegionalExploreEnhancer />
    </>
  );
}
