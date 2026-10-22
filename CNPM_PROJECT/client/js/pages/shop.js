(() => {
  const { api, $, $$, productCard, esc } = Jewels;
  const params = new URLSearchParams(location.search);

  // Khởi tạo state bộ lọc (hỗ trợ chọn nhiều danh mục và khoảng giá)
  const initialCats = (params.get("cats") || params.get("cat") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const initialPrices = (params.get("prices") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Nếu url có min/max kiểu cũ
  if (!initialPrices.length && (params.get("min") || params.get("max"))) {
    const r = `${params.get("min") || ""}-${params.get("max") || ""}`;
    if (r !== "-") initialPrices.push(r);
  }

  const st = {
    cats: initialCats,       // Mảng các category ID: ['1', '2']
    prices: initialPrices,   // Mảng các khoảng giá: ['0-2000000', '10000000-']
    q: params.get("q") || "",
    sort: params.get("sort") || "new",
    page: 1,
  };

  let categories = [];

  function syncUrl() {
    const p = new URLSearchParams();
    if (st.cats.length) p.set("cats", st.cats.join(","));
    if (st.prices.length) p.set("prices", st.prices.join(","));
    if (st.q) p.set("q", st.q);
    if (st.sort && st.sort !== "new") p.set("sort", st.sort);
    if (st.page > 1) p.set("page", st.page);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  }

  function renderFilters() {
    const roots = categories.filter((c) => !c.parent_cat_id);
    const item = (c, sub) => {
      const isSel = st.cats.includes(String(c.cat_id));
      return `<button data-cat="${c.cat_id}" class="${isSel ? "active" : ""}" style="${sub ? "margin-left:14px;font-size:.92em" : ""}">
        <span class="f-check">${isSel ? "✓" : ""}</span>
        ${sub ? "– " : ""}${esc(c.name)}
      </button>`;
    };

    const isAllCats = st.cats.length === 0;
    $("#catFilter").innerHTML =
      `<button data-cat="" class="${isAllCats ? "active" : ""}">
        <span class="f-check">${isAllCats ? "✓" : ""}</span>
        Tất cả
      </button>` +
      roots
        .map(
          (r) =>
            item(r) +
            categories
              .filter((c) => c.parent_cat_id === r.cat_id)
              .map((c) => item(c, true))
              .join("")
        )
        .join("");

    // Render bộ lọc giá
    const isAllPrices = st.prices.length === 0;
    $$("#priceFilter button").forEach((b) => {
      const r = b.dataset.range;
      if (!r) {
        b.classList.toggle("active", isAllPrices);
        const chk = b.querySelector(".f-check");
        if (chk) chk.textContent = isAllPrices ? "✓" : "";
      } else {
        const isSel = st.prices.includes(r);
        b.classList.toggle("active", isSel);
        const chk = b.querySelector(".f-check");
        if (chk) chk.textContent = isSel ? "✓" : "";
      }
    });

    $("#sortSel").value = st.sort;

    // Tiêu đề trang
    if (st.q) {
      $("#shopTitle").textContent = `Kết quả cho “${st.q}”`;
    } else if (st.cats.length === 1) {
      const c = categories.find((x) => String(x.cat_id) === st.cats[0]);
      $("#shopTitle").textContent = c ? c.name : "Cửa hàng";
    } else if (st.cats.length > 1) {
      const names = st.cats
        .map((id) => categories.find((x) => String(x.cat_id) === id)?.name)
        .filter(Boolean);
      $("#shopTitle").textContent = names.length <= 3 ? names.join(", ") : `Đã chọn (${names.length}) danh mục`;
    } else {
      $("#shopTitle").textContent = "Cửa hàng";
    }
  }

  async function load() {
    $("#grid").innerHTML = '<div class="skeleton"></div>'.repeat(6);
    const qs = new URLSearchParams({ sort: st.sort, page: st.page, size: 12 });
    if (st.cats.length) qs.set("cats", st.cats.join(","));
    if (st.prices.length) qs.set("prices", st.prices.join(","));
    if (st.q) qs.set("q", st.q);

    try {
      const data = await api("/products?" + qs);
      $("#resultCount").textContent = `${data.total} sản phẩm`;
      $("#grid").innerHTML = data.items.length
        ? data.items.map(productCard).join("")
        : '<div class="empty" style="grid-column:1/-1"><h3>Không tìm thấy sản phẩm</h3><p>Thử đổi từ khóa hoặc chọn Tất cả.</p></div>';
      $("#pager").innerHTML = data.pages > 1
        ? Array.from({ length: data.pages }, (_, i) => `<button class="${i + 1 === data.page ? "active" : ""}" data-page="${i + 1}">${i + 1}</button>`).join("")
        : "";
    } catch (e) {
      $("#grid").innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Không tải được sản phẩm</h3><p>${esc(e.message)}</p></div>`;
    }
    syncUrl();
  }

  const refresh = () => { renderFilters(); load(); };

  // Xử lý chọn nhiều danh mục
  $("#catFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const catId = b.dataset.cat;
    if (!catId) {
      // Bấm "Tất cả" -> Xóa hết danh mục đã chọn
      st.cats = [];
    } else {
      // Toggle danh mục: nếu đã có thì bỏ, chưa có thì thêm vào
      const idx = st.cats.indexOf(catId);
      if (idx > -1) {
        st.cats.splice(idx, 1);
      } else {
        st.cats.push(catId);
      }
    }
    st.page = 1;
    refresh();
  });

  // Xử lý chọn nhiều khoảng giá
  $("#priceFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const r = b.dataset.range;
    if (!r) {
      // Bấm "Tất cả" -> Xóa hết khoảng giá đã chọn
      st.prices = [];
    } else {
      // Toggle khoảng giá: nếu đã có thì bỏ, chưa có thì thêm vào
      const idx = st.prices.indexOf(r);
      if (idx > -1) {
        st.prices.splice(idx, 1);
      } else {
        st.prices.push(r);
      }
    }
    st.page = 1;
    refresh();
  });

  $("#sortSel").addEventListener("change", (e) => {
    st.sort = e.target.value;
    st.page = 1;
    load();
  });

  $("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) {
      st.page = +b.dataset.page;
      load();
      scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Nút "Tất cả" (trước đây là "Xóa bộ lọc"): Xóa sạch tất cả bộ lọc
  $("#clearFilters").addEventListener("click", () => {
    st.cats = [];
    st.prices = [];
    st.q = "";
    st.sort = "new";
    st.page = 1;
    refresh();
  });

  (async () => {
    const pCat = api("/categories").then((c) => {
      categories = c;
      renderFilters();
    }).catch(() => { categories = []; });
    const pLoad = load();
    await Promise.all([pCat, pLoad]);
  })();

  // Tự động cập nhật sản phẩm khi Admin thay đổi hàng hoặc tồn kho
  document.addEventListener("jewels:catalog-updated", () => {
    load();
  });
})();
