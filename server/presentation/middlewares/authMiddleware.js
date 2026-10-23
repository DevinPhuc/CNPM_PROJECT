"use strict";

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../config/db");
const userDal = require("../../dal/userDal");
const { HttpError, wrap } = require("../../utils/helpers");

const auth = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  let payload;
  try {
    payload = jwt.verify(header.replace(/^Bearer /, ""), JWT_SECRET);
    req.uid = payload.sub;
  } catch {
    throw new HttpError(401, "Vui lòng đăng nhập.");
  }

  const user = await userDal.findById(req.uid, "id,is_active");
  if (!user || !user.is_active) {
    const err = new HttpError(
      403,
      "Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng bấm 'Xin mở lại tài khoản' để gửi yêu cầu hỗ trợ."
    );
    err.isLocked = true;
    throw err;
  }
  next();
});

const adminAuth = wrap(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.replace(/^Bearer /, ""), JWT_SECRET);
      const user = await userDal.findById(payload.sub, "id,email,roles,is_active");
      if (user && user.is_active && (user.roles?.includes("ADMIN") || user.roles?.includes("SALES_STAFF"))) {
        req.adminUser = user;
        return next();
      }
    } catch {}
  }
  next();
});

module.exports = {
  auth,
  adminAuth,
};
