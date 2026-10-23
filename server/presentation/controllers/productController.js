"use strict";

const productBll = require("../../bll/productBll");
const { wrap } = require("../../utils/helpers");

class ProductController {
  getCategories = wrap(async (_req, res) => {
    const data = await productBll.getCategories();
    res.json(data);
  });

  getProducts = wrap(async (req, res) => {
    const result = await productBll.getProducts(req.query || {});
    res.json(result);
  });

  getProductDetail = wrap(async (req, res) => {
    const detail = await productBll.getProductDetail(req.params.id);
    res.json(detail);
  });
}

module.exports = new ProductController();
