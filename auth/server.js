require("dotenv").config();
const app = require("./src/app");
const PORT = process.env.PORT || 3000;
const connectDB = require("./src/db/db");

// connect to the database
connectDB();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
