const express = require("express");
const router = express.Router();
const Noun = require("../models/Noun");

// Fetch all nouns
router.get("/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const noun = await Noun.findOne({id: id});
        console.log("[Database] Query successful:", noun);

        if (!noun || noun.length === 0) {
            return res.status(404).json({ status: "Error", message: "No nouns found" });
        }

        res.status(200).json({ status: "Success", noun });
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Server error", error: error.message });
    }
});

module.exports = router;
