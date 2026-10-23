"use strict";

const { db } = require("../config/db");
const { must, one } = require("../utils/helpers");

class OrderDal {
  async createOrder(orderData) {
    const res = await db.from("orders").insert(orderData).select("order_id");
    return one(must(res));
  }

  async createOrderItems(items) {
    const res = await db.from("order_items").insert(items);
    return must(res);
  }

  async createPayment(paymentData) {
    const res = await db.from("payments").insert(paymentData);
    return must(res);
  }

  async deleteOrder(orderId) {
    const res = await db.from("orders").delete().eq("order_id", orderId);
    return must(res);
  }

  async getOrdersByCustomerId(customerId) {
    const res = await db
      .from("orders")
      .select(
        "order_id,order_date,status,total_amount,order_items(product_name,quantity,image_url),payments(method,status)"
      )
      .eq("customer_id", customerId)
      .order("order_date", { ascending: false });
    return must(res);
  }

  async getOrderById(orderId, customerId) {
    const res = await db
      .from("orders")
      .select("*,order_items(*),payments(*),discounts(name,code)")
      .eq("order_id", orderId)
      .eq("customer_id", customerId)
      .limit(1);
    return one(must(res));
  }

  async getOrderForCancel(orderId, customerId) {
    const res = await db
      .from("orders")
      .select("order_id,status,discount_id,order_items(variant_id,quantity)")
      .eq("order_id", orderId)
      .eq("customer_id", customerId)
      .limit(1);
    return one(must(res));
  }

  async updatePaymentStatus(orderId, currentStatus, newStatus) {
    const res = await db
      .from("payments")
      .update({ status: newStatus })
      .eq("order_id", orderId)
      .eq("status", currentStatus);
    return must(res);
  }

  async updateOrderStatus(orderId, status) {
    const res = await db
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("order_id", orderId);
    return must(res);
  }
}

module.exports = new OrderDal();
