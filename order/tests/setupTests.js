const {
  connect,
  clearDatabase,
  closeDatabase,
} = require("./test-utils/inMemoryMongo");

// Extend timeout for initial Mongo binary download (first run) if needed
jest.setTimeout(30000);

beforeAll(async () => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "testsecret";
  }
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});
