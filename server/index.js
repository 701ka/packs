const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use(express.static(path.join(__dirname, "..")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/packs", require("./routes/packs"));
app.use("/api/admin", require("./routes/admin"));

app.listen(4000, () => console.log("Server running on http://localhost:4000"));
