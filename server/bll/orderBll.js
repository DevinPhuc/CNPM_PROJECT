"use strict";

const orderDal = require("../dal/orderDal");
const cartDal = require("../dal/cartDal");
const cartBll = require("./cartBll");
const discountBll = require("./discountBll");
const discountDal = require("../dal/discountDal");
const productDal = require("../dal/productDal");
const userDal = require("../dal/userDal");
const addressDal = require("../dal/addressDal");
const { HttpError, one } = require("../utils/helpers");
const { PAYMENT_METHODS } = require("../utils/constants");
const { broadcastRealtime } = require("../realtime");

class OrderBll {
  async createOrder(customerId, body) {
    const { recipientName, phone, address, addressId, method, code } = body || {};
    if (!PAYMENT_METHODS.includes(method)) {
      throw new HttpError(400, "Phương thức thanh toán không hợp lệ.");
    }

    let cus_name = String(recipientName || "").trim();
    let cus_phone = String(phone || "").trim();
    let cus_address = String(address || "").trim();

    // Hỗ trợ nếu chọn từ sổ địa chỉ có sẵn
    if ((!cus_name || !cus_address) && addressId) {
      const a = await addressDal.findById(addressId, customerId);
      if (a) {
        cus_name = cus_name || a.recipient_name;
        cus_phone = cus_phone || a.phone;
        cus_address = cus_address || a.address_line;
      }
    }

    if (!cus_name) throw new HttpError(400, "Vui lòng nhập họ và tên người nhận hàng.");
    if (!cus_phone) throw new HttpError(400, "Vui lòng nhập số điện thoại người nhận.");
    if (!cus_address) throw new HttpError(400, "Vui lòng nhập địa chỉ nhận hàng.");

    // Đảm bảo tồn tại bản ghi trong bảng customers
    await userDal.upsertCustomer(customerId);

    const cart = await cartBll.loadCart(customerId);
    if (!cart.lines.length) throw new HttpError(400, "Giỏ hàng đang trống.");
    for (const l of cart.lines) {
      if (!l.available || l.quantity > l.stock) {
        throw new HttpError(400, `"${l.name}" không đủ hàng (còn ${l.stock}). Vui lòng cập nhật giỏ hàng.`);
      }
    }

    let discount = null;
    if (code) {
      discount = await discountBll.evaluateCode(code, cart.lines, cart.subtotal, customerId);
    }
    const shipping = cartBll.shippingFor(cart.subtotal);
    const discountAmount = discount?.amount || 0;
    const total = cart.subtotal - discountAmount + shipping;

    const order = await orderDal.createOrder({
      customer_id: customerId,
      discount_id: discount?.discount_id || null,
      cus_name,
      cus_phone,
      address: cus_address,
      status: "pending",
      shipping_fee: shipping,
      discount_amount: discountAmount,
      total_amount: total,
    });

    try {
      await orderDal.createOrderItems(
        cart.lines.map((l) => ({
          order_id: order.order_id,
          variant_id: l.variantId,
          quantity: l.quantity,
          unit_price: l.price,
          subtotal: l.subtotal,
          product_name: l.name,
          material: l.material,
          gemstone: l.gemstone,
          size: l.size,
          image_url: l.image,
        }))
      );
      await orderDal.createPayment({
        order_id: order.order_id,
        method,
        amount: total,
        status: "pending",
      });
    } catch (e) {
      await orderDal.deleteOrder(order.order_id);
      throw e;
    }

    // Trừ kho, tăng lượt dùng voucher, dọn giỏ hàng
    for (const l of cart.lines) {
      await productDal.updateVariantStock(l.variantId, l.stock - l.quantity);
    }
    if (discount?.voucher) {
      const timesUsed = await discountDal.getVoucherTimesUsed(discount.discount_id);
      await discountDal.updateVoucherTimesUsed(discount.discount_id, timesUsed + 1);
    }

    await cartDal.clearCartItems(cart.cartId);
    await cartBll.syncCartStatus(cart.cartId);

    broadcastRealtime("ORDER_CREATED", {
      orderId: order.order_id,
      total,
      customer: cus_name || "Khách hàng",
      phone: cus_phone,
      linesCount: cart.lines.length,
    });

    return { orderId: order.order_id, total };
  }

  async getMyOrders(customerId) {
    const rows = await orderDal.getOrdersByCustomerId(customerId);
    return rows.map((o) => ({
      id: o.order_id,
      date: o.order_date,
      status: o.status,
      total: Number(o.total_amount),
      items: o.order_items || [],
      payment: one(o.payments) || null,
    }));
  }

  async getOrderDetail(orderId, customerId) {
    const o = await orderDal.getOrderById(orderId, customerId);
    if (!o) throw new HttpError(404, "Không tìm thấy đơn hàng.");
    return {
      ...o,
      payment: one(o.payments) || null,
      discount: o.discounts || null,
    };
  }

  async cancelOrder(orderId, customerId) {
    const o = await orderDal.getOrderForCancel(orderId, customerId);
    if (!o) throw new HttpError(404, "Không tìm thấy đơn hàng.");
    if (o.status !== "pending") {
      throw new HttpError(400, "Chỉ có thể hủy đơn đang chờ xác nhận.");
    }

    await orderDal.updatePaymentStatus(o.order_id, "pending", "failed");
    await orderDal.updateOrderStatus(o.order_id, "cancelled");

    // Hoàn trả số lượng tồn kho
    for (const it of o.order_items || []) {
      const v = await productDal.findVariantById(it.variant_id);
      if (v) {
        await productDal.updateVariantStock(it.variant_id, v.stock_quantity + it.quantity);
      }
    }

    // Hoàn lượt dùng voucher nếu có
    if (o.discount_id) {
      const timesUsed = await discountDal.getVoucherTimesUsed(o.discount_id);
      if (timesUsed > 0) {
        await discountDal.updateVoucherTimesUsed(o.discount_id, timesUsed - 1);
      }
    }

    broadcastRealtime("ORDER_CANCELLED", { orderId: o.order_id });
    return { ok: true };
  }
}

module.exports = new OrderBll();
