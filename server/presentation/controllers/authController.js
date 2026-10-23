"use strict";

const authBll = require("../../bll/authBll");
const { wrap } = require("../../utils/helpers");

class AuthController {
  register = wrap(async (req, res) => {
    const result = await authBll.register(req.body || {});
    res.status(201).json(result);
  });

  login = wrap(async (req, res) => {
    const result = await authBll.login(req.body || {});
    res.json(result);
  });

  requestUnlock = wrap(async (req, res) => {
    const result = await authBll.requestUnlock(req.body || {});
    res.json(result);
  });

  getUnlockStatus = wrap(async (req, res) => {
    const result = await authBll.getUnlockStatus(req.query?.email);
    res.json(result);
  });
}

module.exports = new AuthController();
