"use strict";

const addressBll = require("../../bll/addressBll");
const { wrap } = require("../../utils/helpers");

class AddressController {
  getAddresses = wrap(async (req, res) => {
    const list = await addressBll.getAddresses(req.uid);
    res.json(list);
  });

  createAddress = wrap(async (req, res) => {
    const row = await addressBll.addAddress(req.uid, req.body || {});
    res.status(201).json(row);
  });

  updateAddress = wrap(async (req, res) => {
    const row = await addressBll.updateAddress(req.params.id, req.uid, req.body || {});
    res.json(row);
  });

  deleteAddress = wrap(async (req, res) => {
    const result = await addressBll.deleteAddress(req.params.id, req.uid);
    res.json(result);
  });
}

module.exports = new AddressController();
