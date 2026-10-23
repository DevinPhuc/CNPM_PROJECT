"use strict";

const orderBll = require("../../bll/orderBll");
const { wrap } = require("../../utils/helpers");

class OrderController {
  createOrder = wrap(async (req, res) => {
    const result = await orderBll.createOrder(req.uid, req.body || {});
    res.status(201).json(result);
  });

  getMyOrders = wrap(async (req, res) => {
    const orders = await orderBll.getMyOrders(req.uid);
    res.json(orders);
  });

  getOrderDetail = wrap(async (req, res) => {
    const detail = await orderBll.getOrderDetail(req.params.id, req.uid);
    res.json(detail);
  });

  cancelOrder = wrap(async (req, res) => {
    const result = await orderBll.cancelOrder(req.params.id, req.uid);
    res.json(result);
  });
}

module.exports = new OrderController();
