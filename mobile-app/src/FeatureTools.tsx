import "./feature-tools.css";
import RegionalExploreEnhancer from "./RegionalExploreEnhancer";

type FieldTool = {
  href: string;
  label: string;
  external?: boolean;
};

const tools: FieldTool[] = [
  { href: "/barometer.html", label: "Barometer" },
  { href: "/field-intel.html#field-check", label: "Field Check" },
  { href: "/field-intel.html#water", label: "Water Intel" },
  { href: "/conservation-prairie.html", label: "Community Action" },
  { href: "/nature-check.html", label: "Report & Protect" },
  {
    href: "https://dnr.illinois.gov/lawenforcement/contact-cpo.html",
    label: "IL CPO Directory",
    external: true,
  },
  {
    href: "https://mdc.mo.gov/contact-engage/report-illegal-activity",
    label: "MO Report Illegal Activity",
    external: true,
  },
  {
    href: "https://heartlandsconservancy.org/project/knoll-family-wildlife-sanctuary/",
    label: "Prairie Education",
    external: true,
  },
];

export default function FeatureTools() {
  return (
    <>
      <nav className="feature-tools" aria-label="BaitLogic field tools">
        <span className="feature-tools-label">TOOLS</span>
        <div className="feature-tools-scroll">
          {tools.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              target={tool.external ? "_blank" : undefined}
              rel={tool.external ? "noreferrer" : undefined}
            >
              {tool.label}
            </a>
          ))}
        </div>
      </nav>
      <RegionalExploreEnhancer />
    </>
  );
}
