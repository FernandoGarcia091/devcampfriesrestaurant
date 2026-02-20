/* ===========================
   Accessibility help panel
   (safe on pages that include it)
=========================== */
(() => {
  const link = document.querySelector("#a11yLink");
  const panel = document.querySelector("#a11y-help");
  if (!link || !panel) return;

  const closeTargets = panel.querySelectorAll("[data-a11y-close]");

  function openPanel() {
    panel.hidden = false;
    link.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    panel.hidden = true;
    link.setAttribute("aria-expanded", "false");
    link.focus();
  }

  link.addEventListener("click", (e) => {
    e.preventDefault();
    const isOpen = link.getAttribute("aria-expanded") === "true";
    isOpen ? closePanel() : openPanel();
  });

  closeTargets.forEach((el) => el.addEventListener("click", closePanel));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });
})();


/* ===========================
   CART SYSTEM (Menu + Cart page)
=========================== */
(() => {
  const CART_KEY = "dcff_cart_v1";
  const TAX_RATE = 0.0825; // 8.25% demo tax

  // --------- helpers ----------
  const money = (n) => `$${Number(n).toFixed(2)}`;

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function getCartCount(cart) {
    return cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  }

  function updateCartCountUI() {
    const cart = loadCart();
    const count = getCartCount(cart);

    const headerCount = document.querySelector("#cartCount");
    const footerCount = document.querySelector("#cartCountFooter");

    if (headerCount) headerCount.textContent = `(${count})`;
    if (footerCount) footerCount.textContent = `(${count})`;
  }

  // --------- cart operations ----------
  function addToCart({ id, name, price, qty = 1 }) {
    const cart = loadCart();
    const existing = cart.find((x) => x.id === id);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id,
        name,
        price: Number(price),
        qty
      });
    }

    saveCart(cart);
    updateCartCountUI();
    renderCartPage(); // safe even if not on cart page
  }

  function setQty(id, nextQty) {
    const cart = loadCart();
    const item = cart.find((x) => x.id === id);
    if (!item) return;

    item.qty = Math.max(1, Number(nextQty) || 1);
    saveCart(cart);
    updateCartCountUI();
    renderCartPage();
  }

  function incQty(id) {
    const cart = loadCart();
    const item = cart.find((x) => x.id === id);
    if (!item) return;

    item.qty += 1;
    saveCart(cart);
    updateCartCountUI();
    renderCartPage();
  }

  function decQty(id) {
    const cart = loadCart();
    const item = cart.find((x) => x.id === id);
    if (!item) return;

    item.qty = Math.max(1, item.qty - 1);
    saveCart(cart);
    updateCartCountUI();
    renderCartPage();
  }

  function removeItem(id) {
    const cart = loadCart().filter((x) => x.id !== id);
    saveCart(cart);
    updateCartCountUI();
    renderCartPage();
  }

  function clearCart() {
    saveCart([]);
    updateCartCountUI();
    renderCartPage();
  }

  // --------- bind menu buttons ----------
  function bindAddToCartButtons() {
    const buttons = document.querySelectorAll(".add-to-cart");
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const price = btn.dataset.price;

        if (!id || !name || !price) return;

        addToCart({ id, name, price, qty: 1 });

        // nice little confirmation
        btn.textContent = "Added!";
        setTimeout(() => (btn.textContent = "Add to cart"), 800);
      });
    });
  }

  // --------- render cart page ----------
  function computeTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  function renderCartPage() {
    const cartItemsEl = document.querySelector("#cartItems");
    if (!cartItemsEl) return; // not on cart page

    const subtotalEl = document.querySelector("#subtotal");
    const taxEl = document.querySelector("#tax");
    const totalEl = document.querySelector("#total");

    const cart = loadCart();

    // Empty state
    if (cart.length === 0) {
      cartItemsEl.innerHTML = `
        <div class="cart-empty">
          <p><strong>Your cart is empty.</strong></p>
          <p>Go to the Menu and add some fries 🍟</p>
          <a class="btn" href="menu.html" style="display:inline-block; text-decoration:none;">Browse Menu</a>
        </div>
      `;

      if (subtotalEl) subtotalEl.textContent = money(0);
      if (taxEl) taxEl.textContent = money(0);
      if (totalEl) totalEl.textContent = money(0);
      return;
    }

    // Items
    cartItemsEl.innerHTML = cart
      .map((item) => {
        const lineTotal = item.price * item.qty;

        return `
          <div class="cart-row" data-id="${item.id}">
            <div class="cart-row__left">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price">${money(item.price)} each</div>
            </div>

            <div class="cart-row__right">
              <div class="qty">
                <button type="button" class="qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
                <input class="qty-input" type="number" min="1" value="${item.qty}" data-action="input" aria-label="Quantity for ${item.name}">
                <button type="button" class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
              </div>

              <div class="cart-line-total">${money(lineTotal)}</div>

              <button type="button" class="cart-remove" data-action="remove" aria-label="Remove ${item.name}">
                Remove
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    // Totals
    const totals = computeTotals(cart);
    if (subtotalEl) subtotalEl.textContent = money(totals.subtotal);
    if (taxEl) taxEl.textContent = money(totals.tax);
    if (totalEl) totalEl.textContent = money(totals.total);

    // Row actions (event delegation)
    cartItemsEl.onclick = (e) => {
      const row = e.target.closest(".cart-row");
      if (!row) return;
      const id = row.getAttribute("data-id");
      const action = e.target.getAttribute("data-action");

      if (action === "inc") incQty(id);
      if (action === "dec") decQty(id);
      if (action === "remove") removeItem(id);
    };

    cartItemsEl.oninput = (e) => {
      const row = e.target.closest(".cart-row");
      if (!row) return;
      const id = row.getAttribute("data-id");
      const action = e.target.getAttribute("data-action");

      if (action === "input") {
        setQty(id, e.target.value);
      }
    };
  }

  // --------- checkout ----------
  function bindCheckout() {
    const checkoutBtn = document.querySelector("#checkoutBtn");
    const clearBtn = document.querySelector("#clearCartBtn");
    const messageEl = document.querySelector("#checkoutMessage");

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearCart();
        if (messageEl) {
          messageEl.hidden = true;
          messageEl.textContent = "";
        }
      });
    }

    if (!checkoutBtn) return; // not on cart page

    checkoutBtn.addEventListener("click", () => {
      const cart = loadCart();
      if (cart.length === 0) return;

      const { total } = computeTotals(cart);
      const ok = confirm(`Place order for ${money(total)}?`);
      if (!ok) return;

      const orderNumber = `FRIES-${Math.floor(100000 + Math.random() * 900000)}`;

      clearCart();

      if (messageEl) {
        messageEl.hidden = false;
        messageEl.textContent = `✅ Order placed! Your order number is ${orderNumber}.`;
      }
    });
  }

  // --------- init ----------
  function init() {
    updateCartCountUI();
    bindAddToCartButtons();
    renderCartPage();
    bindCheckout();
  }

  // run when DOM is ready (defer already helps, but safe)
  init();
})();