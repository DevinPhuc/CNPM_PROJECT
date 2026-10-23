"use strict";

const { db } = require("../config/db");
const { must, one } = require("../utils/helpers");

class AddressDal {
  async getByCustomerId(customerId) {
    const res = await db
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("address_id");
    return must(res);
  }

  async countByCustomerId(customerId) {
    const res = await db
      .from("customer_addresses")
      .select("address_id")
      .eq("customer_id", customerId);
    return must(res).length;
  }

  async findById(addressId, customerId) {
    const res = await db
      .from("customer_addresses")
      .select("*")
      .eq("address_id", addressId)
      .eq("customer_id", customerId)
      .limit(1);
    return one(must(res));
  }

  async create(data) {
    const res = await db.from("customer_addresses").insert(data).select();
    return one(must(res));
  }

  async update(addressId, customerId, data) {
    const res = await db
      .from("customer_addresses")
      .update(data)
      .eq("address_id", addressId)
      .eq("customer_id", customerId)
      .select();
    return one(must(res));
  }

  async delete(addressId, customerId) {
    const res = await db
      .from("customer_addresses")
      .delete()
      .eq("address_id", addressId)
      .eq("customer_id", customerId);
    return must(res);
  }

  async clearDefault(customerId, exceptId) {
    let q = db
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId);
    if (exceptId) q = q.neq("address_id", exceptId);
    return must(await q);
  }
}

module.exports = new AddressDal();
