/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Look for test files
  testMatch: ["**/__tests__/**/*.test.js"],
  // Coverage collection
  collectCoverageFrom: ["src/**/*.js", "!src/db/**"],
  coverageDirectory: "coverage",
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  globalSetup: "<rootDir>/test/globalSetup.js",
  globalTeardown: "<rootDir>/test/globalTeardown.js",
  moduleNameMapper: {
    // Ensure controller relative import '../models/cart.model' resolves to the same file path as tests' '../src/models/cart.model'
    "^.../models/cart.model$": "<rootDir>/src/models/cart.model.js",
  },
};
