import { Crosshair2Icon, EyeOpenIcon, GlobeIcon, LockClosedIcon } from "@radix-ui/react-icons";
import "./feature-tools.css";
import RegionalExploreEnhancer from "./RegionalExploreEnhancer";

// Keep the primary product hierarchy visible everywhere:
// Fishing Intelligence → Community Knowledge → Water & Environment → Conservation Action.
const tools = [
  { href: "/barometer.html", label: "Fishing Intel", icon: Crosshair2Icon },
  { href: "/field-intel.html#field-check", label: "Community", icon: EyeOpenIcon },
  { href: "/field-intel.html#water", label: "Water + Environment", icon: GlobeIcon },
  { href: "/nature-check.html", label: "Conservation", icon: LockClosedIcon },
];

export default function FeatureTools() {
  return (
    <>
      <link rel="stylesheet" href="/approved-visual.css" />
      <nav className="feature-tools" aria-label="BaitLogic core pillars">
        <div className="feature-tools-scroll">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return <a key={tool.href} href={tool.href}><Icon aria-hidden="true" /><span>{tool.label}</span></a>;
          })}
        </div>
      </nav>
      <RegionalExploreEnhancer />
    </>
  );
}
