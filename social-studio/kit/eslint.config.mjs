import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Server Components: se renderizan por petición, Date.now() es correcto aquí
    files: ["src/app/**/page.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
  {
    // Procesos auxiliares de los tests: scripts CommonJS que se lanzan con `node` directamente
    files: ["tests/fixtures/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Respuestas JSON de APIs externas sin tipos oficiales
    files: ["src/lib/platforms/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
