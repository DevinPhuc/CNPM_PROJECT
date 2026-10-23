"use strict";

const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const addressController = require("../controllers/addressController");
const productController = require("../controllers/productController");
const cartController = require("../controllers/cartController");
const discountController = require("../controllers/discountController");
const orderController = require("../controllers/orderController");

// ---------- Xác thực ----------
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/request-unlock", authController.requestUnlock);
router.get("/auth/unlock-status", authController.getUnlockStatus);

// ---------- Thông tin cá nhân ----------
router.get("/me", auth, userController.getMe);
router.put("/me", auth, userController.updateMe);
router.put("/me/password", auth, userController.changePassword);

// ---------- Sổ địa chỉ ----------
router.get("/addresses", auth, addressController.getAddresses);
router.post("/addresses", auth, addressController.createAddress);
router.put("/addresses/:id", auth, addressController.updateAddress);
router.delete("/addresses/:id", auth, addressController.deleteAddress);

// ---------- Danh mục & Sản phẩm ----------
router.get("/categories", productController.getCategories);
router.get("/products", productController.getProducts);
router.get("/products/:id", productController.getProductDetail);

// ---------- Giỏ hàng ----------
router.get("/cart", auth, cartController.getCart);
router.post("/cart/items", auth, cartController.addItem);
router.put("/cart/items/:id", auth, cartController.updateItem);
router.delete("/cart/items/:id", auth, cartController.removeItem);

// ---------- Mã giảm giá ----------
router.post("/vouchers/validate", auth, discountController.validateVoucher);

// ---------- Đơn hàng ----------
router.post("/orders", auth, orderController.createOrder);
router.get("/orders", auth, orderController.getMyOrders);
router.get("/orders/:id", auth, orderController.getOrderDetail);
router.post("/orders/:id/cancel", auth, orderController.cancelOrder);

module.exports = router;
