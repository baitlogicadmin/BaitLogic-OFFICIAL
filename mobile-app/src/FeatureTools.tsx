import "./feature-tools.css";
import RegionalExploreEnhancer from "./RegionalExploreEnhancer";

const tools = [
  { href: "/barometer.html", label: "Barometer" },
  { href: "/field-intel.html#field-check", label: "Field Check" },
  { href: "/field-intel.html#water", label: "Water Intel" },
  { href: "/conservation-prairie.html", label: "Community Action" },
  { href: "/nature-check.html", label: "Report & Protect" },
];

export default function FeatureTools() {
  return (
    <>
      <nav className="feature-tools" aria-label="BaitLogic field tools">
        <span className="feature-tools-label">TOOLS</span>
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
