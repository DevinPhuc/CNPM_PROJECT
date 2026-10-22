"use strict";

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "unlock-requests.json");

function readRequests() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]), "utf8");
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(content || "[]");
  } catch (err) {
    console.error("Lỗi đọc file unlock-requests.json:", err.message);
    return [];
  }
}

function saveRequests(list) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.error("Lỗi lưu file unlock-requests.json:", err.message);
  }
}

function getRequests() {
  return readRequests();
}

function addOrUpdateUnlockRequest({ userId, email, name, phone, reason = "" }) {
  const list = readRequests();
  const cleanEmail = String(email || "").trim().toLowerCase();
  
  // Kiểm tra xem đã có yêu cầu pending nào cho email này chưa
  const existingIndex = list.findIndex(
    (r) => (r.email?.toLowerCase() === cleanEmail || (userId && r.userId === userId)) && r.status === "pending"
  );

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    // Cập nhật lại thời gian và lý do mới nhất
    list[existingIndex].reason = reason || list[existingIndex].reason;
    list[existingIndex].updatedAt = now;
    if (name) list[existingIndex].name = name;
    if (phone) list[existingIndex].phone = phone;
    saveRequests(list);
    return list[existingIndex];
  }

  const newReq = {
    id: "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    userId: userId || null,
    email: cleanEmail,
    name: name || cleanEmail,
    phone: phone || "",
    reason: String(reason || "").trim() || "Khách hàng yêu cầu mở lại tài khoản qua trang đăng nhập.",
    status: "pending", // pending | approved | rejected
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    resolvedBy: null,
    adminNote: null,
  };

  list.unshift(newReq);
  saveRequests(list);
  return newReq;
}

function resolveRequest(requestId, status = "approved", resolvedBy = "Admin", adminNote = "") {
  const list = readRequests();
  const req = list.find((r) => r.id === requestId);
  if (!req) return null;

  req.status = status;
  req.resolvedAt = new Date().toISOString();
  req.resolvedBy = resolvedBy;
  if (adminNote) req.adminNote = adminNote;

  saveRequests(list);
  return req;
}

function resolveByUserId(userId, status = "approved", resolvedBy = "Admin", email = "") {
  if (!userId && !email) return [];
  const cleanEmail = String(email || "").trim().toLowerCase();
  const list = readRequests();
  let changed = false;
  const resolved = [];

  list.forEach((r) => {
    const matchUser = userId && r.userId === userId;
    const matchEmail = cleanEmail && r.email?.toLowerCase() === cleanEmail;
    if ((matchUser || matchEmail) && r.status === "pending") {
      r.status = status;
      r.resolvedAt = new Date().toISOString();
      r.resolvedBy = resolvedBy;
      changed = true;
      resolved.push(r);
    }
  });

  if (changed) saveRequests(list);
  return resolved;
}

function resolveByEmail(email, status = "approved", resolvedBy = "Admin") {
  if (!email) return [];
  const cleanEmail = String(email).trim().toLowerCase();
  const list = readRequests();
  let changed = false;
  const resolved = [];

  list.forEach((r) => {
    if (r.email?.toLowerCase() === cleanEmail && r.status === "pending") {
      r.status = status;
      r.resolvedAt = new Date().toISOString();
      r.resolvedBy = resolvedBy;
      changed = true;
      resolved.push(r);
    }
  });

  if (changed) saveRequests(list);
  return resolved;
}

function getLatestStatusByEmail(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const list = readRequests();
  return list.find((r) => r.email?.toLowerCase() === cleanEmail) || null;
}

module.exports = {
  getRequests,
  addOrUpdateUnlockRequest,
  resolveRequest,
  resolveByUserId,
  resolveByEmail,
  getLatestStatusByEmail,
};
