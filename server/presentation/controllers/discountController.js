"use strict";

const cartBll = require("../../bll/cartBll");
const discountBll = require("../../bll/discountBll");
const { wrap } = require("../../utils/helpers");

class DiscountController {
  validateVoucher = wrap(async (req, res) => {
    const cart = await cartBll.loadCart(req.uid);
    const r = await discountBll.evaluateCode(req.body?.code, cart.lines, cart.subtotal, req.uid);
    res.json({ code: r.code, label: r.label, amount: r.amount });
  });
}

module.exports = new DiscountController();
