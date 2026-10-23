"use strict";

const productDal = require("../dal/productDal");
const { HttpError } = require("../utils/helpers");
const { PLACEHOLDER_IMAGE } = require("../utils/constants");

class ProductBll {
  mainImage(imgs = [], variantId) {
    const found =
      (variantId && imgs.find((i) => i.variant_id === variantId)) ||
      imgs.find((i) => i.is_primary) ||
      imgs[0];
    return found?.image_url || PLACEHOLDER_IMAGE;
  }

  async getCategories() {
    return await productDal.getCategories();
  }

  async getProducts(query) {
    const { cat, cats: multiCats, q, sort = "new", min, max, prices } = query;
    const page = Math.max(1, parseInt(query.page) || 1);
    const size = Math.min(48, parseInt(query.size) || 12);

    let catIds = null;
    const rawCat = multiCats || cat;
    if (rawCat) {
      const rawList = (Array.isArray(rawCat) ? rawCat : String(rawCat).split(","))
        .map((s) => String(s).trim())
        .filter(Boolean);
      if (rawList.length) {
        const allCats = await productDal.getAllActiveCategoriesRaw();
        const set = new Set();
        rawList.forEach((rc) => {
          allCats.forEach((c) => {
            if (String(c.cat_id) === rc || String(c.parent_cat_id) === rc) {
              set.add(c.cat_id);
            }
          });
        });
        catIds = Array.from(set);
      }
    }

    const { data, count } = await productDal.findProducts({
      catIds,
      q,
      min,
      max,
      prices,
      sort,
      page,
      size,
    });

    const images = await productDal.getImagesForProductIds(data.map((p) => p.pro_id));
    const items = data.map((p) => {
      const variants = (p.product_variants || []).filter((v) => v.is_active);
      const prices = variants.map((v) => Number(v.price ?? p.base_price));
      return {
        id: p.pro_id,
        name: p.name,
        category: p.categories?.name || "",
        image: this.mainImage(images[p.pro_id]),
        price: prices.length ? Math.min(...prices) : Number(p.base_price),
        maxPrice: prices.length ? Math.max(...prices) : Number(p.base_price),
        inStock: variants.some((v) => v.stock_quantity > 0),
      };
    });

    return {
      items,
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / size)),
    };
  }

  async getProductDetail(proId) {
    const p = await productDal.findProductDetailById(proId);
    if (!p) throw new HttpError(404, "Không tìm thấy sản phẩm.");

    const [imagesMap, related] = await Promise.all([
      productDal.getImagesForProductIds([p.pro_id]),
      productDal.findRelatedProducts(p.cat_id, p.pro_id, 4),
    ]);

    const images = imagesMap[p.pro_id] || [];
    const relImgs = await productDal.getImagesForProductIds(related.map((r) => r.pro_id));

    return {
      id: p.pro_id,
      name: p.name,
      description: p.description,
      category: p.categories?.name || "",
      catId: p.cat_id,
      basePrice: Number(p.base_price),
      images: images.length
        ? images.map((i) => ({ url: i.image_url, variantId: i.variant_id }))
        : [{ url: PLACEHOLDER_IMAGE, variantId: null }],
      variants: (p.product_variants || []).filter((v) => v.is_active).map((v) => ({
        id: v.variant_id,
        material: v.material,
        gemstone: v.gemstone,
        certificate: v.certificate_code,
        size: v.size === null ? null : Number(v.size),
        price: Number(v.price ?? p.base_price),
        stock: v.stock_quantity || 0,
      })),
      related: related.map((r) => ({
        id: r.pro_id,
        name: r.name,
        price: Number(r.base_price),
        image: this.mainImage(relImgs[r.pro_id]),
      })),
    };
  }

  async checkVariantAvailable(variantId, quantity) {
    const v = await productDal.findVariantById(variantId);
    if (!v || !v.is_active || !v.products?.is_active) {
      throw new HttpError(404, "Sản phẩm không còn kinh doanh.");
    }
    if (v.stock_quantity < quantity) {
      throw new HttpError(400, `Chỉ còn ${v.stock_quantity} sản phẩm trong kho.`);
    }
    return v;
  }
}

module.exports = new ProductBll();
