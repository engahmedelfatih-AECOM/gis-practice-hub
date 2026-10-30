import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

/**
 * Architectural boundaries (see docs/adr/ADR-001-stack-and-layering.md).
 *
 *   domain          pure business rules; imports nothing but itself and lib
 *   application     use cases, policy, audit; may use domain + infrastructure
 *   infrastructure  database, auth adapter, logging; may use domain
 *   components      presentational React; may use domain types/schemas + lib
 *   app             Next.js routes; may use application, components, domain, lib
 *   lib             tiny shared helpers (formatting, cn); imports nothing
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain" },
        { type: "application", pattern: "src/application" },
        { type: "infrastructure", pattern: "src/infrastructure" },
        { type: "components", pattern: "src/components" },
        { type: "app", pattern: "src/app" },
        { type: "proxy", pattern: "src/proxy.ts", mode: "file" },
        { type: "lib", pattern: "src/lib" },
      ],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "lib", allow: ["lib"] },
            { from: "domain", allow: ["domain", "lib"] },
            { from: "infrastructure", allow: ["infrastructure", "domain", "lib"] },
            { from: "application", allow: ["application", "domain", "infrastructure", "lib"] },
            { from: "components", allow: ["components", "domain", "lib"] },
            { from: "app", allow: ["app", "application", "components", "domain", "lib"] },
            { from: "proxy", allow: ["lib"] },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "db/**",
  ]),
]);

export default eslintConfig;
