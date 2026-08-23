import { Crosshair2Icon, EyeOpenIcon, GlobeIcon, LockClosedIcon } from "@radix-ui/react-icons";
import "./feature-tools.css";
import RegionalExploreEnhancer from "./RegionalExploreEnhancer";

const tools = [
  { href: "/barometer.html", label: "Barometer", icon: Crosshair2Icon },
  { href: "/field-intel.html#field-check", label: "Field Check", icon: EyeOpenIcon },
  { href: "/field-intel.html#water", label: "Water Intel", icon: GlobeIcon },
  { href: "/nature-check.html", label: "Protect", icon: LockClosedIcon },
];

export default function FeatureTools() {
  return (
    <>
      <nav className="feature-tools" aria-label="BaitLogic quick tools">
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
