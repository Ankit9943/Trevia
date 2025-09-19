module.exports = {
  displayName: "product",
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
