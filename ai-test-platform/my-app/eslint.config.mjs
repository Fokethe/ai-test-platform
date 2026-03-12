import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 允许 console 在开发环境
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      
      // TypeScript 规则
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_" 
      }],
      
      // React 规则
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      
      // 通用规则
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // 忽略的文件
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
];

export default eslintConfig;
