// required packages
require("dotenv").config();
const express = require("express");
const cors = require("cors");

//Instance Initialization
const app = express();
const PORT = process.env.PORT || 5000;

//Middleware Setup
app.use(cors());
app.use(express.json());

//Server Run
app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(PORT, () => {
  console.log(`this sever is running on port no : ${PORT}`);
});
