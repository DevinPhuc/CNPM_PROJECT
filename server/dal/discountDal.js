"use strict";

const { db } = require("../config/db");
const { must, one } = require("../utils/helpers");

class DiscountDal {
  async findDiscountByCode(code) {
    const res = await db
      .from("discounts")
      .select(
        "discount_id,name,code,begin_date,end_date,is_active,discount_by_voucher(*),discount_by_invoice(*),discount_by_product(*)"
      )
      .ilike("code", code)
      .limit(1);
    return one(must(res));
  }

  async countVoucherUsedByCustomer(customerId, discountId) {
    const res = await db
      .from("orders")
      .select("order_id")
      .eq("customer_id", customerId)
      .eq("discount_id", discountId)
      .neq("status", "cancelled");
    return must(res).length;
  }

  async getVoucherTimesUsed(discountId) {
    const res = await db
      .from("discount_by_voucher")
      .select("times_used")
      .eq("discount_id", discountId)
      .limit(1);
    return one(must(res))?.times_used || 0;
  }

  async updateVoucherTimesUsed(discountId, newTimes) {
    const res = await db
      .from("discount_by_voucher")
      .update({ times_used: newTimes })
      .eq("discount_id", discountId);
    return must(res);
  }
}

module.exports = new DiscountDal();
