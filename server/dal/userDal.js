"use strict";

const { db } = require("../config/db");
const { must, one } = require("../utils/helpers");

class UserDal {
  async findById(id, fields = "id,email,first_name,last_name,phone,is_active,roles") {
    const res = await db.from("users").select(fields).eq("id", id).limit(1);
    return one(must(res));
  }

  async findByEmail(email, fields = "id,email,password_hash,roles,is_active,first_name,last_name,phone") {
    const res = await db.from("users").select(fields).eq("email", email).limit(1);
    return one(must(res));
  }

  async create(userData) {
    const res = await db.from("users").insert(userData).select("id");
    return one(must(res));
  }

  async update(id, updateData) {
    const res = await db.from("users").update(updateData).eq("id", id);
    return must(res);
  }

  async setPasswordHash(userId, hash) {
    const res = await db.rpc("app_set_password_hash", { p_user_id: userId, p_hash: hash });
    return must(res);
  }

  async findCustomerByUserId(userId, fields = "dob") {
    const res = await db.from("customers").select(fields).eq("user_id", userId).limit(1);
    return one(must(res));
  }

  async upsertCustomer(userId, extra = {}) {
    const res = await db.from("customers").upsert(
      { user_id: userId, ...extra },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
    return must(res);
  }

  async updateCustomer(userId, updateData) {
    const res = await db.from("customers").update(updateData).eq("user_id", userId);
    return must(res);
  }

  async createCustomer(data) {
    const res = await db.from("customers").insert(data);
    return must(res);
  }
}

module.exports = new UserDal();
