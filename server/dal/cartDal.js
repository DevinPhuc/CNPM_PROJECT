"use strict";

const { db } = require("../config/db");
const { must, one } = require("../utils/helpers");

class CartDal {
  async getOrCreateCart(customerId) {
    let cart = one(
      must(
        await db
          .from("carts")
          .select("cart_id")
          .eq("customer_id", customerId)
          .limit(1)
      )
    );
    if (!cart) {
      cart = one(
        must(
          await db
            .from("carts")
            .insert({ customer_id: customerId, status: "empty" })
            .select("cart_id")
        )
      );
    }
    return cart.cart_id;
  }

  async getCartItems(cartId) {
    const res = await db
      .from("cart_items")
      .select(
        "cart_item_id,quantity,variant_id,product_variants(variant_id,pro_id,material,gemstone,size,price,stock_quantity,is_active,products(name,is_active))"
      )
      .eq("cart_id", cartId)
      .order("cart_item_id");
    return must(res);
  }

  async findCartItemByVariant(cartId, variantId) {
    const res = await db
      .from("cart_items")
      .select("cart_item_id,quantity")
      .eq("cart_id", cartId)
      .eq("variant_id", variantId)
      .limit(1);
    return one(must(res));
  }

  async findCartItemById(cartItemId, cartId) {
    const res = await db
      .from("cart_items")
      .select("cart_item_id,variant_id")
      .eq("cart_item_id", cartItemId)
      .eq("cart_id", cartId)
      .limit(1);
    return one(must(res));
  }

  async addCartItem(cartId, variantId, quantity) {
    const res = await db
      .from("cart_items")
      .insert({ cart_id: cartId, variant_id: variantId, quantity });
    return must(res);
  }

  async updateCartItemQuantity(cartItemId, quantity) {
    const res = await db
      .from("cart_items")
      .update({ quantity })
      .eq("cart_item_id", cartItemId);
    return must(res);
  }

  async deleteCartItem(cartItemId, cartId) {
    const res = await db
      .from("cart_items")
      .delete()
      .eq("cart_item_id", cartItemId)
      .eq("cart_id", cartId);
    return must(res);
  }

  async clearCartItems(cartId) {
    const res = await db.from("cart_items").delete().eq("cart_id", cartId);
    return must(res);
  }

  async countCartItems(cartId) {
    const res = await db
      .from("cart_items")
      .select("cart_item_id")
      .eq("cart_id", cartId);
    return must(res).length;
  }

  async updateCartStatus(cartId, status) {
    const res = await db
      .from("carts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("cart_id", cartId);
    return must(res);
  }
}

module.exports = new CartDal();
