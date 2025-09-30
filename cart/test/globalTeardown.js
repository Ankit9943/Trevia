module.exports = async () => {
  const mongo = global.__MONGO_MEMORY_SERVER__;
  if (mongo) {
    await mongo.stop();
  }
};
