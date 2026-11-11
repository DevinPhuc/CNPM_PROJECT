(async () => {
  const { api, $, $$, money, esc, toast, variantLabel, requireLogin, refreshCartCount, productCard } = Jewels;
  const id = new URLSearchParams(location.search).get("id");
  const root = $("#productRoot");
  if (!id) { root.innerHTML = '<div class="empty"><h3>Thiếu mã sản phẩm</h3><a class="btn" href="shop.html">Về cửa hàng</a></div>'; return; }

  let p;
  try { p = await api("/products/" + encodeURIComponent(id)); }
  catch (e) { root.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3><a class="btn" href="shop.html">Về cửa hàng</a></div>`; return; }

  document.title = p.name + " - Jewels";
  $("#crumbName").textContent = p.name;
  let variant = p.variants.find((v) => v.stock > 0) || p.variants[0] || null;
  let qty = 1;
  let imgIndex = 0;

  function imageFor(v) {
    const i = p.images.findIndex((img) => v && img.variantId === v.id);
    return i >= 0 ? i : imgIndex;
  }

  function stockHtml(v) {
    if (!v) return '<div class="stock out">Sản phẩm tạm ngừng kinh doanh</div>';
    if (v.stock <= 0) return '<div class="stock out">Hết hàng</div>';
    if (v.stock <= 5) return `<div class="stock low">Chỉ còn ${v.stock} sản phẩm</div>`;
    return `<div class="stock ok">Còn hàng (${v.stock})</div>`;
  }

  function render() {
    const price = variant ? variant.price : p.basePrice;
    const canBuy = variant && variant.stock > 0;
    root.innerHTML = `
      <div class="product">
        <div class="gallery">
          <div class="main"><img id="mainImg" src="${esc(p.images[imgIndex].url)}" alt="${esc(p.name)}"></div>
          ${p.images.length > 1 ? `<div class="thumbs">${p.images.map((im, i) => `<button class="${i === imgIndex ? "active" : ""}" data-img="${i}" aria-label="Ảnh ${i + 1}"><img src="${esc(im.url)}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div class="info">
          <p class="eyebrow">${esc(p.category)}</p>
          <h1>${esc(p.name)}</h1>
          <span class="price">${money(price)}</span>
          <p class="muted">${esc(p.description || "")}</p>
          ${p.variants.length ? `<div class="opt-group"><span>Phiên bản</span><div class="chips">
            ${p.variants.map((v) => `<button class="chip ${variant && v.id === variant.id ? "active" : ""}" data-v="${v.id}" ${v.stock <= 0 ? "disabled" : ""}>${esc(variantLabel(v) || "Tiêu chuẩn")}</button>`).join("")}
          </div></div>` : ""}
          ${stockHtml(variant)}
          <div class="buy-row">
            <div class="qty" aria-label="Số lượng"><button type="button" data-q="-1" aria-label="Giảm">−</button><span id="qtyVal">${qty}</span><button type="button" data-q="1" aria-label="Tăng">+</button></div>
            <button class="btn gold" id="addBtn" ${canBuy ? "" : "disabled"}>Thêm vào giỏ hàng</button>
            <button class="btn outline" id="buyBtn" ${canBuy ? "" : "disabled"}>Mua ngay</button>
          </div>
          <div style="margin-top:24px;padding:16px 20px;background:var(--gold-wash);border-radius:12px;border:1px solid #ebd9b5;display:grid;gap:8px;font-size:0.88rem;color:#5a3f14">
            <div>✨ <b>Cam kết chính hãng:</b> Đầy đủ chứng thư kiểm định kèm theo kiện hàng</div>
            <div>🛡️ <b>Bảo hành trọn đời:</b> Miễn phí làm mới, siêu âm & kiểm tra chấu giữ đá</div>
            <div>🚚 <b>Giao hàng niêm phong:</b> Bảo hiểm vận chuyển 100% giá trị sản phẩm</div>
          </div>
          ${variant ? `<dl class="spec">
            ${variant.material ? `<div><dt>Chất liệu</dt><dd>${esc(variant.material)}</dd></div>` : ""}
            ${variant.gemstone ? `<div><dt>Đá quý</dt><dd>${esc(variant.gemstone)}</dd></div>` : ""}
            ${variant.size != null ? `<div><dt>Kích thước</dt><dd>${variant.size}</dd></div>` : ""}
            ${variant.certificate ? `<div><dt>Mã kiểm định</dt><dd>${esc(variant.certificate)}</dd></div>` : ""}
          </dl>` : ""}
        </div>
      </div>`;
  }

  async function addToCart(goCart) {
    try { await requireLogin(); } catch { return; }
    const btn = $("#addBtn");
    btn.disabled = true;
    try {
      await api("/cart/items", { method: "POST", body: { variantId: variant.id, quantity: qty } });
      await refreshCartCount();
      if (goCart) location.href = "cart.html";
      else toast("Đã thêm vào giỏ hàng", "ok");
    } catch (e) { toast(e.message, "error"); }
    finally { btn.disabled = false; }
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.img) { imgIndex = +t.dataset.img; render(); }
    else if (t.dataset.v) { variant = p.variants.find((v) => v.id === +t.dataset.v); qty = Math.min(qty, variant.stock || 1); imgIndex = imageFor(variant); render(); }
    else if (t.dataset.q) { qty = Math.max(1, Math.min(variant?.stock || 1, qty + +t.dataset.q)); $("#qtyVal").textContent = qty; }
    else if (t.id === "addBtn") addToCart(false);
    else if (t.id === "buyBtn") addToCart(true);
  });

  render();
  if (p.related.length) {
    $("#relatedSection").hidden = false;
    $("#related").innerHTML = p.related.map((r) => productCard({ ...r, category: p.category, maxPrice: r.price })).join("");
  }
})();
