"use strict";

const addressDal = require("../dal/addressDal");
const userDal = require("../dal/userDal");
const { HttpError } = require("../utils/helpers");

class AddressBll {
  validateAddressBody(body) {
    const recipient_name = String(body?.recipient_name || "").trim();
    const phone = String(body?.phone || "").trim();
    const address_line = String(body?.address_line || "").trim();
    if (!recipient_name) throw new HttpError(400, "Vui lòng nhập họ và tên người nhận.");
    if (!phone) throw new HttpError(400, "Vui lòng nhập số điện thoại nhận hàng.");
    if (!/^[0-9+\s.-]{3,20}$/.test(phone)) {
      throw new HttpError(400, "Số điện thoại không hợp lệ (ví dụ: 090 123 4567).");
    }
    if (!address_line) throw new HttpError(400, "Vui lòng nhập địa chỉ nhận hàng (số nhà, đường, phường/xã...).");
    return { recipient_name, phone, address_line, is_default: !!body?.is_default };
  }

  async getAddresses(customerId) {
    return await addressDal.getByCustomerId(customerId);
  }

  async addAddress(customerId, body) {
    const data = this.validateAddressBody(body);
    // Đảm bảo tồn tại bản ghi trong customers
    await userDal.upsertCustomer(customerId);
    const count = await addressDal.countByCustomerId(customerId);
    if (count === 0) data.is_default = true;

    const row = await addressDal.create({ ...data, customer_id: customerId });
    if (data.is_default) {
      await addressDal.clearDefault(customerId, row.address_id);
    }
    return row;
  }

  async updateAddress(addressId, customerId, body) {
    const data = this.validateAddressBody(body);
    const row = await addressDal.update(addressId, customerId, data);
    if (!row) throw new HttpError(404, "Không tìm thấy địa chỉ.");
    if (data.is_default) {
      await addressDal.clearDefault(customerId, row.address_id);
    }
    return row;
  }

  async deleteAddress(addressId, customerId) {
    await addressDal.delete(addressId, customerId);
    return { ok: true };
  }
}

module.exports = new AddressBll();
