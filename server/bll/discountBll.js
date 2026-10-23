"use strict";

const discountDal = require("../dal/discountDal");
const { HttpError } = require("../utils/helpers");

class DiscountBll {
  async evaluateCode(code, lines = [], subtotal = 0, customerId) {
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) throw new HttpError(400, "Vui lòng nhập mã giảm giá.");

    const d = await discountDal.findDiscountByCode(clean);
    const today = new Date().toISOString().slice(0, 10);
    if (!d || !d.is_active || (d.begin_date && d.begin_date > today) || (d.end_date && d.end_date < today)) {
      throw new HttpError(400, "Mã giảm giá không hợp lệ hoặc đã hết hạn.");
    }

    const list = (x) => [].concat(x || []).filter(Boolean);
    const voucher = list(d.discount_by_voucher)[0];
    const invoice = list(d.discount_by_invoice)[0];
    const products = list(d.discount_by_product);
    let amount = 0;

    if (voucher) {
      if (voucher.usage_limit != null && voucher.times_used >= voucher.usage_limit) {
        throw new HttpError(400, "Mã giảm giá đã hết lượt sử dụng.");
      }
      if (voucher.limit_per_cus != null) {
        const used = await discountDal.countVoucherUsedByCustomer(customerId, d.discount_id);
        if (used >= voucher.limit_per_cus) {
          throw new HttpError(400, "Bạn đã dùng hết lượt cho mã này.");
        }
      }
      amount = Math.round((subtotal * Number(voucher.discount_percentage)) / 100);
    } else if (invoice) {
      const min = Number(invoice.min_total_price);
      const okCond = invoice.condition_type === "exact" ? subtotal === min : subtotal >= min;
      if (!okCond) {
        throw new HttpError(400, `Mã áp dụng cho đơn từ ${min.toLocaleString("vi-VN")}đ.`);
      }
      amount = Math.round((subtotal * Number(invoice.discount_percentage)) / 100);
    } else if (products.length) {
      products.forEach((rule) => {
        const line = lines.find((l) => l.variantId === rule.variant_id);
        if (line) amount += Math.round((line.subtotal * Number(rule.discount_percentage)) / 100);
      });
      if (!amount) {
        throw new HttpError(400, "Mã chỉ áp dụng cho sản phẩm cụ thể, giỏ hàng chưa có sản phẩm phù hợp.");
      }
    } else {
      throw new HttpError(400, "Mã giảm giá chưa được cấu hình.");
    }

    return {
      discount_id: d.discount_id,
      code: d.code,
      label: d.name,
      amount: Math.min(amount, subtotal),
      voucher: !!voucher,
    };
  }
}

module.exports = new DiscountBll();
