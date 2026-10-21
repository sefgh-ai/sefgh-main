import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-forwarding-probe/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Quarantined dead code, pending deletion.
    ".deadcode/**",
  ]),
  // Global rule: Enforce Hugeicons adapter for all new and existing code.
  // Bans lucide-react and @heroicons/react across the entire application.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message: "Do not import from 'lucide-react'. Use '@/components/ui/icons' (Hugeicons) instead.",
            },
            {
              name: "@heroicons/react",
              message: "Do not import from '@heroicons/react'. Use '@/components/ui/icons' (Hugeicons) instead.",
            },
            {
              name: "@heroicons/react/24/outline",
              message: "Do not import from '@heroicons/react/24/outline'. Use '@/components/ui/icons' (Hugeicons) instead.",
            },
            {
              name: "@heroicons/react/24/solid",
              message: "Do not import from '@heroicons/react/24/solid'. Use '@/components/ui/icons' (Hugeicons) instead.",
            },
          ],
        },
      ],
    },
    // Exclude deferred playground files until KEYS-UI-001 lands.
    ignores: [
      "src/components/playground/**",
      "src/app/api-reference/**",
      "src/app/playground/**",
      "src/lib/playground/**",
      "src/lib/utils/playground/**",
    ],
  },
]);

export default eslintConfig;
