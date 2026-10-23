"use strict";

const cartBll = require("../../bll/cartBll");
const { wrap } = require("../../utils/helpers");

class CartController {
  getCart = wrap(async (req, res) => {
    const cart = await cartBll.loadCart(req.uid);
    res.json({
      items: cart.lines,
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      count: cart.count,
      freeShippingFrom: cart.freeShippingFrom,
    });
  });

  addItem = wrap(async (req, res) => {
    const result = await cartBll.addItem(req.uid, req.body?.variantId, req.body?.quantity);
    res.status(201).json(result);
  });

  updateItem = wrap(async (req, res) => {
    const result = await cartBll.updateItem(req.uid, req.params.id, req.body?.quantity);
    res.json(result);
  });

  removeItem = wrap(async (req, res) => {
    const result = await cartBll.removeItem(req.uid, req.params.id);
    res.json(result);
  });
}

module.exports = new CartController();
