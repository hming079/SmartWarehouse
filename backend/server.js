const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const routeV1 = require("./src/routes");
const corsConfig = require("./src/config/cors");
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();
app.use((req, res, next) => {
  console.log("---- REQUEST ----");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("-----------------");
  next();
});
app.use(express.json());
app.use(
  cors(corsConfig),
);
const PORT = Number(process.env.PORT) || 5001;
app.use("/api", routeV1);
app.use("/api/v1", routeV1);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
