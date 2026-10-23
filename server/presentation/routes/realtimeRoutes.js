"use strict";

const express = require("express");
const router = express.Router();
const { handleSseConnection } = require("../../realtime");

router.get("/events", handleSseConnection);

module.exports = router;
