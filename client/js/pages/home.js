(() => {
  const { api, $, productCard, esc } = Jewels;
  async function loadHome() {
    try {
      const [cats, prods] = await Promise.all([api("/categories"), api("/products?size=8&sort=new")]);
      $("#catRow").innerHTML = cats.filter((c) => !c.parent_cat_id)
        .map((c) => `<a class="cat-tile" href="shop.html?cat=${c.cat_id}">${esc(c.name)}</a>`).join("");
      $("#featured").innerHTML = prods.items.length
        ? prods.items.map(productCard).join("")
        : '<div class="empty" style="grid-column:1/-1"><h3>Chưa có sản phẩm</h3></div>';
    } catch (e) {
      $("#featured").innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Không tải được dữ liệu</h3><p>${esc(e.message)}</p></div>`;
    }
  }
  loadHome();
  document.addEventListener("jewels:catalog-updated", loadHome);
})();
