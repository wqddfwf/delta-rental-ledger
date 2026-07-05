const STORAGE_KEY = "deltaRentalLedger.v1";
const GITHUB_KEY = "deltaRentalLedger.github.v1";
const PLATFORM_FEE_RATE = 0.015;

const accountStatuses = ["正在生产", "可出租", "正在出租", "下架停租"];

const state = {
  data: createEmptyData(),
  filters: {
    accountSearch: "",
    orderSearch: "",
    orderStatus: "all",
    renterSearch: "",
  },
  github: {
    owner: "",
    repo: "",
    branch: "main",
    path: "data/ledger-data.json",
    token: "",
  },
  activeView: "dashboard",
  cloudSha: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  loadLocalData();
  loadGithubConfig();
  bindEvents();
  renderAll();
  logSync("页面已打开，本地数据已载入。");
});

function cacheElements() {
  Object.assign(els, {
    navTabs: document.querySelectorAll(".nav-tab"),
    views: document.querySelectorAll(".view"),
    viewTitle: document.getElementById("viewTitle"),
    syncDot: document.getElementById("syncDot"),
    syncStatus: document.getElementById("syncStatus"),
    syncMeta: document.getElementById("syncMeta"),
    metricProfit: document.getElementById("metricProfit"),
    metricAvailable: document.getElementById("metricAvailable"),
    metricActiveOrders: document.getElementById("metricActiveOrders"),
    metricRenters: document.getElementById("metricRenters"),
    recentOrdersBody: document.getElementById("recentOrdersBody"),
    accountStatusList: document.getElementById("accountStatusList"),
    accountsBody: document.getElementById("accountsBody"),
    ordersBody: document.getElementById("ordersBody"),
    rentersBody: document.getElementById("rentersBody"),
    accountSearch: document.getElementById("accountSearch"),
    orderSearch: document.getElementById("orderSearch"),
    orderStatusFilter: document.getElementById("orderStatusFilter"),
    renterSearch: document.getElementById("renterSearch"),
    addAccountBtn: document.getElementById("addAccountBtn"),
    addOrderBtn: document.getElementById("addOrderBtn"),
    quickAddOrderBtn: document.getElementById("quickAddOrderBtn"),
    addRenterBtn: document.getElementById("addRenterBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFileInput: document.getElementById("importFileInput"),
    accountDialog: document.getElementById("accountDialog"),
    accountForm: document.getElementById("accountForm"),
    accountDialogTitle: document.getElementById("accountDialogTitle"),
    accountInternalId: document.getElementById("accountInternalId"),
    accountIdInput: document.getElementById("accountIdInput"),
    accountGameInput: document.getElementById("accountGameInput"),
    accountStatusInput: document.getElementById("accountStatusInput"),
    orderDialog: document.getElementById("orderDialog"),
    orderForm: document.getElementById("orderForm"),
    orderDialogTitle: document.getElementById("orderDialogTitle"),
    orderInternalId: document.getElementById("orderInternalId"),
    orderIdInput: document.getElementById("orderIdInput"),
    orderAccountInput: document.getElementById("orderAccountInput"),
    orderGameInput: document.getElementById("orderGameInput"),
    orderRenterInput: document.getElementById("orderRenterInput"),
    orderPriceInput: document.getElementById("orderPriceInput"),
    orderCoinAmountInput: document.getElementById("orderCoinAmountInput"),
    orderCoinUnitInput: document.getElementById("orderCoinUnitInput"),
    orderDaysInput: document.getElementById("orderDaysInput"),
    orderReceivedInput: document.getElementById("orderReceivedInput"),
    orderDepositInput: document.getElementById("orderDepositInput"),
    orderStatusInput: document.getElementById("orderStatusInput"),
    orderProfitPreview: document.getElementById("orderProfitPreview"),
    renterDialog: document.getElementById("renterDialog"),
    renterForm: document.getElementById("renterForm"),
    renterDialogTitle: document.getElementById("renterDialogTitle"),
    renterInternalId: document.getElementById("renterInternalId"),
    renterNameInput: document.getElementById("renterNameInput"),
    renterNoteInput: document.getElementById("renterNoteInput"),
    renterNameList: document.getElementById("renterNameList"),
    githubOwner: document.getElementById("githubOwner"),
    githubRepo: document.getElementById("githubRepo"),
    githubBranch: document.getElementById("githubBranch"),
    githubPath: document.getElementById("githubPath"),
    githubToken: document.getElementById("githubToken"),
    syncForm: document.getElementById("syncForm"),
    loadCloudBtn: document.getElementById("loadCloudBtn"),
    saveCloudBtn: document.getElementById("saveCloudBtn"),
    clearTokenBtn: document.getElementById("clearTokenBtn"),
    syncLog: document.getElementById("syncLog"),
    toastHost: document.getElementById("toastHost"),
  });
}

function bindEvents() {
  els.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewLink));
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest("dialog")?.close();
    });
  });

  els.accountSearch.addEventListener("input", (event) => {
    state.filters.accountSearch = event.target.value.trim();
    renderAccounts();
  });

  els.orderSearch.addEventListener("input", (event) => {
    state.filters.orderSearch = event.target.value.trim();
    renderOrders();
  });

  els.orderStatusFilter.addEventListener("change", (event) => {
    state.filters.orderStatus = event.target.value;
    renderOrders();
  });

  els.renterSearch.addEventListener("input", (event) => {
    state.filters.renterSearch = event.target.value.trim();
    renderRenters();
  });

  els.addAccountBtn.addEventListener("click", () => openAccountDialog());
  els.addOrderBtn.addEventListener("click", () => openOrderDialog());
  els.quickAddOrderBtn.addEventListener("click", () => {
    switchView("orders");
    openOrderDialog();
  });
  els.addRenterBtn.addEventListener("click", () => openRenterDialog());

  els.accountForm.addEventListener("submit", saveAccountFromForm);
  els.orderForm.addEventListener("submit", saveOrderFromForm);
  els.renterForm.addEventListener("submit", saveRenterFromForm);

  [
    els.orderPriceInput,
    els.orderReceivedInput,
    els.orderDepositInput,
    els.orderDaysInput,
  ].forEach((input) => input.addEventListener("input", updateOrderProfitPreview));

  els.orderAccountInput.addEventListener("change", fillGameFromSelectedAccount);
  els.exportBtn.addEventListener("click", exportJson);
  els.importBtn.addEventListener("click", () => els.importFileInput.click());
  els.importFileInput.addEventListener("change", importJson);

  els.syncForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveGithubConfigFromForm();
  });
  els.loadCloudBtn.addEventListener("click", loadFromGithub);
  els.saveCloudBtn.addEventListener("click", saveToGithub);
  els.clearTokenBtn.addEventListener("click", clearGithubToken);
}

function createEmptyData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    accounts: [],
    orders: [],
    renters: [],
  };
}

function loadLocalData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.data = createEmptyData();
    return;
  }

  try {
    state.data = normalizeData(JSON.parse(raw));
  } catch (error) {
    console.error(error);
    state.data = createEmptyData();
    toast("本地数据解析失败，已打开空账本。", true);
  }
}

function saveLocalData() {
  state.data.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  updateSyncStatus("ok", "本地已保存", formatDateTime(state.data.updatedAt));
}

function normalizeData(input) {
  const data = {
    version: Number(input?.version) || 1,
    updatedAt: input?.updatedAt || new Date().toISOString(),
    accounts: Array.isArray(input?.accounts) ? input.accounts : [],
    orders: Array.isArray(input?.orders) ? input.orders : [],
    renters: Array.isArray(input?.renters) ? input.renters : [],
  };

  data.accounts = data.accounts.map((account) => ({
    id: account.id || uid(),
    accountId: String(account.accountId || "").trim(),
    gameName: String(account.gameName || "三角洲行动").trim(),
    status: accountStatuses.includes(account.status) ? account.status : "可出租",
  }));

  data.orders = data.orders.map((order) => ({
    id: order.id || uid(),
    orderId: String(order.orderId || nextOrderId()).trim(),
    accountRef: order.accountRef || "",
    gameName: String(order.gameName || "三角洲行动").trim(),
    renterName: String(order.renterName || "").trim(),
    price: toNumber(order.price),
    coinAmount: toNumber(order.coinAmount),
    coinUnit: order.coinUnit === "M" ? "M" : "W",
    days: toNumber(order.days),
    receivedAmount: toNumber(order.receivedAmount),
    deposit: toNumber(order.deposit),
    status: order.status === "已结束" ? "已结束" : "进行中",
    createdAt: order.createdAt || new Date().toISOString(),
  }));

  data.renters = data.renters.map((renter) => ({
    id: renter.id || uid(),
    name: String(renter.name || "").trim(),
    note: String(renter.note || "").trim(),
  }));

  return data;
}

function switchView(viewName) {
  state.activeView = viewName;
  els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.views.forEach((view) => {
    const active = view.id === `${viewName}View`;
    view.classList.toggle("active", active);
    if (active) {
      els.viewTitle.textContent = view.dataset.title;
    }
  });
}

function renderAll() {
  renderGithubForm();
  renderAccountOptions();
  renderRenterDatalist();
  renderDashboard();
  renderAccounts();
  renderOrders();
  renderRenters();
}

function renderDashboard() {
  const profit = state.data.orders.reduce((sum, order) => sum + getOrderProfit(order), 0);
  const available = state.data.accounts.filter((account) => account.status === "可出租").length;
  const activeOrders = state.data.orders.filter((order) => order.status === "进行中").length;

  els.metricProfit.textContent = money(profit);
  els.metricAvailable.textContent = available;
  els.metricActiveOrders.textContent = activeOrders;
  els.metricRenters.textContent = getRenterStats().length;

  const recent = [...state.data.orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  if (recent.length === 0) {
    els.recentOrdersBody.innerHTML = emptyRow(5, "还没有订单，新增一笔后这里会显示最近记录。");
  } else {
    els.recentOrdersBody.innerHTML = recent
      .map(
        (order) => `
          <tr>
            <td>${escapeHtml(order.orderId)}</td>
            <td>${escapeHtml(order.renterName)}</td>
            <td>${escapeHtml(order.gameName)}</td>
            <td class="money">${money(getOrderProfit(order))}</td>
            <td>${orderStatusTag(order.status)}</td>
          </tr>
        `,
      )
      .join("");
  }

  const totalAccounts = Math.max(state.data.accounts.length, 1);
  els.accountStatusList.innerHTML = accountStatuses
    .map((status) => {
      const count = state.data.accounts.filter((account) => account.status === status).length;
      const percent = Math.round((count / totalAccounts) * 100);
      return `
        <div class="status-item">
          <div>
            <div class="status-label">${status} · ${count}</div>
            <div class="status-bar"><span style="width:${percent}%"></span></div>
          </div>
          ${accountStatusTag(status)}
        </div>
      `;
    })
    .join("");
}

function renderAccounts() {
  const query = state.filters.accountSearch.toLowerCase();
  const accounts = state.data.accounts.filter((account) => {
    return [account.accountId, account.gameName, account.status].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  if (accounts.length === 0) {
    els.accountsBody.innerHTML = emptyRow(5, "暂无帐号库存。");
    return;
  }

  els.accountsBody.innerHTML = accounts
    .map(
      (account) => `
        <tr>
          <td>${escapeHtml(account.accountId)}</td>
          <td>${escapeHtml(account.gameName)}</td>
          <td>${accountStatusTag(account.status)}</td>
          <td class="money">${money(getAccountRevenue(account.id))}</td>
          <td>
            <div class="row-actions">
              <button class="table-action" type="button" onclick="openAccountDialog('${account.id}')">编辑</button>
              <button class="table-action delete" type="button" onclick="deleteAccount('${account.id}')">删除</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderOrders() {
  const query = state.filters.orderSearch.toLowerCase();
  const orders = [...state.data.orders]
    .filter((order) => {
      const statusMatch = state.filters.orderStatus === "all" || order.status === state.filters.orderStatus;
      const searchMatch = [
        order.orderId,
        order.gameName,
        order.renterName,
        getAccountLabel(order.accountRef),
        order.status,
      ].some((value) => String(value).toLowerCase().includes(query));
      return statusMatch && searchMatch;
    })
    .sort((a, b) => String(b.orderId).localeCompare(String(a.orderId), "zh-CN"));

  if (orders.length === 0) {
    els.ordersBody.innerHTML = emptyRow(12, "暂无出租订单。");
    return;
  }

  els.ordersBody.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td>${escapeHtml(order.orderId)}</td>
          <td>${escapeHtml(getAccountLabel(order.accountRef) || "未绑定")}</td>
          <td>${escapeHtml(order.gameName)}</td>
          <td>${escapeHtml(order.renterName)}</td>
          <td class="money">${money(order.price)}</td>
          <td>${formatCoin(order)}</td>
          <td>${formatNumber(order.days)} 天</td>
          <td class="money">${money(order.receivedAmount)}</td>
          <td class="money">${money(order.deposit)}</td>
          <td class="money">${money(getOrderProfit(order))}</td>
          <td>${orderStatusTag(order.status)}</td>
          <td>
            <div class="row-actions">
              <button class="table-action" type="button" onclick="openOrderDialog('${order.id}')">编辑</button>
              <button class="table-action delete" type="button" onclick="deleteOrder('${order.id}')">删除</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderRenters() {
  const query = state.filters.renterSearch.toLowerCase();
  const renters = getRenterStats().filter((renter) => {
    return [renter.name, renter.note, renter.tag].some((value) =>
      String(value).toLowerCase().includes(query),
    );
  });

  if (renters.length === 0) {
    els.rentersBody.innerHTML = emptyRow(6, "暂无租客记录。");
    return;
  }

  els.rentersBody.innerHTML = renters
    .map(
      (renter) => `
        <tr>
          <td>${escapeHtml(renter.name)}</td>
          <td>${renter.rentalCount}</td>
          <td class="money">${money(renter.spending)}</td>
          <td>${renterTag(renter.tag)}</td>
          <td class="muted">${escapeHtml(renter.note || "-")}</td>
          <td>
            <div class="row-actions">
              <button class="table-action" type="button" onclick="openRenterDialog('${renter.id}')">编辑</button>
              <button class="table-action delete" type="button" onclick="deleteRenter('${renter.id}')">删除</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function openAccountDialog(id = "") {
  const account = state.data.accounts.find((item) => item.id === id);
  els.accountDialogTitle.textContent = account ? "编辑帐号" : "新增帐号";
  els.accountInternalId.value = account?.id || "";
  els.accountIdInput.value = account?.accountId || "";
  els.accountGameInput.value = account?.gameName || "三角洲行动";
  els.accountStatusInput.value = account?.status || "可出租";
  openDialog(els.accountDialog);
}

function saveAccountFromForm(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.accountDialog.close();
    return;
  }

  const accountId = els.accountIdInput.value.trim();
  const gameName = els.accountGameInput.value.trim();
  const status = els.accountStatusInput.value;
  const id = els.accountInternalId.value;

  if (!accountId || !gameName) {
    toast("帐号ID和游戏名称不能为空。", true);
    return;
  }

  const duplicate = state.data.accounts.some(
    (account) => account.accountId === accountId && account.id !== id,
  );
  if (duplicate) {
    toast("帐号ID已存在。", true);
    return;
  }

  if (id) {
    const account = state.data.accounts.find((item) => item.id === id);
    if (account) {
      account.accountId = accountId;
      account.gameName = gameName;
      account.status = status;
    }
  } else {
    state.data.accounts.push({ id: uid(), accountId, gameName, status });
  }

  saveAndRender("帐号已保存。");
  els.accountDialog.close();
}

function deleteAccount(id) {
  const account = state.data.accounts.find((item) => item.id === id);
  if (!account) return;

  const hasOrders = state.data.orders.some((order) => order.accountRef === id);
  const message = hasOrders
    ? "此帐号有关联订单，删除后订单会变成未绑定。确认删除？"
    : "确认删除此帐号？";
  if (!confirm(message)) return;

  state.data.accounts = state.data.accounts.filter((item) => item.id !== id);
  state.data.orders.forEach((order) => {
    if (order.accountRef === id) {
      order.accountRef = "";
    }
  });
  saveAndRender("帐号已删除。");
}

function openOrderDialog(id = "") {
  renderAccountOptions();
  const order = state.data.orders.find((item) => item.id === id);
  els.orderDialogTitle.textContent = order ? "编辑订单" : "新增订单";
  els.orderInternalId.value = order?.id || "";
  els.orderIdInput.value = order?.orderId || nextOrderId();
  els.orderAccountInput.value = order?.accountRef || "";
  els.orderGameInput.value = order?.gameName || getDefaultGameName();
  els.orderRenterInput.value = order?.renterName || "";
  els.orderPriceInput.value = order?.price || "";
  els.orderCoinAmountInput.value = order?.coinAmount || "";
  els.orderCoinUnitInput.value = order?.coinUnit || "W";
  els.orderDaysInput.value = order?.days || 1;
  els.orderReceivedInput.value = order?.receivedAmount || "";
  els.orderDepositInput.value = order?.deposit || "";
  els.orderStatusInput.value = order?.status || "进行中";
  updateOrderProfitPreview();
  openDialog(els.orderDialog);
}

function saveOrderFromForm(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.orderDialog.close();
    return;
  }

  const id = els.orderInternalId.value;
  const orderId = els.orderIdInput.value.trim();
  const renterName = els.orderRenterInput.value.trim();
  const gameName = els.orderGameInput.value.trim();
  const price = toNumber(els.orderPriceInput.value);
  const receivedAmount = toNumber(els.orderReceivedInput.value);
  const days = toNumber(els.orderDaysInput.value);

  if (!orderId || !renterName || !gameName) {
    toast("订单ID、游戏名称和租客不能为空。", true);
    return;
  }

  if (price < 0 || receivedAmount < 0 || days <= 0) {
    toast("价格、实收金额和出租天数需要填写有效数字。", true);
    return;
  }

  const duplicate = state.data.orders.some((order) => order.orderId === orderId && order.id !== id);
  if (duplicate) {
    toast("订单ID已存在。", true);
    return;
  }

  const payload = {
    orderId,
    accountRef: els.orderAccountInput.value,
    gameName,
    renterName,
    price,
    coinAmount: toNumber(els.orderCoinAmountInput.value),
    coinUnit: els.orderCoinUnitInput.value,
    days,
    receivedAmount,
    deposit: toNumber(els.orderDepositInput.value),
    status: els.orderStatusInput.value,
  };

  if (id) {
    const order = state.data.orders.find((item) => item.id === id);
    if (order) Object.assign(order, payload);
  } else {
    state.data.orders.push({
      id: uid(),
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }

  ensureRenter(renterName);
  updateAccountStatusFromOrders();
  saveAndRender("订单已保存。");
  els.orderDialog.close();
}

function deleteOrder(id) {
  if (!confirm("确认删除此订单？")) return;
  state.data.orders = state.data.orders.filter((order) => order.id !== id);
  updateAccountStatusFromOrders();
  saveAndRender("订单已删除。");
}

function openRenterDialog(id = "") {
  const renter = state.data.renters.find((item) => item.id === id);
  const virtualName = id.startsWith("virtual-") ? id.replace("virtual-", "") : "";
  els.renterDialogTitle.textContent = renter ? "编辑租客" : "新增租客";
  els.renterInternalId.value = renter?.id || "";
  els.renterNameInput.value = renter?.name || virtualName;
  els.renterNoteInput.value = renter?.note || "";
  openDialog(els.renterDialog);
}

function saveRenterFromForm(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.renterDialog.close();
    return;
  }

  const id = els.renterInternalId.value;
  const name = els.renterNameInput.value.trim();
  const note = els.renterNoteInput.value.trim();

  if (!name) {
    toast("租客名称不能为空。", true);
    return;
  }

  const duplicate = state.data.renters.some((renter) => renter.name === name && renter.id !== id);
  if (duplicate) {
    toast("租客已存在。", true);
    return;
  }

  if (id) {
    const renter = state.data.renters.find((item) => item.id === id);
    if (renter) {
      const oldName = renter.name;
      renter.name = name;
      renter.note = note;
      if (oldName !== name && confirm("是否同步修改历史订单中的租客名称？")) {
        state.data.orders.forEach((order) => {
          if (order.renterName === oldName) order.renterName = name;
        });
      }
    }
  } else {
    state.data.renters.push({ id: uid(), name, note });
  }

  saveAndRender("租客已保存。");
  els.renterDialog.close();
}

function deleteRenter(id) {
  const renter = state.data.renters.find((item) => item.id === id);
  if (!renter) return;
  const hasOrders = state.data.orders.some((order) => order.renterName === renter.name);
  const message = hasOrders
    ? "此租客已有历史订单，删除后订单仍保留租客名称。确认删除？"
    : "确认删除此租客？";
  if (!confirm(message)) return;

  state.data.renters = state.data.renters.filter((item) => item.id !== id);
  saveAndRender("租客已删除。");
}

function ensureRenter(name) {
  if (!state.data.renters.some((renter) => renter.name === name)) {
    state.data.renters.push({ id: uid(), name, note: "" });
  }
}

function updateAccountStatusFromOrders() {
  const activeAccountIds = new Set(
    state.data.orders
      .filter((order) => order.status === "进行中" && order.accountRef)
      .map((order) => order.accountRef),
  );

  state.data.accounts.forEach((account) => {
    if (activeAccountIds.has(account.id)) {
      account.status = "正在出租";
    } else if (account.status === "正在出租") {
      account.status = "可出租";
    }
  });
}

function renderAccountOptions() {
  els.orderAccountInput.innerHTML = [
    `<option value="">不绑定帐号</option>`,
    ...state.data.accounts.map(
      (account) =>
        `<option value="${account.id}">${escapeHtml(account.accountId)} · ${escapeHtml(account.gameName)}</option>`,
    ),
  ].join("");
}

function renderRenterDatalist() {
  els.renterNameList.innerHTML = state.data.renters
    .map((renter) => `<option value="${escapeHtml(renter.name)}"></option>`)
    .join("");
}

function fillGameFromSelectedAccount() {
  const account = state.data.accounts.find((item) => item.id === els.orderAccountInput.value);
  if (account) {
    els.orderGameInput.value = account.gameName;
  }
}

function getDefaultGameName() {
  return state.data.accounts[0]?.gameName || "三角洲行动";
}

function getAccountLabel(accountRef) {
  const account = state.data.accounts.find((item) => item.id === accountRef);
  return account ? account.accountId : "";
}

function getAccountRevenue(accountId) {
  return state.data.orders
    .filter((order) => order.accountRef === accountId)
    .reduce((sum, order) => sum + getOrderProfit(order), 0);
}

function getOrderProfit(order) {
  return roundMoney(toNumber(order.receivedAmount) * (1 - PLATFORM_FEE_RATE));
}

function getRenterStats() {
  const map = new Map();

  state.data.renters.forEach((renter) => {
    map.set(renter.name, {
      id: renter.id,
      name: renter.name,
      note: renter.note,
      rentalCount: 0,
      spending: 0,
      tag: "未下单",
    });
  });

  state.data.orders.forEach((order) => {
    if (!order.renterName) return;
    if (!map.has(order.renterName)) {
      map.set(order.renterName, {
        id: `virtual-${order.renterName}`,
        name: order.renterName,
        note: "",
        rentalCount: 0,
        spending: 0,
        tag: "未下单",
      });
    }
    const renter = map.get(order.renterName);
    renter.rentalCount += 1;
    renter.spending += toNumber(order.receivedAmount);
  });

  return [...map.values()]
    .map((renter) => ({
      ...renter,
      spending: roundMoney(renter.spending),
      tag: getRenterTag(renter.rentalCount, renter.spending),
    }))
    .sort((a, b) => b.spending - a.spending || b.rentalCount - a.rentalCount);
}

function getRenterTag(count, spending) {
  if (count <= 0) return "未下单";
  if (count === 1) return "新客";
  if (count >= 5 || spending >= 1000) return "核心回头客";
  return "回头客";
}

function updateOrderProfitPreview() {
  const profit = toNumber(els.orderReceivedInput.value) * (1 - PLATFORM_FEE_RATE);
  els.orderProfitPreview.textContent = money(profit);
}

function saveAndRender(message) {
  saveLocalData();
  renderAll();
  toast(message);
}

function accountStatusTag(status) {
  const className =
    {
      正在生产: "producing",
      可出租: "available",
      正在出租: "renting",
      下架停租: "offline",
    }[status] || "ended";
  return `<span class="tag ${className}">${status}</span>`;
}

function orderStatusTag(status) {
  return status === "进行中"
    ? `<span class="tag renting">进行中</span>`
    : `<span class="tag ended">已结束</span>`;
}

function renterTag(tag) {
  const className =
    {
      新客: "new",
      回头客: "returning",
      核心回头客: "vip",
      未下单: "ended",
    }[tag] || "ended";
  return `<span class="tag ${className}">${tag}</span>`;
}

function emptyRow(colspan, text) {
  return `<tr><td colspan="${colspan}" class="empty-state">${text}</td></tr>`;
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "open");
  }
}

function loadGithubConfig() {
  const raw = localStorage.getItem(GITHUB_KEY);
  if (!raw) return;
  try {
    Object.assign(state.github, JSON.parse(raw));
  } catch (error) {
    console.error(error);
  }
}

function renderGithubForm() {
  els.githubOwner.value = state.github.owner || "";
  els.githubRepo.value = state.github.repo || "";
  els.githubBranch.value = state.github.branch || "main";
  els.githubPath.value = state.github.path || "data/ledger-data.json";
  els.githubToken.value = state.github.token || "";
}

function saveGithubConfigFromForm() {
  state.github = {
    owner: els.githubOwner.value.trim(),
    repo: els.githubRepo.value.trim(),
    branch: els.githubBranch.value.trim() || "main",
    path: els.githubPath.value.trim() || "data/ledger-data.json",
    token: els.githubToken.value.trim(),
  };
  localStorage.setItem(GITHUB_KEY, JSON.stringify(state.github));
  updateSyncStatus("ok", "同步设置已保存", `${state.github.owner}/${state.github.repo}`);
  logSync("GitHub 同步设置已保存。");
  toast("同步设置已保存。");
}

function clearGithubToken() {
  state.github.token = "";
  els.githubToken.value = "";
  localStorage.setItem(GITHUB_KEY, JSON.stringify(state.github));
  logSync("已清除浏览器内保存的 Token。");
  toast("Token 已清除。");
}

async function loadFromGithub() {
  if (!ensureGithubReady(false)) return;
  setCloudBusy("正在从 GitHub 读取...");
  try {
    const response = await fetch(githubContentUrl(true), {
      headers: githubHeaders(false),
    });
    if (!response.ok) throw await githubError(response);
    const payload = await response.json();
    state.cloudSha = payload.sha;
    const jsonText = decodeBase64(payload.content || "");
    state.data = normalizeData(JSON.parse(jsonText));
    saveLocalData();
    renderAll();
    updateSyncStatus("ok", "已读取 GitHub", formatDateTime(new Date().toISOString()));
    logSync(`读取成功：${state.github.path}`);
    toast("已从 GitHub 读取数据。");
  } catch (error) {
    updateSyncStatus("error", "读取失败", error.message);
    logSync(`读取失败：${error.message}`);
    toast(error.message, true);
  }
}

async function saveToGithub() {
  if (!ensureGithubReady(true)) return;
  setCloudBusy("正在保存到 GitHub...");
  try {
    const sha = await getGithubSha();
    const body = {
      message: `Update ledger data ${new Date().toISOString()}`,
      content: encodeBase64(JSON.stringify(state.data, null, 2)),
      branch: state.github.branch,
    };
    if (sha) body.sha = sha;

    const response = await fetch(githubContentUrl(false), {
      method: "PUT",
      headers: githubHeaders(true),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await githubError(response);
    const payload = await response.json();
    state.cloudSha = payload.content?.sha || null;
    updateSyncStatus("ok", "已保存 GitHub", formatDateTime(new Date().toISOString()));
    logSync(`保存成功：${state.github.path}`);
    toast("已保存到 GitHub。");
  } catch (error) {
    updateSyncStatus("error", "保存失败", error.message);
    logSync(`保存失败：${error.message}`);
    toast(error.message, true);
  }
}

async function getGithubSha() {
  const response = await fetch(githubContentUrl(true), {
    headers: githubHeaders(false),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await githubError(response);
  const payload = await response.json();
  return payload.sha;
}

function ensureGithubReady(requireToken) {
  saveGithubConfigFromForm();
  const missing = [];
  if (!state.github.owner) missing.push("用户名/组织");
  if (!state.github.repo) missing.push("仓库名");
  if (!state.github.branch) missing.push("分支");
  if (!state.github.path) missing.push("数据文件路径");
  if (requireToken && !state.github.token) missing.push("Token");

  if (missing.length) {
    toast(`请先填写：${missing.join("、")}。`, true);
    return false;
  }
  return true;
}

function githubContentUrl(withRef) {
  const base = `https://api.github.com/repos/${encodeURIComponent(state.github.owner)}/${encodeURIComponent(
    state.github.repo,
  )}/contents/${state.github.path.split("/").map(encodeURIComponent).join("/")}`;
  return withRef ? `${base}?ref=${encodeURIComponent(state.github.branch)}` : base;
}

function githubHeaders(write) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (write) headers["Content-Type"] = "application/json";
  if (state.github.token) headers.Authorization = `Bearer ${state.github.token}`;
  return headers;
}

async function githubError(response) {
  let message = `GitHub 请求失败：${response.status}`;
  try {
    const payload = await response.json();
    if (payload?.message) message = payload.message;
  } catch (_) {
    // Keep default message.
  }
  return new Error(message);
}

function setCloudBusy(text) {
  updateSyncStatus("", text, "请稍候");
  logSync(text);
}

function updateSyncStatus(type, status, meta) {
  els.syncDot.classList.toggle("ok", type === "ok");
  els.syncDot.classList.toggle("error", type === "error");
  els.syncStatus.textContent = status;
  els.syncMeta.textContent = meta || "";
}

function logSync(message) {
  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = `[${formatDateTime(new Date().toISOString())}] ${message}`;
  els.syncLog.prepend(item);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `delta-rental-ledger-${dateStamp()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("JSON 已导出。");
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    state.data = normalizeData(JSON.parse(text));
    saveLocalData();
    renderAll();
    toast("JSON 已导入。");
  } catch (error) {
    console.error(error);
    toast("导入失败，请检查 JSON 文件。", true);
  } finally {
    els.importFileInput.value = "";
  }
}

function nextOrderId() {
  const today = dateStamp();
  const todaysOrders = state.data.orders.filter((order) => String(order.orderId).startsWith(today));
  const next = todaysOrders.length + 1;
  return `${today}-${String(next).padStart(2, "0")}`;
}

function dateStamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function money(value) {
  return `¥${roundMoney(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("zh-CN", {
    maximumFractionDigits: 2,
  });
}

function formatCoin(order) {
  if (!toNumber(order.coinAmount)) return "-";
  return `${formatNumber(order.coinAmount)}${order.coinUnit || "W"}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(text) {
  const clean = text.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message, isError = false) {
  const node = document.createElement("div");
  node.className = `toast${isError ? " error" : ""}`;
  node.textContent = message;
  els.toastHost.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

window.openAccountDialog = openAccountDialog;
window.deleteAccount = deleteAccount;
window.openOrderDialog = openOrderDialog;
window.deleteOrder = deleteOrder;
window.openRenterDialog = openRenterDialog;
window.deleteRenter = deleteRenter;
