import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-forwarding-probe/**",
    ".next-key-ui-probe/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Quarantined dead code, pending deletion.
    ".deadcode/**",
  ]),
]);

export default eslintConfig;
