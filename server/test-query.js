"use strict";

// File tiện ích dùng để test truy vấn trực tiếp trên Console / Terminal
const { db } = require("./config/db");
const userDal = require("./dal/userDal");
const productDal = require("./dal/productDal");
const cartDal = require("./dal/cartDal");
const orderDal = require("./dal/orderDal");

async function main() {
  console.log("=== ĐANG TEST TRUY VẤN TỪ DATA ACCESS LAYER (DAL) ===\n");

  // 1. Test lấy danh mục sản phẩm từ ProductDal
  console.log("1. Lấy danh mục sản phẩm:");
  const categories = await productDal.getCategories();
  console.table(categories.slice(0, 5));

  // 2. Test lấy 3 sản phẩm mới nhất
  console.log("\n2. Lấy 3 sản phẩm mới nhất:");
  const { data: products } = await productDal.findProducts({ page: 1, size: 3 });
  console.table(
    products.map((p) => ({
      ID: p.pro_id,
      Tên: p.name,
      Giá: Number(p.base_price).toLocaleString("vi-VN") + " đ",
    }))
  );

  // 3. Test đếm tổng số người dùng
  console.log("\n3. Đếm số lượng bảng users qua Supabase db client:");
  const { count } = await db.from("users").select("*", { count: "exact", head: true });
  console.log(`=> Tổng số users: ${count}`);

  console.log("\n=== TEST HOÀN TẤT THÀNH CÔNG ===");
}

main().catch(console.error);
