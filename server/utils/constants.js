"use strict";

const SHIPPING_FEE = 30000;
const FREE_SHIPPING_FROM = 10000000;
const PAYMENT_METHODS = ["cod", "bank_transfer", "e_wallet", "credit_card"];

const ORDER_STATUS_MAP = {
  pending: "Đang chờ duyệt",
  processing: "Đã xác nhận",
  shipped: "Đang giao hàng",
  delivered: "Đã giao thành công",
  cancelled: "Đã hủy",
  returned: "Đã hoàn hàng",
};

const CATEGORIES_CACHE_TTL = 60000; // 60s cache in-memory
const PLACEHOLDER_IMAGE = "https://placehold.co/600x600/png?text=Jewels";

module.exports = {
  SHIPPING_FEE,
  FREE_SHIPPING_FROM,
  PAYMENT_METHODS,
  ORDER_STATUS_MAP,
  CATEGORIES_CACHE_TTL,
  PLACEHOLDER_IMAGE,
};
