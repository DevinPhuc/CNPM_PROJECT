(() => {
  const { api, $, $$, productCard, esc } = Jewels;
  if (!$("#grid")) return;
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
  let currentRequestId = 0;
  let isFirstLoad = true;

  function syncUrl() {
    const p = new URLSearchParams();
    if (st.cats.length) p.set("cats", st.cats.join(","));
    if (st.prices.length) p.set("prices", st.prices.join(","));
    if (st.q) p.set("q", st.q);
    if (st.sort && st.sort !== "new") p.set("sort", st.sort);
    if (st.page > 1) p.set("page", st.page);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
    sessionStorage.setItem("jewels_last_shop_url", location.href);
  }

  // Khởi tạo giao diện các nút danh mục 1 lần duy nhất (không dựng lại DOM khi lọc)
  function buildCategoryFilters() {
    const roots = categories.filter((c) => !c.parent_cat_id);
    const item = (c, sub) => {
      return `<button data-cat="${c.cat_id}" style="${sub ? "margin-left:14px;font-size:.92em" : ""}">
        <span class="f-check"></span>
        ${sub ? "– " : ""}${esc(c.name)}
      </button>`;
    };

    $("#catFilter").innerHTML =
      `<button data-cat="">
        <span class="f-check"></span>
        Tất cả
      </button>` +
      roots
        .map(
          (r) =>
            item(r) +
            categories
              .filter((c) => String(c.parent_cat_id) === String(r.cat_id))
              .map((c) => item(c, true))
              .join("")
        )
        .join("");
  }

  // Cập nhật trạng thái active & dấu tích trên các nút bộ lọc hiện có (không giật lag)
  function updateFilterStates() {
    // 1. Kiểm tra danh mục: nếu chọn hết tất cả các danh mục hiển thị -> Tự động chuyển về "Tất cả"
    const allCatBtns = Array.from($("#catFilter").querySelectorAll("button[data-cat]"))
      .filter((b) => Boolean(b.dataset.cat));
    const allCatIds = allCatBtns.map((b) => b.dataset.cat);
    if (allCatIds.length > 0 && (st.cats.length >= allCatIds.length || allCatIds.every((id) => st.cats.includes(id)))) {
      st.cats = [];
    }

    const isAllCats = st.cats.length === 0;
    Array.from($("#catFilter").querySelectorAll("button[data-cat]")).forEach((b) => {
      const cid = b.dataset.cat;
      const chk = b.querySelector(".f-check");
      if (!cid) {
        b.classList.toggle("active", isAllCats);
        if (chk) chk.textContent = isAllCats ? "✓" : "";
      } else {
        const isSel = st.cats.includes(cid);
        b.classList.toggle("active", isSel);
        if (chk) chk.textContent = isSel ? "✓" : "";
      }
    });

    // 2. Kiểm tra khoảng giá: nếu chọn hết tất cả các khoảng giá -> Tự động chuyển về "Tất cả"
    const allPriceBtns = Array.from($("#priceFilter").querySelectorAll("button[data-range]"))
      .filter((b) => Boolean(b.dataset.range));
    const allPriceRanges = allPriceBtns.map((b) => b.dataset.range);
    if (allPriceRanges.length > 0 && (st.prices.length >= allPriceRanges.length || allPriceRanges.every((rng) => st.prices.includes(rng)))) {
      st.prices = [];
    }

    const isAllPrices = st.prices.length === 0;
    Array.from($("#priceFilter").querySelectorAll("button[data-range]")).forEach((b) => {
      const r = b.dataset.range;
      const chk = b.querySelector(".f-check");
      if (!r) {
        b.classList.toggle("active", isAllPrices);
        if (chk) chk.textContent = isAllPrices ? "✓" : "";
      } else {
        const isSel = st.prices.includes(r);
        b.classList.toggle("active", isSel);
        if (chk) chk.textContent = isSel ? "✓" : "";
      }
    });

    $("#sortSel").value = st.sort;

    // 3. Tiêu đề trang
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

  // Tải danh sách sản phẩm theo bộ lọc (không giật màn hình, không hiện skeleton khi lọc)
  async function load() {
    const grid = $("#grid");
    if (isFirstLoad) {
      grid.innerHTML = '<div class="skeleton"></div>'.repeat(6);
    } else {
      // Khi lọc: giữ nguyên sản phẩm và làm mờ nhẹ, không tải lại trang hay chớp khung xám
      grid.classList.add("is-filtering");
    }

    const reqId = ++currentRequestId;
    const qs = new URLSearchParams({ sort: st.sort, page: st.page, size: 12 });
    if (st.cats.length) qs.set("cats", st.cats.join(","));
    if (st.prices.length) qs.set("prices", st.prices.join(","));
    if (st.q) qs.set("q", st.q);

    try {
      const data = await api("/products?" + qs);
      if (reqId !== currentRequestId) return; // Bỏ qua nếu có yêu cầu lọc mới hơn

      $("#resultCount").textContent = `${data.total} sản phẩm`;
      grid.innerHTML = data.items.length
        ? data.items.map(productCard).join("")
        : '<div class="empty" style="grid-column:1/-1"><h3>Không tìm thấy sản phẩm phù hợp</h3><p>Thử đổi từ khóa hoặc chọn Tất cả.</p></div>';
      
      $("#pager").innerHTML = data.pages > 1
        ? Array.from({ length: data.pages }, (_, i) => `<button class="${i + 1 === data.page ? "active" : ""}" data-page="${i + 1}">${i + 1}</button>`).join("")
        : "";
    } catch (e) {
      if (reqId !== currentRequestId) return;
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Không tải được sản phẩm</h3><p>${esc(e.message)}</p></div>`;
    } finally {
      if (reqId === currentRequestId) {
        grid.classList.remove("is-filtering");
        isFirstLoad = false;
        syncUrl();
      }
    }
  }

  // Xử lý chọn nhiều danh mục
  $("#catFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const catId = b.dataset.cat;
    const allCatBtns = $$("#catFilter button").filter((btn) => Boolean(btn.dataset.cat));
    const allCatIds = allCatBtns.map((btn) => btn.dataset.cat);

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
      // Nếu đã chọn hết tất cả các danh mục hiển thị -> Tự động nhảy qua "Tất cả"
      if (allCatIds.length > 0 && (st.cats.length >= allCatIds.length || allCatIds.every((id) => st.cats.includes(id)))) {
        st.cats = [];
      }
    }
    st.page = 1;
    updateFilterStates();
    load();
  });

  // Xử lý chọn nhiều khoảng giá
  $("#priceFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const r = b.dataset.range;
    const allPriceBtns = $$("#priceFilter button").filter((btn) => Boolean(btn.dataset.range));
    const allPriceRanges = allPriceBtns.map((btn) => btn.dataset.range);

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
      // Nếu đã chọn hết tất cả các khoảng giá -> Tự động nhảy qua "Tất cả"
      if (allPriceRanges.length > 0 && (st.prices.length >= allPriceRanges.length || allPriceRanges.every((rng) => st.prices.includes(rng)))) {
        st.prices = [];
      }
    }
    st.page = 1;
    updateFilterStates();
    load();
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

  // Nút "Tất cả": Xóa sạch tất cả bộ lọc
  $("#clearFilters").addEventListener("click", () => {
    st.cats = [];
    st.prices = [];
    st.q = "";
    st.sort = "new";
    st.page = 1;
    updateFilterStates();
    load();
  });

  // Khởi chạy ban đầu
  (async () => {
    try {
      categories = await api("/categories");
    } catch {
      categories = [];
    }
    buildCategoryFilters();
    updateFilterStates();
    await load();
  })();

  // Tự động cập nhật sản phẩm khi Admin thay đổi hàng hoặc tồn kho
  document.addEventListener("jewels:catalog-updated", () => {
    load();
  });
})();
