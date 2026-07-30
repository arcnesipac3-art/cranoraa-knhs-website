{
  "extends": ["eslint-config-prettier"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react", "@typescript-eslint", "react-native"],
  "rules": {
    "quotes": ["error", "single", { "avoidEscape": true, "allowTemplateLiterals": true }],
    "semi": ["error", "never"],
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "react-hooks/exhaustive-deps": "error",
    "no-console": ["warn", { "allow": ["error"] }]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}