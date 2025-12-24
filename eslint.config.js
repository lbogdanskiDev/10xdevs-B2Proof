import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default defineConfig(
  // ignoruj to co w .gitignore
  includeIgnoreFile(gitignorePath),

  // dodatkowe globalne ignore
  { ignores: ["next-env.d.ts"] },

  // base JS + TS
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,

  // Twoje reguły / globals
  {
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
    },
  },

  // a11y dla JS/TS/JSX/TSX
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [jsxA11y.flatConfigs.recommended],
  },

  // React dla JS/TS/JSX/TSX
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [pluginReact.configs.flat.recommended],
    languageOptions: {
      globals: {
        window: true,
        document: true,
      },
    },
    plugins: {
      "react-hooks": eslintPluginReactHooks,
      "react-compiler": reactCompiler,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react-compiler/react-compiler": "error",
    },
  },

  // shadcn/ui: wyłącz prop-types (i opcjonalnie display-name)
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react/prop-types": "off",
      "react/display-name": "off",
    },
  },

  // Prettier na końcu
  eslintPluginPrettier
);
