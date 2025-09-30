const mongoose = require("mongoose");

beforeAll(async () => {
  // Connection will already have URI from globalSetup
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
  }
});

beforeEach(async () => {
  // Clean all collections between tests
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
