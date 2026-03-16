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
      "@typescript-eslint/explicit-function-return-type": "off",
      
      // React 规则
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      
      // 通用规则
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": "off", // 使用TypeScript版本
      
      // 复杂度规则 - P1修复
      "complexity": ["warn", { "max": 10 }],
      "max-lines-per-function": ["warn", { "max": 50 }],
      "max-params": ["warn", { "max": 4 }],
      "max-depth": ["warn", { "max": 4 }],
      "max-nested-callbacks": ["warn", { "max": 3 }],
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
