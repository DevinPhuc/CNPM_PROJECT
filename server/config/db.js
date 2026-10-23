"use strict";
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  PORT = 3000
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET) {
  console.error("Thiếu cấu hình: hãy tạo server/.env với SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET.");
  process.exit(1);
}

// Supabase client dùng service_role key để truy xuất dữ liệu theo quyền backend
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = {
  db,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  PORT,
};
