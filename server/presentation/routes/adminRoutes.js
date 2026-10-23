"use strict";

const { createAdminRouter } = require("../../admin-routes");
const { db, JWT_SECRET } = require("../../config/db");
const {
  HttpError,
  wrap,
  must,
  one,
  splitName,
  fullName,
} = require("../../utils/helpers");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { broadcastRealtime } = require("../../realtime");
const unlockRequests = require("../../unlock-requests");

const adminRouter = createAdminRouter({
  db,
  HttpError,
  wrap,
  must,
  one,
  splitName,
  fullName,
  bcrypt,
  jwt,
  JWT_SECRET,
  broadcastRealtime,
  unlockRequests,
});

module.exports = adminRouter;
