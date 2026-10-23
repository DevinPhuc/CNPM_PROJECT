"use strict";

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/db");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const must = ({ data, error }) => {
  if (error) throw new HttpError(500, error.message);
  return data;
};

const one = (x) => (Array.isArray(x) ? x[0] : x) || null;

function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  const first = parts.pop() || "";
  return { first_name: first, last_name: parts.join(" ") };
}

const fullName = (u) => `${u?.last_name || ""} ${u?.first_name || ""}`.trim();

const signToken = (id, extra = {}) =>
  jwt.sign({ sub: id, ...extra }, JWT_SECRET, { expiresIn: "7d" });

module.exports = {
  HttpError,
  wrap,
  must,
  one,
  splitName,
  fullName,
  signToken,
};
