module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    "quotes": ["error", "double"],
    "@typescript-eslint/no-explicit-any": "off",
    "indent": ["error", 2]
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files
    "node_modules"
  ]
};