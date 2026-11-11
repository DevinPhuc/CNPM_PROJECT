(() => {
  const { api, $, productCard, esc } = Jewels;
  async function loadHome() {
    if (!$("#featured")) return;
    try {
      const [cats, prods] = await Promise.all([api("/categories"), api("/products?size=24&sort=new")]);
      $("#catRow").innerHTML = cats.filter((c) => !c.parent_cat_id)
        .map((c) => `<a class="cat-tile" href="shop.html?cat=${c.cat_id}">${esc(c.name)}</a>`).join("");
      
      // Lọc các sản phẩm còn hàng cho mục Sản phẩm nổi bật (ẩn hoàn toàn sản phẩm hết hàng)
      const inStockFeatured = (prods.items || []).filter((p) => {
        if (p.inStock === false) return false;
        if (typeof p.stock === "number" && p.stock <= 0) return false;
        return true;
      }).slice(0, 8);

      $("#featured").innerHTML = inStockFeatured.length
        ? inStockFeatured.map(productCard).join("")
        : '<div class="empty" style="grid-column:1/-1"><h3>Hiện các sản phẩm nổi bật tạm hết hàng</h3><p>Vui lòng ghé thăm lại sau hoặc xem cửa hàng.</p></div>';
    } catch (e) {
      $("#featured").innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Không tải được dữ liệu</h3><p>${esc(e.message)}</p></div>`;
    }
  }
  loadHome();
  document.addEventListener("jewels:catalog-updated", loadHome);
})();
