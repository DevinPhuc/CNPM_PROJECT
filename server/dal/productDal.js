"use strict";

const { db } = require("../config/db");
const { must, one, HttpError } = require("../utils/helpers");
const { CATEGORIES_CACHE_TTL } = require("../utils/constants");

let cachedCategories = null;
let cachedCategoriesTime = 0;

class ProductDal {
  async getCategories() {
    if (cachedCategories && Date.now() - cachedCategoriesTime < CATEGORIES_CACHE_TTL) {
      return cachedCategories;
    }
    const res = await db
      .from("categories")
      .select("cat_id,name,parent_cat_id")
      .eq("is_active", true)
      .order("cat_id");
    const data = must(res);
    cachedCategories = data;
    cachedCategoriesTime = Date.now();
    return data;
  }

  async getAllActiveCategoriesRaw() {
    const res = await db
      .from("categories")
      .select("cat_id,parent_cat_id")
      .eq("is_active", true);
    return must(res);
  }

  async getImagesForProductIds(proIds) {
    if (!proIds || !proIds.length) return {};
    const res = await db
      .from("product_images")
      .select("pro_id,variant_id,image_url,is_primary")
      .in("pro_id", proIds)
      .order("img_id");
    const rows = must(res);
    const map = {};
    rows.forEach((r) => {
      (map[r.pro_id] ||= []).push(r);
    });
    return map;
  }

  async findProducts({ catIds, q, min, max, prices, sort = "new", page = 1, size = 12 }) {
    let query = db
      .from("products")
      .select(
        "pro_id,cat_id,name,description,base_price,created_at,categories(name),product_variants(variant_id,price,stock_quantity,is_active)",
        { count: "exact" }
      )
      .eq("is_active", true);

    if (catIds) {
      query = catIds.length ? query.in("cat_id", catIds) : query.in("cat_id", [-1]);
    }

    if (q) {
      query = query.ilike("name", `%${String(q).replace(/[%,]/g, " ")}%`);
    }

    if (prices) {
      const rangeList = String(prices).split(",").map((s) => s.trim()).filter(Boolean);
      const orConds = [];
      rangeList.forEach((r) => {
        const parts = r.split("-");
        const rMin = parts[0]?.trim();
        const rMax = parts[1]?.trim();
        if (rMin && rMax) {
          orConds.push(`and(base_price.gte.${Number(rMin)},base_price.lte.${Number(rMax)})`);
        } else if (rMin) {
          orConds.push(`base_price.gte.${Number(rMin)}`);
        } else if (rMax) {
          orConds.push(`base_price.lte.${Number(rMax)}`);
        }
      });
      if (orConds.length) {
        query = query.or(orConds.join(","));
      }
    } else {
      if (min) query = query.gte("base_price", Number(min));
      if (max) query = query.lte("base_price", Number(max));
    }

    const order = {
      new: ["created_at", false],
      "price-asc": ["base_price", true],
      "price-desc": ["base_price", false],
      name: ["name", true],
    }[sort] || ["created_at", false];

    query = query
      .order(order[0], { ascending: order[1] })
      .range((page - 1) * size, page * size - 1);

    const { data, error, count } = await query;
    if (error) throw new HttpError(500, error.message);
    return { data, count: count || 0 };
  }

  async findProductDetailById(proId) {
    const res = await db
      .from("products")
      .select(
        "pro_id,cat_id,name,description,base_price,categories(name),product_variants(variant_id,material,gemstone,certificate_code,size,price,stock_quantity,is_active)"
      )
      .eq("pro_id", proId)
      .eq("is_active", true)
      .limit(1);
    return one(must(res));
  }

  async findRelatedProducts(catId, currentProId, limit = 4) {
    const res = await db
      .from("products")
      .select("pro_id,name,base_price")
      .eq("is_active", true)
      .eq("cat_id", catId)
      .neq("pro_id", currentProId)
      .limit(limit);
    return must(res);
  }

  async findVariantById(variantId) {
    const res = await db
      .from("product_variants")
      .select("variant_id,stock_quantity,is_active,products(is_active)")
      .eq("variant_id", variantId)
      .limit(1);
    return one(must(res));
  }

  async updateVariantStock(variantId, newStock) {
    const res = await db
      .from("product_variants")
      .update({ stock_quantity: newStock })
      .eq("variant_id", variantId);
    return must(res);
  }
}

module.exports = new ProductDal();
