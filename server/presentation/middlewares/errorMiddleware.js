"use strict";

const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const msg = status >= 500 ? "Lỗi máy chủ: " + err.message : err.message;
  res.status(status).json({
    error: msg,
    message: msg,
    isLocked: Boolean(err.isLocked || (msg && msg.toLowerCase().includes("khóa"))),
    unlockStatus: err.unlockStatus || null,
    unlockReason: err.unlockReason || null,
  });
};

module.exports = {
  errorHandler,
};
