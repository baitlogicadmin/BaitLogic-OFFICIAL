import "./feature-tools.css";
import RegionalExploreEnhancer from "./RegionalExploreEnhancer";

const tools = [
  { href: "/barometer.html", label: "Barometer" },
  { href: "/field-intel.html#field-check", label: "Field Check" },
  { href: "/field-intel.html#water", label: "Water Intel" },
  { href: "/nature-check.html", label: "Protect" },
];

export default function FeatureTools() {
  return (
    <>
      <nav className="feature-tools" aria-label="BaitLogic quick tools">
        <div className="feature-tools-scroll">
          {tools.map((tool) => (
            <a key={tool.href} href={tool.href}>{tool.label}</a>
          ))}
        </div>
      </nav>
      <RegionalExploreEnhancer />
    </>
  );
}
