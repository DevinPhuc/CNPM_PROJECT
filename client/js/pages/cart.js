(async () => {
  const { api, $, money, esc, toast, variantLabel, refreshCartCount, openAuth, onLogin, ready } = Jewels;
  const root = $("#cartRoot");

  async function load() {
    if (!Jewels.state.user) {
      root.innerHTML = `<div class="empty"><h3>Vui lòng đăng nhập</h3><p>Đăng nhập để xem giỏ hàng và tiếp tục mua sắm.</p><button class="btn" id="goLogin">Đăng nhập / Đăng ký</button></div>`;
      $("#goLogin").addEventListener("click", () => openAuth());
      return;
    }
    try {
      const cart = await api("/cart");
      render(cart);
      refreshCartCount();
    } catch (e) {
      root.innerHTML = `<div class="empty"><h3>Không tải được giỏ hàng</h3><p>${esc(e.message)}</p></div>`;
    }
  }

  function continueShopping(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const lastUrl = sessionStorage.getItem("jewels_last_shop_url");
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin === location.origin && !refUrl.pathname.includes("cart") && !refUrl.pathname.includes("checkout") && !refUrl.pathname.includes("login")) {
          window.history.back();
          return;
        }
      } catch { }
    }
    if (lastUrl && !lastUrl.includes("cart") && !lastUrl.includes("checkout") && !lastUrl.includes("login")) {
      location.href = lastUrl;
      return;
    }
    location.href = "shop.html";
  }

  function render(cart) {
    if (!cart.items.length) {
      root.innerHTML = `<div class="empty"><h3>Giỏ hàng đang trống</h3><p>Hãy chọn cho mình món trang sức ưng ý.</p><a class="btn btn-continue-shopping" href="javascript:void(0)">Tiếp tục mua sắm</a></div>`;
      return;
    }
    const total = cart.subtotal + cart.shipping;
    const blocked = cart.items.some((i) => !i.available || i.quantity > i.stock);
    const remain = cart.freeShippingFrom - cart.subtotal;
    root.innerHTML = `
      <div class="layout-2">
        <section class="panel">
          <h3>Sản phẩm (${cart.count})</h3>
          ${cart.items.map((i) => `
            <article class="line-item ${i.available ? "" : "unavailable"}" data-id="${i.id}">
              <a href="product.html?id=${i.productId}"><img src="${esc(i.image)}" alt="${esc(i.name)}"></a>
              <div>
                <h4><a href="product.html?id=${i.productId}">${esc(i.name)}</a></h4>
                <small>${esc(variantLabel(i))}</small>
                <small>${money(i.price)}</small>
                ${!i.available ? '<span class="warn">Sản phẩm đã hết hàng hoặc ngừng kinh doanh</span>' : i.quantity > i.stock ? `<span class="warn">Chỉ còn ${i.stock} sản phẩm</span>` : ""}
              </div>
              <div class="right">
                <strong class="price">${money(i.subtotal)}</strong>
                <div class="qty"><button data-act="dec" aria-label="Giảm">−</button><input type="number" class="qty-field cart-qty-inp" value="${i.quantity}" min="1" max="${i.stock || 99}"><button data-act="inc" aria-label="Tăng">+</button></div>
                <button class="remove" data-act="rm">Xóa</button>
              </div>
            </article>`).join("")}
          <a class="link-btn btn-continue-shopping" href="javascript:void(0)" style="display:inline-block;margin-top:14px">← Tiếp tục mua sắm</a>
        </section>
        <aside class="panel">
          <h3>Tóm tắt đơn hàng</h3>
          <div class="sum-row"><span>Tạm tính</span><strong>${money(cart.subtotal)}</strong></div>
          <div class="sum-row"><span>Phí vận chuyển</span><strong>${cart.shipping ? money(cart.shipping) : "Miễn phí"}</strong></div>
          <div class="sum-row total"><span>Tổng cộng</span><strong>${money(total)}</strong></div>
          ${remain > 0 ? `<div class="free-ship">Mua thêm <b>${money(remain)}</b> để được miễn phí vận chuyển.</div>` : ""}
          <p class="muted" style="font-size:.85rem">Mã giảm giá có thể nhập ở bước thanh toán.</p>
          <a class="btn gold block" id="checkoutBtn" href="checkout.html" ${blocked ? 'aria-disabled="true" style="opacity:.5;pointer-events:none"' : ""}>Tiến hành thanh toán</a>
          ${blocked ? '<p class="warn" style="margin-top:10px">Vui lòng điều chỉnh các sản phẩm không đủ hàng.</p>' : ""}
        </aside>
      </div>`;
  }

  root.addEventListener("click", async (e) => {
    const contBtn = e.target.closest(".btn-continue-shopping");
    if (contBtn) {
      continueShopping(e);
      return;
    }

    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const row = b.closest(".line-item");
    const id = row.dataset.id;
    const current = +(row.querySelector(".qty input")?.value || row.querySelector(".qty span")?.textContent) || 1;
    try {
      if (b.dataset.act === "rm") await api("/cart/items/" + id, { method: "DELETE" });
      else if (b.dataset.act === "inc") await api("/cart/items/" + id, { method: "PUT", body: { quantity: current + 1 } });
      else if (current > 1) await api("/cart/items/" + id, { method: "PUT", body: { quantity: current - 1 } });
      await load();
    } catch (err) { toast(err.message, "error"); }
  });

  root.addEventListener("change", async (e) => {
    const inp = e.target.closest(".cart-qty-inp");
    if (!inp) return;
    const row = inp.closest(".line-item");
    const id = row.dataset.id;
    let val = parseInt(inp.value) || 1;
    if (val < 1) val = 1;
    try {
      await api("/cart/items/" + id, { method: "PUT", body: { quantity: val } });
      await load();
    } catch (err) {
      toast(err.message, "error");
      await load();
    }
  });

  onLogin(load);
  await ready;
  load();
})();