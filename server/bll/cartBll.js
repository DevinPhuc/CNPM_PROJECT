"use strict";

const cartDal = require("../dal/cartDal");
const productDal = require("../dal/productDal");
const productBll = require("./productBll");
const { HttpError } = require("../utils/helpers");
const { SHIPPING_FEE, FREE_SHIPPING_FROM } = require("../utils/constants");

class CartBll {
  shippingFor(subtotal) {
    return subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  }

  async syncCartStatus(cartId) {
    const count = await cartDal.countCartItems(cartId);
    await cartDal.updateCartStatus(cartId, count ? "active" : "empty");
  }

  async loadCart(customerId) {
    const cartId = await cartDal.getOrCreateCart(customerId);
    const rows = await cartDal.getCartItems(cartId);

    const proIds = [...new Set(rows.map((r) => r.product_variants?.pro_id).filter(Boolean))];
    const images = await productDal.getImagesForProductIds(proIds);

    const lines = rows
      .filter((r) => r.product_variants)
      .map((r) => {
        const v = r.product_variants;
        const available = v.is_active && v.products?.is_active && v.stock_quantity > 0;
        return {
          id: r.cart_item_id,
          variantId: v.variant_id,
          productId: v.pro_id,
          name: v.products?.name || "",
          material: v.material,
          gemstone: v.gemstone,
          size: v.size === null ? null : Number(v.size),
          price: Number(v.price),
          quantity: r.quantity,
          stock: v.stock_quantity || 0,
          available,
          image: productBll.mainImage(images[v.pro_id], v.variant_id),
          subtotal: Number(v.price) * r.quantity,
        };
      });

    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    return {
      cartId,
      lines,
      subtotal,
      shipping: this.shippingFor(subtotal),
      count: lines.reduce((s, l) => s + l.quantity, 0),
      freeShippingFrom: FREE_SHIPPING_FROM,
    };
  }

  async addItem(customerId, variantIdRaw, quantityRaw) {
    const variantId = Number(variantIdRaw);
    const add = Math.max(1, parseInt(quantityRaw) || 1);
    if (!variantId) throw new HttpError(400, "Thiếu biến thể sản phẩm.");

    const cartId = await cartDal.getOrCreateCart(customerId);
    const existing = await cartDal.findCartItemByVariant(cartId, variantId);
    const total = (existing?.quantity || 0) + add;

    await productBll.checkVariantAvailable(variantId, total);

    if (existing) {
      await cartDal.updateCartItemQuantity(existing.cart_item_id, total);
    } else {
      await cartDal.addCartItem(cartId, variantId, add);
    }

    await this.syncCartStatus(cartId);
    return { ok: true };
  }

  async updateItem(customerId, cartItemId, quantityRaw) {
    const quantity = parseInt(quantityRaw);
    if (!(quantity > 0)) throw new HttpError(400, "Số lượng không hợp lệ.");

    const cartId = await cartDal.getOrCreateCart(customerId);
    const item = await cartDal.findCartItemById(cartItemId, cartId);
    if (!item) throw new HttpError(404, "Không tìm thấy sản phẩm trong giỏ.");

    await productBll.checkVariantAvailable(item.variant_id, quantity);
    await cartDal.updateCartItemQuantity(item.cart_item_id, quantity);
    return { ok: true };
  }

  async removeItem(customerId, cartItemId) {
    const cartId = await cartDal.getOrCreateCart(customerId);
    await cartDal.deleteCartItem(cartItemId, cartId);
    await this.syncCartStatus(cartId);
    return { ok: true };
  }
}

module.exports = new CartBll();
