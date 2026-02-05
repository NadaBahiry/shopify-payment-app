module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  ignorePatterns: [
    "build/",
    "node_modules/",
    "extensions/*/dist/",
    ".react-router/",
  ],
  overrides: [
    {
      files: ["*.jsx", "*.tsx"],
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  ],
};
