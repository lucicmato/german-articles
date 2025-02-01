const express = require("express");
const app = express();
const cors = require('cors');

// Import Database
const Database= require("./config/database");
const NounRouter = require("./routes/Noun.route");

// Database connectivity
Database.connect();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// Register the router
app.use("/api/noun", NounRouter);

//Server
app.listen(process.env.PORT, (error) => {
    console.log(`Server is running on port ${process.env.PORT}`);
});