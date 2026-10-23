"use strict";

const bcrypt = require("bcryptjs");
const userDal = require("../dal/userDal");
const authBll = require("./authBll");
const { HttpError, splitName } = require("../utils/helpers");

class UserBll {
  async updateProfile(userId, { name, phone, dob }) {
    if (String(name || "").trim().length < 2) {
      throw new HttpError(400, "Vui lòng nhập họ tên.");
    }
    const cleanPhone = String(phone || "").trim().replace(/\D/g, "");
    if (phone && !/^\d{10}$/.test(cleanPhone)) {
      throw new HttpError(400, "Số điện thoại phải bao gồm đúng 10 chữ số.");
    }

    await userDal.update(userId, {
      ...splitName(name),
      phone: cleanPhone || null,
    });

    const cust = await userDal.findCustomerByUserId(userId, "user_id");
    if (cust) {
      await userDal.updateCustomer(userId, { dob: dob || null });
    } else {
      await userDal.createCustomer({ user_id: userId, dob: dob || null });
    }

    return await authBll.getPublicUser(userId);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    if (String(newPassword || "").length < 8) {
      throw new HttpError(400, "Mật khẩu mới tối thiểu 8 ký tự.");
    }
    const user = await userDal.findById(userId, "password_hash");
    const ok = await bcrypt.compare(String(currentPassword || ""), user?.password_hash || "");
    if (!ok) {
      throw new HttpError(400, "Mật khẩu hiện tại chưa đúng.");
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await userDal.setPasswordHash(userId, hashed);
    return { ok: true };
  }
}

module.exports = new UserBll();
