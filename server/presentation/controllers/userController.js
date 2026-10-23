"use strict";

const authBll = require("../../bll/authBll");
const userBll = require("../../bll/userBll");
const { wrap } = require("../../utils/helpers");

class UserController {
  getMe = wrap(async (req, res) => {
    const user = await authBll.getPublicUser(req.uid);
    res.json(user);
  });

  updateMe = wrap(async (req, res) => {
    const user = await userBll.updateProfile(req.uid, req.body || {});
    res.json(user);
  });

  changePassword = wrap(async (req, res) => {
    const result = await userBll.changePassword(req.uid, req.body || {});
    res.json(result);
  });
}

module.exports = new UserController();
