module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.spec.js"],
  verbose: true,
  // Increase timeout for starting in-memory Mongo
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.js"],
};
