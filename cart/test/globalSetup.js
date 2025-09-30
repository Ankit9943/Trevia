const { MongoMemoryServer } = require("mongodb-memory-server");

module.exports = async () => {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  global.__MONGO_MEMORY_SERVER__ = mongo;
  process.env.MONGO_URI = uri;
};
