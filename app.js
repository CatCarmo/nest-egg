// ─────────────────────────────────────────────────────────────
// Saverly — single-user savings prototype
// All data lives in localStorage. No backend, no accounts.
// ─────────────────────────────────────────────────────────────

// The localStorage keys keep the old "nestegg." prefix on purpose. The app was
// renamed from Nest Egg to Saverly, but renaming these keys would orphan the
// saved data of everyone who used the app before the rename. Do not change them.
const STORAGE_KEY = "nestegg.v1";

const EXPENSE_CATEGORIES = [
  { id: "housing",       name: "Housing" },
  { id: "utilities",     name: "Utilities" },
  { id: "phone",         name: "Phone & internet" },
  { id: "food",          name: "Food & groceries" },
  { id: "transport",     name: "Transport" },
  { id: "health",        name: "Health & insurance" },
  { id: "subscriptions", name: "Subscriptions" },
  { id: "leisure",       name: "Leisure & dining" },
  { id: "shopping",      name: "Shopping" },
  { id: "other",         name: "Other" },
];

// Categories that count toward the "essentials" baseline for the emergency-fund target.
const ESSENTIAL_CATEGORIES = ["housing", "utilities", "phone", "food", "transport", "health"];

const defaultState = {
  goals: [],
  expenses: [],
  budget: {
    income: 0,
    splits: [
      { id: "needs",   name: "Needs",   hint: "rent, food, bills",      pct: 50 },
      { id: "wants",   name: "Wants",   hint: "fun, eating out, hobbies", pct: 30 },
      { id: "savings", name: "Savings", hint: "savings & investments",   pct: 20 },
    ],
  },
  projection: { monthly: 200, initial: 0, years: 20, rate: 10, inflation: 2.5 },
  lastLog: null,
  logHistory: [],
  emergencyFund: {
    monthsCovered: 6,
    manualTarget: null,
    saved: 0,
    allocation: 0,
  },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      budget: parsed.budget ?? structuredClone(defaultState.budget),
      projection: { ...defaultState.projection, ...(parsed.projection || {}) },
      lastLog: parsed.lastLog ?? null,
      logHistory: Array.isArray(parsed.logHistory) ? parsed.logHistory : [],
      emergencyFund: parsed.emergencyFund
        ? { ...defaultState.emergencyFund, ...parsed.emergencyFund }
        : structuredClone(defaultState.emergencyFund),
    };
  } catch {
    return structuredClone(defaultState);
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  afterSave();
}

// Runs after every write. Function declarations are hoisted, so the helpers
// defined further down are already available here.
function afterSave() {
  try { renderGlobalNotice(); } catch (_) {}
  try { maybePersist(); } catch (_) {}
}

const state = loadState();

const fmt = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const fmtPrecise = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

// ─────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.dataset.view;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach((v) => {
      v.classList.toggle("active", v.id === `view-${view}`);
    });
    if (view === "projections") drawChart();
  });
});

// ─────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────
const goalForm = document.getElementById("goal-form");
const goalList = document.getElementById("goal-list");
const goalsEmpty = document.getElementById("goals-empty");
let editingGoalId = null;

// ─────────────────────────────────────────────────────────────
// EMERGENCY FUND
// ─────────────────────────────────────────────────────────────
function renderEmergencyFund() {
  const body = document.getElementById("ef-body");
  const target = emergencyFundTarget();
  const saved = state.emergencyFund.saved || 0;
  const essentials = essentialExpensesMonthly();
  const months = state.emergencyFund.monthsCovered || 6;
  const manual = state.emergencyFund.manualTarget;
  const available = availableForGoals();
  const allocation = state.emergencyFund.allocation || 0;
  const fromBudget = (available * allocation) / 100;

  if (target <= 0) {
    body.innerHTML = `
      <p class="subtle">Track your monthly essentials on the <strong>Budget</strong> tab (rent, food, utilities…) so we can suggest a target — or use the settings ⚙ to enter a manual one.</p>
    `;
    return;
  }

  const pct = Math.min(100, (saved / target) * 100);
  const done = saved >= target;
  const remaining = Math.max(0, target - saved);
  const sourceLabel = manual && manual > 0
    ? `manual target`
    : `${months} × ${fmt.format(essentials)} essentials/month`;

  let footer = "";
  if (done) {
    footer = `<div class="ef-celebrate"><strong>You're protected.</strong> Time to grow your wealth — head to the <em>Projections</em> tab and plan how to invest your future savings (the S&amp;P 500 has averaged ~10%/year before inflation).</div>`;
  } else if (fromBudget > 0) {
    const monthsToFinish = Math.ceil(remaining / fromBudget);
    footer = `<div class="goal-budget-line">From budget: <strong>${fmt.format(fromBudget)}/month</strong> (${allocation}% of your monthly leftover) — fully funded in ${monthsToFinish} month${monthsToFinish === 1 ? "" : "s"}.</div>`;
  } else if (available > 0) {
    footer = `<div class="goal-footer">Allocate a slice of your monthly savings to this on the <strong>Budget</strong> tab. Or click <em>Suggest balanced split</em> there to prioritize it automatically.</div>`;
  }

  body.innerHTML = `
    <div class="ef-meta">Target: <strong>${fmt.format(target)}</strong> (${sourceLabel})</div>
    <div class="ef-amounts">
      <span><strong>${fmt.format(saved)}</strong> of ${fmt.format(target)}</span>
      <span>${pct.toFixed(0)}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill ${done ? "done" : ""}" style="width:${pct}%"></div>
    </div>
    ${footer}
  `;
}

document.getElementById("ef-settings-toggle").addEventListener("click", () => {
  const panel = document.getElementById("ef-settings");
  const showing = !panel.classList.toggle("hidden");
  if (showing) {
    document.getElementById("ef-months").value = state.emergencyFund.monthsCovered;
    document.getElementById("ef-months-out").textContent = `${state.emergencyFund.monthsCovered} months`;
    document.getElementById("ef-manual-target").value = state.emergencyFund.manualTarget || "";
    document.getElementById("ef-saved").value = state.emergencyFund.saved || 0;
  }
});

document.getElementById("ef-months").addEventListener("input", (e) => {
  state.emergencyFund.monthsCovered = +e.target.value;
  document.getElementById("ef-months-out").textContent = `${e.target.value} months`;
  saveState();
  renderEmergencyFund();
  renderGoalAllocations();
});

document.getElementById("ef-manual-target").addEventListener("input", (e) => {
  const v = parseFloat(e.target.value);
  state.emergencyFund.manualTarget = !isFinite(v) || v <= 0 ? null : v;
  saveState();
  withPreservedFocus(renderEmergencyFund);
  renderGoalAllocations();
});

document.getElementById("ef-saved").addEventListener("input", (e) => {
  let v = parseFloat(e.target.value);
  if (!isFinite(v) || v < 0) v = 0;
  state.emergencyFund.saved = v;
  saveState();
  withPreservedFocus(renderEmergencyFund);
  renderGoalAllocations();
  renderHistoryChart();
});

// Preserve focus across DOM rebuilds so typing in an input doesn't drop the cursor.
function withPreservedFocus(fn) {
  const el = document.activeElement;
  const TRACKED = ["idx", "num", "amount", "goalAlloc", "goalNum", "goalAmount"];
  let sel = null;
  let selStart, selEnd;
  if (el && el.tagName === "INPUT") {
    if (el.id) {
      sel = `#${CSS.escape(el.id)}`;
    } else if (el.dataset) {
      const key = TRACKED.find((k) => el.dataset[k] !== undefined);
      if (key) {
        const attr = "data-" + key.replace(/([A-Z])/g, "-$1").toLowerCase();
        sel = `[${attr}="${el.dataset[key]}"]`;
      }
    }
    selStart = el.selectionStart;
    selEnd = el.selectionEnd;
  }
  fn();
  if (sel) {
    const next = document.querySelector(sel);
    if (next) {
      next.focus();
      try { if (typeof selStart === "number") next.setSelectionRange(selStart, selEnd); } catch (e) {}
    }
  }
}

// A yearly expense of €600 counts as €50/month toward the budget.
function monthlyEquivalent(expense) {
  if (!expense || typeof expense.amount !== "number") return 0;
  return expense.frequency === "yearly" ? expense.amount / 12 : expense.amount;
}

function essentialExpensesMonthly() {
  return state.expenses
    .filter((e) => ESSENTIAL_CATEGORIES.includes(e.categoryId))
    .reduce((a, b) => a + monthlyEquivalent(b), 0);
}

function emergencyFundTarget() {
  const manual = state.emergencyFund.manualTarget;
  if (manual && manual > 0) return manual;
  return essentialExpensesMonthly() * (state.emergencyFund.monthsCovered || 6);
}

function monthlySavingsAmount() {
  const income = state.budget.income || 0;
  const s = state.budget.splits.find((x) => x.id === "savings");
  return income > 0 && s ? (income * s.pct) / 100 : 0;
}

// What's actually left over after tracked expenses — the basis for goal allocations.
function availableForGoals() {
  const income = state.budget.income || 0;
  const totalExpenses = state.expenses.reduce((a, b) => a + monthlyEquivalent(b), 0);
  return Math.max(0, income - totalExpenses);
}

function renderGoals() {
  goalList.innerHTML = "";
  if (state.goals.length === 0) {
    goalsEmpty.classList.remove("hidden");
    return;
  }
  goalsEmpty.classList.add("hidden");

  const monthlySavings = availableForGoals();

  state.goals.forEach((g) => {
    const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
    const done = pct >= 100;
    const remaining = Math.max(0, g.target - g.saved);
    const allocation = g.allocation || 0;
    const fromBudget = (monthlySavings * allocation) / 100;

    let footer = "";
    if (done) {
      footer = `Goal reached. ${fmt.format(g.saved)} saved.`;
    } else if (g.date) {
      const target = new Date(g.date);
      const today = new Date();
      const months = Math.max(
        0,
        (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
      );
      const requiredPerMonth = months > 0 ? remaining / months : remaining;
      if (fromBudget > 0) {
        if (months === 0) {
          footer = `Target this month — <strong>${fmt.format(remaining)}</strong> to go, your budget sends ${fmt.format(fromBudget)}.`;
        } else if (fromBudget >= requiredPerMonth) {
          footer = `On track. Your budget sends <strong>${fmt.format(fromBudget)}/month</strong> — you only need ${fmt.format(requiredPerMonth)}/month.`;
        } else {
          const shortfall = requiredPerMonth - fromBudget;
          footer = `Your budget sends ${fmt.format(fromBudget)}/month, but you need ${fmt.format(requiredPerMonth)}/month — <strong>${fmt.format(shortfall)} short</strong>.`;
        }
      } else if (months === 0) {
        footer = `Target this month — ${fmt.format(remaining)} to go.`;
      } else {
        footer = `Save <strong>${fmt.format(requiredPerMonth)}/month</strong> for ${months} months to hit your target.`;
      }
    } else if (fromBudget > 0) {
      const monthsToFinish = Math.ceil(remaining / fromBudget);
      const eta = new Date();
      eta.setMonth(eta.getMonth() + monthsToFinish);
      footer = `Your budget sends <strong>${fmt.format(fromBudget)}/month</strong> — on track to finish <strong>${formatDate(eta.toISOString())}</strong>.`;
    }

    const budgetLine = (!done && fromBudget > 0)
      ? `<div class="goal-budget-line">From budget: <strong>${fmt.format(fromBudget)}/month</strong> (${allocation}% of your monthly leftover)</div>`
      : "";

    const item = document.createElement("div");
    item.className = "goal-item";
    item.innerHTML = `
      <div class="goal-top">
        <div>
          <div class="goal-name">${g.icon ? `<span class="goal-icon">${escapeHtml(g.icon)}</span>` : ""}${escapeHtml(g.name)}</div>
          <div class="goal-meta">${g.date ? `Target: ${formatDate(g.date)}` : "No target date"}</div>
        </div>
        <div class="goal-actions">
          <button class="btn-icon" title="Edit" data-edit="${g.id}">✎</button>
          <button class="btn-icon" title="Delete" data-delete="${g.id}">✕</button>
        </div>
      </div>
      <div class="goal-amounts">
        <span><strong>${fmt.format(g.saved)}</strong> of ${fmt.format(g.target)}</span>
        <span>${pct.toFixed(0)}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill ${done ? "done" : ""}" style="width:${pct}%"></div></div>
      ${budgetLine}
      ${footer ? `<div class="goal-footer">${footer}</div>` : ""}
    `;
    goalList.appendChild(item);
  });

  goalList.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delete;
      const g = state.goals.find((x) => x.id === id);
      if (g && !confirm(`Delete "${g.name}"? This can't be undone.`)) return;
      state.goals = state.goals.filter((x) => x.id !== id);
      if (editingGoalId === id) closeGoalForm();
      saveState();
      renderGoals();
      renderGoalAllocations();
      renderHistoryChart();
    });
  });

  goalList.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = state.goals.find((x) => x.id === btn.dataset.edit);
      if (g) openGoalForm(g);
    });
  });
}

function openGoalForm(goal) {
  editingGoalId = goal ? goal.id : null;
  document.getElementById("goal-form-title").textContent = goal ? "Edit goal" : "New goal";
  document.getElementById("save-goal-btn").textContent = goal ? "Save changes" : "Save goal";
  document.getElementById("goal-icon").value   = goal && goal.icon ? goal.icon : "";
  document.getElementById("goal-name").value   = goal ? goal.name : "";
  document.getElementById("goal-target").value = goal ? goal.target : "";
  document.getElementById("goal-saved").value  = goal ? goal.saved : "";
  document.getElementById("goal-date").value   = goal && goal.date ? goal.date : "";
  goalForm.classList.remove("hidden");
  goalForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  document.getElementById("goal-name").focus();
}
function closeGoalForm() {
  editingGoalId = null;
  goalForm.classList.add("hidden");
  ["goal-name", "goal-target", "goal-saved", "goal-date"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("goal-icon").value = "";
}

document.getElementById("add-goal-btn").addEventListener("click", () => openGoalForm(null));
document.getElementById("cancel-goal-btn").addEventListener("click", closeGoalForm);
document.getElementById("save-goal-btn").addEventListener("click", () => {
  const name = document.getElementById("goal-name").value.trim();
  const icon = document.getElementById("goal-icon").value || null;
  const target = parseFloat(document.getElementById("goal-target").value);
  const saved = parseFloat(document.getElementById("goal-saved").value) || 0;
  const date = document.getElementById("goal-date").value || null;

  if (!name || !(target > 0)) {
    alert("Give your goal a name and a target amount greater than zero.");
    return;
  }

  if (editingGoalId) {
    const g = state.goals.find((x) => x.id === editingGoalId);
    if (g) {
      g.name = name;
      g.icon = icon;
      g.target = target;
      g.saved = saved;
      g.date = date;
    }
  } else {
    state.goals.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      icon,
      target,
      saved,
      date,
      allocation: 0,
    });
  }
  saveState();
  renderGoals();
  renderGoalAllocations();
  renderHistoryChart();
  closeGoalForm();
});

// ─────────────────────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────────────────────
const incomeInput = document.getElementById("income");
const splitRows = document.getElementById("split-rows");
const splitTotal = document.getElementById("split-total");
const budgetHint = document.getElementById("budget-hint");

incomeInput.value = state.budget.income || "";
incomeInput.addEventListener("input", () => {
  state.budget.income = parseFloat(incomeInput.value) || 0;
  saveState();
  renderBudget();
  renderGoals();
  renderEmergencyFund();
});

document.getElementById("reset-split-btn").addEventListener("click", () => {
  state.budget.splits = structuredClone(defaultState.budget.splits);
  saveState();
  renderBudget();
});

function renderBudget() {
  splitRows.innerHTML = "";
  const income = state.budget.income || 0;

  state.budget.splits.forEach((s, idx) => {
    const amount = (income * s.pct) / 100;
    const pctDisplay = Math.round(s.pct * 10) / 10;
    const row = document.createElement("div");
    row.className = "split-row";
    row.innerHTML = `
      <div class="split-name">${s.name}<small>${s.hint}</small></div>
      <input type="range" min="0" max="100" step="1" value="${s.pct}" data-idx="${idx}" />
      <input type="number" min="0" max="100" step="1" value="${pctDisplay}" data-num="${idx}" />
      <input type="number" class="split-amount" min="0" step="10" value="${Math.round(amount)}" data-amount="${idx}" ${income > 0 ? "" : "disabled"} />
    `;
    splitRows.appendChild(row);
  });

  splitRows.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener("input", () => {
      const idx = +input.dataset.idx;
      state.budget.splits[idx].pct = +input.value;
      saveState();
      withPreservedFocus(renderBudget);
      renderGoals();
    });
  });
  splitRows.querySelectorAll('input[type="number"][data-num]').forEach((input) => {
    input.addEventListener("input", () => {
      const idx = +input.dataset.num;
      let v = +input.value;
      if (isNaN(v)) v = 0;
      state.budget.splits[idx].pct = Math.max(0, Math.min(100, v));
      saveState();
      withPreservedFocus(renderBudget);
      renderGoals();
    });
  });
  splitRows.querySelectorAll('input[type="number"][data-amount]').forEach((input) => {
    input.addEventListener("input", () => {
      const idx = +input.dataset.amount;
      const income = state.budget.income || 0;
      if (income <= 0) return;
      let amt = +input.value;
      if (isNaN(amt) || amt < 0) amt = 0;
      const pct = (amt / income) * 100;
      state.budget.splits[idx].pct = Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
      saveState();
      withPreservedFocus(renderBudget);
      renderGoals();
    });
  });

  const totalPct = state.budget.splits.reduce((a, b) => a + b.pct, 0);
  const totalAmt = (income * totalPct) / 100;
  splitTotal.innerHTML = `
    <span>Total allocated</span>
    <span><strong>${totalPct}%</strong> · ${fmt.format(totalAmt)}</span>
  `;
  splitTotal.classList.toggle("over", totalPct > 100);

  const savings = state.budget.splits.find((s) => s.id === "savings");
  const savingsAmt = income && savings ? (income * savings.pct) / 100 : 0;
  if (totalPct !== 100 && income > 0) {
    budgetHint.textContent = totalPct > 100
      ? `You've allocated more than 100% — trim somewhere.`
      : `${100 - totalPct}% of your income is unassigned. Add it to savings to build your total faster.`;
    budgetHint.classList.remove("hidden");
  } else if (income > 0 && savings) {
    budgetHint.innerHTML = `At this rate you'd save <strong>${fmt.format(savingsAmt)}</strong> a month — that's <strong>${fmt.format(savingsAmt * 12)}</strong> a year. Head to <em>Projections</em> to see what it grows into.`;
    budgetHint.classList.remove("hidden");
  } else {
    budgetHint.classList.add("hidden");
  }

  renderGoalAllocations();
  renderExpenseSummary();
}

function renderGoalAllocations() {
  // Always recompute the budget breakdown — it depends on the same allocations
  // shown in this card, so it must stay in sync whenever this re-renders.
  renderExpenseSummary();

  const card = document.getElementById("goal-alloc-card");
  const rows = document.getElementById("goal-alloc-rows");
  const emptyMsg = document.getElementById("goal-alloc-empty");
  const summary = document.getElementById("goal-alloc-summary");

  const monthlySavings = availableForGoals();
  const totalExp = state.expenses.reduce((a, b) => a + monthlyEquivalent(b), 0);
  const availableLabel = totalExp > 0
    ? `${fmt.format(monthlySavings)}/month after expenses`
    : `${fmt.format(monthlySavings)}/month available`;

  const efTarget = emergencyFundTarget();
  const efSaved = state.emergencyFund.saved || 0;
  const efActive = efTarget > 0 && efSaved < efTarget;

  if (monthlySavings <= 0) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");

  rows.innerHTML = "";
  if (state.goals.length === 0 && !efActive) {
    emptyMsg.classList.remove("hidden");
    summary.textContent = availableLabel;
    summary.classList.remove("over");
    document.getElementById("alloc-actions").classList.add("hidden");
    document.getElementById("log-confirm-panel").classList.add("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  let totalPct = 0;

  if (efActive) {
    const efPct = state.emergencyFund.allocation || 0;
    totalPct += efPct;
    const efAmt = (monthlySavings * efPct) / 100;
    const efPctDisplay = Math.round(efPct * 10) / 10;
    const efRow = document.createElement("div");
    efRow.className = "split-row emergency-fund-row";
    efRow.innerHTML = `
      <div class="split-name">Emergency fund<small>${fmt.format(efSaved)} of ${fmt.format(efTarget)} saved</small></div>
      <input type="range" id="ef-alloc-slider" min="0" max="100" step="1" value="${efPct}" />
      <input type="number" id="ef-alloc-num" min="0" max="100" step="1" value="${efPctDisplay}" />
      <input type="number" class="split-amount" id="ef-alloc-amt" min="0" step="10" value="${Math.round(efAmt)}" ${monthlySavings > 0 ? "" : "disabled"} />
    `;
    rows.appendChild(efRow);
  }

  state.goals.forEach((g) => {
    const pct = g.allocation || 0;
    totalPct += pct;
    const amt = (monthlySavings * pct) / 100;
    const pctDisplay = Math.round(pct * 10) / 10;
    const row = document.createElement("div");
    row.className = "split-row";
    row.innerHTML = `
      <div class="split-name">${escapeHtml(g.name)}<small>${fmt.format(g.saved)} of ${fmt.format(g.target)} saved</small></div>
      <input type="range" min="0" max="100" step="1" value="${pct}" data-goal-alloc="${g.id}" />
      <input type="number" min="0" max="100" step="1" value="${pctDisplay}" data-goal-num="${g.id}" />
      <input type="number" class="split-amount" min="0" step="10" value="${Math.round(amt)}" data-goal-amount="${g.id}" ${monthlySavings > 0 ? "" : "disabled"} />
    `;
    rows.appendChild(row);
  });

  const remainingPct = 100 - totalPct;
  const unassignedAmt = (monthlySavings * Math.max(0, remainingPct)) / 100;
  const unassignedRow = document.createElement("div");
  unassignedRow.className = "split-row unassigned-row";
  unassignedRow.innerHTML = `
    <div class="split-name">Unassigned<small>builds your general savings</small></div>
    <div class="unassigned-info">${remainingPct >= 0 ? `${remainingPct}% left over` : `over by ${-remainingPct}%`}</div>
    <div class="split-amount">${fmt.format(unassignedAmt)}</div>
  `;
  rows.appendChild(unassignedRow);

  if (totalPct > 100) {
    summary.textContent = `Over-allocated by ${totalPct - 100}% — trim somewhere`;
    summary.classList.add("over");
  } else {
    summary.textContent = availableLabel;
    summary.classList.remove("over");
  }

  // Action row visibility + button states
  document.getElementById("alloc-actions").classList.remove("hidden");
  document.getElementById("log-confirm-panel").classList.add("hidden");
  const hasLive = efActive || state.goals.some((g) => g.saved < g.target);
  const hasFundedLive =
    (efActive && (state.emergencyFund.allocation || 0) > 0) ||
    state.goals.some((g) => (g.allocation || 0) > 0 && g.saved < g.target);
  document.getElementById("suggest-split-btn").disabled = !hasLive;
  document.getElementById("log-savings-btn").disabled = !hasFundedLive;

  // EF row listeners
  const efSliderEl = document.getElementById("ef-alloc-slider");
  if (efSliderEl) {
    efSliderEl.addEventListener("input", () => {
      state.emergencyFund.allocation = Math.max(0, Math.min(100, +efSliderEl.value));
      saveState();
      withPreservedFocus(renderGoalAllocations);
      renderEmergencyFund();
    });
  }
  const efNumEl = document.getElementById("ef-alloc-num");
  if (efNumEl) {
    efNumEl.addEventListener("input", () => {
      let v = +efNumEl.value;
      if (!isFinite(v)) v = 0;
      state.emergencyFund.allocation = Math.max(0, Math.min(100, v));
      saveState();
      withPreservedFocus(renderGoalAllocations);
      renderEmergencyFund();
    });
  }
  const efAmtEl = document.getElementById("ef-alloc-amt");
  if (efAmtEl) {
    efAmtEl.addEventListener("input", () => {
      if (monthlySavings <= 0) return;
      let amt = +efAmtEl.value;
      if (!isFinite(amt) || amt < 0) amt = 0;
      const pct = (amt / monthlySavings) * 100;
      state.emergencyFund.allocation = Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
      saveState();
      withPreservedFocus(renderGoalAllocations);
      renderEmergencyFund();
    });
  }

  rows.querySelectorAll("[data-goal-alloc]").forEach((input) => {
    input.addEventListener("input", () => {
      const g = state.goals.find((x) => x.id === input.dataset.goalAlloc);
      if (!g) return;
      g.allocation = Math.max(0, Math.min(100, +input.value));
      saveState();
      withPreservedFocus(renderGoalAllocations);
      renderGoals();
    });
  });
  rows.querySelectorAll("[data-goal-num]").forEach((input) => {
    input.addEventListener("input", () => {
      const g = state.goals.find((x) => x.id === input.dataset.goalNum);
      if (!g) return;
      let v = +input.value;
      if (isNaN(v)) v = 0;
      g.allocation = Math.max(0, Math.min(100, v));
      saveState();
      withPreservedFocus(renderGoalAllocations);
      renderGoals();
    });
  });
  rows.querySelectorAll("[data-goal-amount]").forEach((input) => {
    input.addEventListener("input", () => {
      const g = state.goals.find((x) => x.id === input.dataset.goalAmount);
      if (!g) return;
      if (monthlySavings <= 0) return;
      let amt = +input.value;
      if (isNaN(amt) || amt < 0) amt = 0;
      const pct = (amt / monthlySavings) * 100;
      g.allocation = Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
      saveState();
      withPreservedFocus(renderGoalAllocations);
      renderGoals();
    });
  });

  renderLogStatus();
}

function renderLogStatus() {
  const row = document.getElementById("log-status");
  const text = document.getElementById("log-status-text");
  if (!state.lastLog) {
    row.classList.add("hidden");
    return;
  }
  row.classList.remove("hidden");
  const total = state.lastLog.credits.reduce((a, b) => a + b.amount, 0);
  text.textContent = `Last logged ${relativeDate(state.lastLog.date)} · ${fmt.format(total)}`;
}

// ─────────────────────────────────────────────────────────────
// Suggest balanced split — distribute by urgency
// ─────────────────────────────────────────────────────────────
function suggestBalancedSplit() {
  const monthlySavings = availableForGoals();
  if (monthlySavings <= 0) return;

  // Reset everything to zero first.
  state.goals.forEach((g) => { g.allocation = 0; });
  state.emergencyFund.allocation = 0;

  // Step 1: prioritize the emergency fund. Aim to finish it in 6 months — but
  // cap at 100% of available if it would need more.
  const efTarget = emergencyFundTarget();
  const efSaved = state.emergencyFund.saved || 0;
  const efRemaining = efTarget > 0 ? Math.max(0, efTarget - efSaved) : 0;

  let efPct = 0;
  if (efRemaining > 0) {
    const efMonthlyNeed = efRemaining / 6;
    efPct = Math.min(100, Math.round((efMonthlyNeed / monthlySavings) * 100));
    state.emergencyFund.allocation = efPct;
  }

  // Step 2: distribute what's left across goals by urgency.
  const remainingPct = 100 - efPct;
  const today = new Date();
  const live = state.goals.filter((g) => g.saved < g.target);

  let goalsScaled = false;
  if (remainingPct > 0 && live.length > 0) {
    const needs = live.map((g) => {
      const remaining = g.target - g.saved;
      let months = 24;
      if (g.date) {
        const t = new Date(g.date);
        months = Math.max(
          1,
          (t.getFullYear() - today.getFullYear()) * 12 + (t.getMonth() - today.getMonth())
        );
      }
      return { id: g.id, need: Math.max(0, remaining / months) };
    });
    const totalNeed = needs.reduce((a, b) => a + b.need, 0);

    if (totalNeed > 0) {
      const remainingAvailable = monthlySavings * (remainingPct / 100);
      goalsScaled = totalNeed > remainingAvailable;
      needs.forEach((n) => {
        const g = state.goals.find((x) => x.id === n.id);
        if (!g) return;
        const pct = goalsScaled
          ? (n.need / totalNeed) * remainingPct
          : (n.need / monthlySavings) * 100;
        g.allocation = Math.max(0, Math.min(100, Math.round(pct)));
      });
    }
  }

  saveState();
  renderGoalAllocations();
  renderGoals();
  renderEmergencyFund();

  let msg;
  if (efRemaining > 0 && remainingPct > 0) {
    msg = `Prioritizing emergency fund (${efPct}%). Remainder spread across goals${goalsScaled ? " — some will run behind their target dates." : "."}`;
  } else if (efRemaining > 0) {
    msg = `Full ${efPct}% to your emergency fund — finish it first, then come back to redistribute.`;
  } else {
    const sumPct = state.goals.reduce((a, g) => a + (g.allocation || 0), 0);
    msg = goalsScaled
      ? `Split set — savings spread proportionally; some goals will run behind their target dates.`
      : `Split set — each goal funded at its target pace, ${100 - sumPct}% left unassigned.`;
  }
  showToast(msg);
}

// ─────────────────────────────────────────────────────────────
// Log this month's savings — credit each goal by its allocation
// ─────────────────────────────────────────────────────────────
function openLogConfirm() {
  const monthlySavings = availableForGoals();
  const updates = [];

  const efTarget = emergencyFundTarget();
  const efSaved = state.emergencyFund.saved || 0;
  const efAlloc = state.emergencyFund.allocation || 0;
  if (efAlloc > 0 && efTarget > 0 && efSaved < efTarget) {
    const allocAmt = (monthlySavings * efAlloc) / 100;
    const room = efTarget - efSaved;
    const credit = Math.min(allocAmt, room);
    if (credit > 0) {
      updates.push({ type: "ef", name: "Emergency fund", credit });
    }
  }

  state.goals
    .filter((g) => (g.allocation || 0) > 0 && g.saved < g.target)
    .forEach((g) => {
      const allocAmt = (monthlySavings * (g.allocation || 0)) / 100;
      const room = g.target - g.saved;
      const credit = Math.min(allocAmt, room);
      if (credit > 0) {
        updates.push({ type: "goal", id: g.id, name: g.name, credit });
      }
    });

  const panel = document.getElementById("log-confirm-panel");
  if (updates.length === 0) {
    panel.classList.add("hidden");
    return;
  }

  const total = updates.reduce((a, b) => a + b.credit, 0);
  const dupWarning = isInCurrentMonth(state.lastLog?.date)
    ? `<div class="log-warning">⚠ You already logged this month on ${formatDate(state.lastLog.date)}. Clicking confirm will add another month on top.</div>`
    : "";

  panel.innerHTML = `
    ${dupWarning}
    <div class="log-confirm-title">This will credit your goals:</div>
    <ul class="log-confirm-list">
      ${updates.map((u) => `<li><span>${escapeHtml(u.name)}</span><strong>+${fmtPrecise.format(u.credit)}</strong></li>`).join("")}
      <li><span><strong>Total</strong></span><strong>+${fmtPrecise.format(total)}</strong></li>
    </ul>
    <div class="log-confirm-actions">
      <button class="btn btn-ghost btn-sm" id="log-cancel-btn">Cancel</button>
      <button class="btn btn-primary btn-sm" id="log-confirm-btn">Confirm</button>
    </div>
  `;
  panel.classList.remove("hidden");

  document.getElementById("log-cancel-btn").addEventListener("click", () => {
    panel.classList.add("hidden");
  });
  document.getElementById("log-confirm-btn").addEventListener("click", () => {
    updates.forEach((u) => {
      if (u.type === "ef") {
        state.emergencyFund.saved = Math.min(efTarget, (state.emergencyFund.saved || 0) + u.credit);
      } else {
        const g = state.goals.find((x) => x.id === u.id);
        if (g) g.saved = Math.min(g.target, g.saved + u.credit);
      }
    });
    state.lastLog = {
      date: new Date().toISOString(),
      credits: updates.map((u) => ({ type: u.type, id: u.id || null, name: u.name, amount: u.credit })),
    };
    const totalSaved =
      (state.emergencyFund.saved || 0) +
      state.goals.reduce((a, g) => a + (g.saved || 0), 0);
    state.logHistory = state.logHistory || [];
    state.logHistory.push({ date: state.lastLog.date, total: totalSaved, amount: total });
    saveState();
    panel.classList.add("hidden");
    renderGoals();
    renderGoalAllocations();
    renderEmergencyFund();
    renderHistoryChart();
    showToast(`Logged ${fmt.format(total)} across ${updates.length} target${updates.length === 1 ? "" : "s"}.`);
  });
}

function undoLastLog() {
  if (!state.lastLog) return;
  if (!confirm("Undo the last log? Each balance will be rolled back by what was added.")) return;

  state.lastLog.credits.forEach((c) => {
    if (c.type === "ef") {
      state.emergencyFund.saved = Math.max(0, (state.emergencyFund.saved || 0) - c.amount);
    } else {
      const g = state.goals.find((x) => x.id === c.id);
      if (g) g.saved = Math.max(0, g.saved - c.amount);
    }
  });
  const restored = fmt.format(state.lastLog.credits.reduce((a, b) => a + b.amount, 0));
  state.lastLog = null;
  if (state.logHistory && state.logHistory.length > 0) state.logHistory.pop();
  saveState();
  renderGoals();
  renderGoalAllocations();
  renderEmergencyFund();
  renderHistoryChart();
  showToast(`Rolled back ${restored} — balances restored.`);
}

// ─────────────────────────────────────────────────────────────
// Savings history chart
// ─────────────────────────────────────────────────────────────
function totalSavedNow() {
  return (state.emergencyFund.saved || 0) +
    state.goals.reduce((a, g) => a + (g.saved || 0), 0);
}

const ONBOARDED_KEY = "nestegg.onboarded";

function renderOnboarding() {
  const card = document.getElementById("onboarding-card");
  if (!card) return;
  const dismissed = localStorage.getItem(ONBOARDED_KEY) === "1";
  if (dismissed) card.classList.add("hidden");
  else card.classList.remove("hidden");
}

document.getElementById("onboarding-dismiss").addEventListener("click", () => {
  localStorage.setItem(ONBOARDED_KEY, "1");
  document.getElementById("onboarding-card").classList.add("hidden");
});

function renderNetWorth() {
  const card = document.getElementById("networth-card");
  const valueEl = document.getElementById("networth-value");
  const subEl = document.getElementById("networth-sub");

  const saved = totalSavedNow();
  const efTarget = emergencyFundTarget();
  const goalsTarget = state.goals.reduce((a, g) => a + (g.target || 0), 0);
  const totalTarget = efTarget + goalsTarget;

  if (saved <= 0 && totalTarget <= 0) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");

  valueEl.textContent = fmt.format(saved);

  if (totalTarget > 0) {
    const pct = Math.min(100, (saved / totalTarget) * 100);
    const targetCount = (efTarget > 0 ? 1 : 0) + state.goals.length;
    subEl.innerHTML = `<strong>${pct.toFixed(0)}%</strong> of the way to ${fmt.format(totalTarget)} across ${targetCount} target${targetCount === 1 ? "" : "s"}.`;
  } else {
    subEl.innerHTML = `Set targets to see how far along you are.`;
  }
}

function renderHistoryChart() {
  renderNetWorth();
  const empty = document.getElementById("history-empty");
  const canvas = document.getElementById("history-chart");
  const summary = document.getElementById("history-summary");

  const history = state.logHistory || [];
  const current = totalSavedNow();

  if (current > 0) {
    summary.textContent = `${fmt.format(current)} saved in total`;
  } else {
    summary.textContent = `Start logging to see your progress.`;
  }

  if (history.length === 0) {
    empty.classList.remove("hidden");
    canvas.style.display = "none";
    return;
  }
  empty.classList.add("hidden");
  canvas.style.display = "block";

  const points = history.map((h) => ({ date: new Date(h.date), total: h.total }));
  // Always show "now" so the line extends to today if anything has changed since the last log.
  const now = new Date();
  const lastDate = points[points.length - 1].date;
  if (now.getTime() - lastDate.getTime() > 60_000 || current !== points[points.length - 1].total) {
    points.push({ date: now, total: current });
  }
  // With a single history entry, prepend a synthetic zero point so the chart has range.
  if (points.length === 1) {
    const start = new Date(points[0].date);
    start.setMonth(start.getMonth() - 1);
    points.unshift({ date: start, total: 0 });
  }

  drawHistoryChart(canvas, points);
}

function drawHistoryChart(canvas, points) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const pad = { top: 20, right: 20, bottom: 30, left: 64 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const c = chartTheme();
  const maxTotal = Math.max(...points.map((p) => p.total), 1);
  const minMs = points[0].date.getTime();
  const maxMs = points[points.length - 1].date.getTime();
  const range = Math.max(1, maxMs - minMs);

  const x = (date) => pad.left + ((date.getTime() - minMs) / range) * plotW;
  const y = (val) => pad.top + plotH - (val / maxTotal) * plotH;

  // Gridlines + Y labels
  ctx.strokeStyle = c.grid;
  ctx.fillStyle = c.label;
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (maxTotal / steps) * i;
    const yy = y(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(W - pad.right, yy);
    ctx.stroke();
    ctx.fillText(fmtShort(val), pad.left - 8, yy);
  }

  // X labels (dates)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const labelCount = Math.min(5, Math.max(2, points.length));
  for (let i = 0; i < labelCount; i++) {
    const ratio = labelCount === 1 ? 0.5 : i / (labelCount - 1);
    const d = new Date(minMs + ratio * range);
    const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    ctx.fillText(label, pad.left + ratio * plotW, H - pad.bottom + 6);
  }

  // Area fill
  ctx.beginPath();
  points.forEach((p, i) => {
    const px = x(p.date), py = y(p.total);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.lineTo(x(points[points.length - 1].date), y(0));
  ctx.lineTo(x(points[0].date), y(0));
  ctx.closePath();
  ctx.fillStyle = c.balanceFill;
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p, i) => {
    const px = x(p.date), py = y(p.total);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = c.orange;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Dots (only at real log points, not the synthetic zero)
  points.forEach((p) => {
    if (p.total === 0 && p === points[0] && points.length > 1) return;
    const px = x(p.date), py = y(p.total);
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = c.orange;
    ctx.fill();
    ctx.strokeStyle = c.dotStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function isInCurrentMonth(isoDate) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function relativeDate(isoDate) {
  const d = new Date(isoDate);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "a week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `on ${formatDate(isoDate)}`;
}

document.getElementById("suggest-split-btn").addEventListener("click", suggestBalancedSplit);
document.getElementById("log-savings-btn").addEventListener("click", openLogConfirm);
document.getElementById("undo-log-btn").addEventListener("click", undoLastLog);

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
let toastEl = null;
let toastTimer = null;
function showToast(text) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// ─────────────────────────────────────────────────────────────
// PROJECTIONS
// ─────────────────────────────────────────────────────────────
const projMonthly = document.getElementById("proj-monthly");
const projInitial = document.getElementById("proj-initial");
const projYears = document.getElementById("proj-years");
const projRate = document.getElementById("proj-rate");
const projInflation = document.getElementById("proj-inflation");
const projYearsOut = document.getElementById("proj-years-out");
const projRateOut = document.getElementById("proj-rate-out");
const projInflationOut = document.getElementById("proj-inflation-out");

projMonthly.value = state.projection.monthly;
projInitial.value = state.projection.initial;
projYears.value = state.projection.years;
projRate.value = state.projection.rate;
projInflation.value = state.projection.inflation;

[projMonthly, projInitial, projYears, projRate, projInflation].forEach((el) => {
  el.addEventListener("input", () => {
    state.projection.monthly = parseFloat(projMonthly.value) || 0;
    state.projection.initial = parseFloat(projInitial.value) || 0;
    state.projection.years = parseInt(projYears.value);
    state.projection.rate = parseFloat(projRate.value);
    state.projection.inflation = parseFloat(projInflation.value) || 0;
    saveState();
    renderProjections();
  });
});

function rateLabel(r) {
  if (r === 0) return "0% — cash under the mattress";
  if (r <= 2.5) return `${r}% — savings account`;
  if (r <= 5) return `${r}% — bonds / conservative mix`;
  if (r <= 8) return `${r}% — balanced portfolio`;
  if (r <= 10.5) return `${r}% — S&P 500 historical avg`;
  return `${r}% — optimistic`;
}

function inflationLabel(i) {
  if (i === 0) return "0% — no inflation";
  if (i <= 1.5) return `${i}% — low inflation`;
  if (i <= 3) return `${i}% — typical long-term`;
  if (i <= 5) return `${i}% — elevated`;
  return `${i}% — high inflation`;
}

// Compute year-by-year balance with monthly contributions compounded monthly.
// Also computes the "real" (inflation-adjusted) value at each point.
function project({ initial, monthly, years, rate, inflation }) {
  const r = rate / 100 / 12;
  const inflMonthly = (inflation || 0) / 100 / 12;
  const months = years * 12;
  const points = [{ year: 0, balance: initial, contributed: initial, real: initial }];
  let bal = initial;
  let contributed = initial;
  let cumInflation = 1;
  for (let m = 1; m <= months; m++) {
    bal = bal * (1 + r) + monthly;
    contributed += monthly;
    cumInflation *= 1 + inflMonthly;
    if (m % 12 === 0) {
      points.push({
        year: m / 12,
        balance: bal,
        contributed,
        real: bal / cumInflation,
      });
    }
  }
  return {
    points,
    finalBalance: bal,
    totalContributed: contributed,
    finalReal: bal / cumInflation,
  };
}

function renderProjections() {
  const { monthly, initial, years, rate, inflation } = state.projection;
  projYearsOut.textContent = `${years} year${years === 1 ? "" : "s"}`;
  projRateOut.textContent = rateLabel(rate);
  projInflationOut.textContent = inflationLabel(inflation);

  const result = project({ initial, monthly, years, rate, inflation });
  document.getElementById("proj-final").textContent = fmt.format(result.finalBalance);
  document.getElementById("proj-contrib").textContent = fmt.format(result.totalContributed);
  const growth = result.finalBalance - result.totalContributed;
  document.getElementById("proj-growth").textContent = fmt.format(growth);

  const realEl = document.getElementById("proj-real");
  if (inflation > 0 && years > 0) {
    realEl.textContent = `≈ ${fmt.format(result.finalReal)} in today's money`;
    realEl.style.display = "block";
  } else {
    realEl.style.display = "none";
  }

  drawChart(result);
}

let lastResult = null;
function drawChart(result) {
  const canvas = document.getElementById("proj-chart");
  if (!canvas) return;
  if (result) lastResult = result;
  if (!lastResult) return;

  // Handle high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const pad = { top: 20, right: 20, bottom: 36, left: 64 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const c = chartTheme();
  const pts = lastResult.points;
  const showReal = state.projection.inflation > 0 && state.projection.years > 0;
  const maxBal = Math.max(lastResult.finalBalance, lastResult.totalContributed, 1);
  const maxYear = pts[pts.length - 1].year || 1;

  const x = (year) => pad.left + (year / maxYear) * plotW;
  const y = (val) => pad.top + plotH - (val / maxBal) * plotH;

  // Gridlines + y-axis labels
  ctx.strokeStyle = c.grid;
  ctx.fillStyle = c.label;
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (maxBal / steps) * i;
    const yy = y(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(W - pad.right, yy);
    ctx.stroke();
    ctx.fillText(fmtShort(val), pad.left - 8, yy);
  }

  // X-axis labels
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xSteps = Math.min(6, maxYear);
  for (let i = 0; i <= xSteps; i++) {
    const year = Math.round((maxYear / xSteps) * i);
    ctx.fillText(`Year ${year}`, x(year), H - pad.bottom + 8);
  }

  // Contributed area (subtle)
  ctx.beginPath();
  pts.forEach((p, i) => {
    const px = x(p.year), py = y(p.contributed);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.lineTo(x(maxYear), y(0));
  ctx.lineTo(x(0), y(0));
  ctx.closePath();
  ctx.fillStyle = c.contribFill;
  ctx.fill();

  // Balance area (orange tinted)
  ctx.beginPath();
  pts.forEach((p, i) => {
    const px = x(p.year), py = y(p.balance);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.lineTo(x(maxYear), y(0));
  ctx.lineTo(x(0), y(0));
  ctx.closePath();
  ctx.fillStyle = c.balanceFill;
  ctx.fill();

  // Contributed line
  ctx.beginPath();
  pts.forEach((p, i) => {
    const px = x(p.year), py = y(p.contributed);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = c.contribLine;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Balance line (nominal)
  ctx.beginPath();
  pts.forEach((p, i) => {
    const px = x(p.year), py = y(p.balance);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = c.orange;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Real (inflation-adjusted) balance line — solid muted orange
  if (showReal) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = x(p.year), py = y(p.real);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = c.orange;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Legend
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "12px -apple-system, system-ui, sans-serif";

  const legendY = pad.top + 4;
  ctx.fillStyle = c.orange;
  ctx.fillRect(pad.left + 4, legendY - 5, 12, 10);
  ctx.fillStyle = c.ink;
  ctx.fillText("Balance", pad.left + 22, legendY);

  let xOff = pad.left + 80;
  if (showReal) {
    ctx.strokeStyle = c.orange;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(xOff, legendY);
    ctx.lineTo(xOff + 16, legendY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.ink;
    ctx.fillText("In today's money", xOff + 22, legendY);
    xOff += 150;
  }

  ctx.strokeStyle = c.contribLine;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(xOff, legendY);
  ctx.lineTo(xOff + 16, legendY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = c.ink;
  ctx.fillText("What you put in", xOff + 22, legendY);
}

function fmtShort(n) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${Math.round(n)}`;
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// Redraw chart when window resizes (so the canvas stays crisp)
window.addEventListener("resize", () => {
  if (document.getElementById("view-projections").classList.contains("active")) drawChart();
  if (document.getElementById("view-goals").classList.contains("active")) renderHistoryChart();
});

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────
let editingExpenseId = null;

function populateCategorySelect() {
  const select = document.getElementById("expense-category");
  select.innerHTML = EXPENSE_CATEGORIES
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join("");
}

function renderExpenses() {
  const groups = document.getElementById("expense-groups");
  const empty = document.getElementById("expense-empty");
  const totalEl = document.getElementById("expense-total");

  const total = state.expenses.reduce((a, b) => a + monthlyEquivalent(b), 0);
  totalEl.textContent = state.expenses.length === 0
    ? "Nothing tracked yet"
    : `${fmt.format(total)}/month total`;

  groups.innerHTML = "";
  if (state.expenses.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  const grouped = {};
  state.expenses.forEach((e) => {
    if (!grouped[e.categoryId]) grouped[e.categoryId] = [];
    grouped[e.categoryId].push(e);
  });

  EXPENSE_CATEGORIES.forEach((cat) => {
    const items = grouped[cat.id];
    if (!items || items.length === 0) return;
    const catTotal = items.reduce((a, b) => a + monthlyEquivalent(b), 0);
    const groupEl = document.createElement("div");
    groupEl.className = "expense-group";
    groupEl.innerHTML = `
      <div class="expense-group-header">
        <span>${cat.name}</span>
        <span class="expense-group-total">${fmt.format(catTotal)}/mo</span>
      </div>
      ${items.map((e) => {
        const isYearly = e.frequency === "yearly";
        const mainLabel = isYearly
          ? `${fmt.format(e.amount)}/yr`
          : fmt.format(e.amount);
        const subLabel = isYearly
          ? `<span class="expense-amount-sub">≈ ${fmt.format(monthlyEquivalent(e))}/mo</span>`
          : "";
        return `
          <div class="expense-item">
            <span class="expense-name">${escapeHtml(e.name)}</span>
            <span class="expense-amount">${mainLabel}${subLabel}</span>
            <div class="expense-actions">
              <button class="btn-icon" title="Edit" data-edit-expense="${e.id}">✎</button>
              <button class="btn-icon" title="Delete" data-delete-expense="${e.id}">✕</button>
            </div>
          </div>
        `;
      }).join("")}
    `;
    groups.appendChild(groupEl);
  });

  groups.querySelectorAll("[data-edit-expense]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const e = state.expenses.find((x) => x.id === btn.dataset.editExpense);
      if (e) openExpenseForm(e);
    });
  });
  groups.querySelectorAll("[data-delete-expense]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.deleteExpense;
      const e = state.expenses.find((x) => x.id === id);
      if (e && !confirm(`Delete "${e.name}"? This can't be undone.`)) return;
      state.expenses = state.expenses.filter((x) => x.id !== id);
      if (editingExpenseId === id) closeExpenseForm();
      saveState();
      renderExpenses();
      renderExpenseSummary();
      renderGoalAllocations();
      renderGoals();
      renderEmergencyFund();
    });
  });
}

function renderExpenseSummary() {
  const card = document.getElementById("expense-summary-card");
  const rowsEl = document.getElementById("summary-rows");
  const hint = document.getElementById("summary-hint");
  const rateLine = document.getElementById("savings-rate-line");

  const income = state.budget.income || 0;
  const totalExpenses = state.expenses.reduce((a, b) => a + monthlyEquivalent(b), 0);

  if (income <= 0 && totalExpenses === 0) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");

  const afterExpenses = income - totalExpenses;

  // Savings rate (% of income left after expenses).
  if (income > 0 && afterExpenses > 0) {
    const ratePct = Math.round((afterExpenses / income) * 100);
    let qualifier;
    if (ratePct < 10) qualifier = "every habit starts somewhere";
    else if (ratePct < 20) qualifier = "a healthy start";
    else if (ratePct < 30) qualifier = "a solid pace";
    else if (ratePct < 50) qualifier = "well above average";
    else qualifier = "exceptional";
    rateLine.textContent = `Saving ${ratePct}% of income — ${qualifier}.`;
    rateLine.classList.remove("hidden");
  } else {
    rateLine.classList.add("hidden");
  }

  // Compute committed amounts (what's locked in toward EF + each goal each month).
  const commitments = [];
  const efTarget = emergencyFundTarget();
  const efSaved = state.emergencyFund.saved || 0;
  if (efTarget > 0 && efSaved < efTarget && afterExpenses > 0) {
    const efPct = state.emergencyFund.allocation || 0;
    if (efPct > 0) {
      const allocAmt = (afterExpenses * efPct) / 100;
      const amt = Math.min(allocAmt, efTarget - efSaved);
      if (amt > 0) commitments.push({ name: "Emergency fund", pct: efPct, amount: amt });
    }
  }
  state.goals.forEach((g) => {
    if (g.saved >= g.target || afterExpenses <= 0) return;
    const pct = g.allocation || 0;
    if (pct <= 0) return;
    const allocAmt = (afterExpenses * pct) / 100;
    const amt = Math.min(allocAmt, g.target - g.saved);
    if (amt > 0) commitments.push({ name: g.name, pct, amount: amt });
  });

  const totalCommitted = commitments.reduce((a, b) => a + b.amount, 0);
  const unassigned = afterExpenses - totalCommitted;

  // Build the rows.
  const row = (label, value, opts = {}) => {
    const cls = ["summary-row"];
    if (opts.type) cls.push(opts.type);
    if (opts.negative) cls.push("negative");
    const labelHtml = opts.type === "deduction-row"
      ? `<span class="indented">${escapeHtml(label)}</span>`
      : `<span>${escapeHtml(label)}</span>`;
    return `<div class="${cls.join(" ")}">${labelHtml}<span>${value}</span></div>`;
  };

  let html = "";
  html += row("Monthly income", fmt.format(income));
  html += row("Tracked expenses", `−${fmt.format(totalExpenses)}`);

  if (commitments.length === 0) {
    // No commitments yet → "After expenses" IS the final number.
    html += row("Left to save", fmt.format(afterExpenses), {
      type: "total",
      negative: afterExpenses < 0,
    });
  } else {
    html += row("After expenses", fmt.format(afterExpenses), {
      type: "subtotal",
      negative: afterExpenses < 0,
    });
    commitments.forEach((c) => {
      html += row(`→ ${c.name} (${Math.round(c.pct)}%)`, `−${fmt.format(c.amount)}`, {
        type: "deduction-row",
      });
    });
    html += row("Unassigned (your general savings)", fmt.format(unassigned), {
      type: "total",
      negative: unassigned < 0,
    });
  }

  rowsEl.innerHTML = html;

  // Hint
  const planned = monthlySavingsAmount();
  if (income <= 0) {
    hint.innerHTML = `Set your monthly income at the top so we can show you how much is left after expenses.`;
    hint.className = "summary-hint";
  } else if (afterExpenses < 0) {
    hint.innerHTML = `Your expenses exceed your income by <strong>${fmt.format(-afterExpenses)}</strong>. Trim something before thinking about savings.`;
    hint.className = "summary-hint warning";
  } else if (commitments.length === 0) {
    if (planned <= 0) {
      hint.innerHTML = `You have <strong>${fmt.format(afterExpenses)}</strong>/month free. Allocate it to your goals or emergency fund in the card above.`;
      hint.className = "summary-hint";
    } else if (afterExpenses + 0.01 < planned) {
      hint.innerHTML = `Your plan was to save <strong>${fmt.format(planned)}</strong>, but expenses only leave you <strong>${fmt.format(afterExpenses)}</strong>. Trim spending or lower your Savings %.`;
      hint.className = "summary-hint warning";
    } else {
      hint.innerHTML = `Nothing is committed yet. Allocate this in <em>Send your savings to your goals</em> so each euro has a job.`;
      hint.className = "summary-hint";
    }
  } else if (unassigned < 0) {
    hint.innerHTML = `You've committed <strong>${fmt.format(-unassigned)}</strong> more than you have. Lower an allocation or trim expenses.`;
    hint.className = "summary-hint warning";
  } else if (unassigned < 1) {
    hint.innerHTML = `Every euro is committed — your plan is fully scheduled this month.`;
    hint.className = "summary-hint";
  } else {
    hint.innerHTML = `<strong>${fmt.format(unassigned)}</strong>/month isn't tied to a specific goal — that's your general savings buffer. Boost a goal's allocation to direct it somewhere specific.`;
    hint.className = "summary-hint";
  }
}

function openExpenseForm(expense) {
  editingExpenseId = expense ? expense.id : null;
  document.getElementById("expense-form-title").textContent = expense ? "Edit expense" : "New expense";
  document.getElementById("save-expense-btn").textContent = expense ? "Save changes" : "Save expense";
  document.getElementById("expense-name").value      = expense ? expense.name : "";
  document.getElementById("expense-category").value  = expense ? expense.categoryId : EXPENSE_CATEGORIES[0].id;
  document.getElementById("expense-amount").value    = expense ? expense.amount : "";
  document.getElementById("expense-frequency").value = expense && expense.frequency === "yearly" ? "yearly" : "monthly";
  const form = document.getElementById("expense-form");
  form.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  document.getElementById("expense-name").focus();
}

function closeExpenseForm() {
  editingExpenseId = null;
  document.getElementById("expense-form").classList.add("hidden");
  document.getElementById("expense-name").value = "";
  document.getElementById("expense-category").value = EXPENSE_CATEGORIES[0].id;
  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-frequency").value = "monthly";
}

document.getElementById("add-expense-btn").addEventListener("click", () => openExpenseForm(null));
document.getElementById("cancel-expense-btn").addEventListener("click", closeExpenseForm);
document.getElementById("save-expense-btn").addEventListener("click", () => {
  const name = document.getElementById("expense-name").value.trim();
  const categoryId = document.getElementById("expense-category").value;
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const frequency = document.getElementById("expense-frequency").value === "yearly" ? "yearly" : "monthly";

  if (!name || !(amount > 0)) {
    alert("Give your expense a name and an amount greater than zero.");
    return;
  }

  if (editingExpenseId) {
    const e = state.expenses.find((x) => x.id === editingExpenseId);
    if (e) {
      e.name = name;
      e.categoryId = categoryId;
      e.amount = amount;
      e.frequency = frequency;
    }
  } else {
    state.expenses.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      categoryId,
      amount,
      frequency,
    });
  }
  saveState();
  renderExpenses();
  renderExpenseSummary();
  renderGoalAllocations();
  renderGoals();
  renderEmergencyFund();
  closeExpenseForm();
});

populateCategorySelect();

// ─────────────────────────────────────────────────────────────
// Theme toggle (light/dark)
// ─────────────────────────────────────────────────────────────
const THEME_KEY = "nestegg.theme";

function currentTheme() {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  const icon = document.getElementById("theme-toggle-icon");
  const label = document.getElementById("theme-toggle-label");
  if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
  if (label) label.textContent = theme === "dark" ? "Light" : "Dark";
}

applyTheme(currentTheme());

const themeToggleEl = document.getElementById("theme-toggle");
if (themeToggleEl) {
  themeToggleEl.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    // Charts use canvas — they don't auto-restyle. Redraw the visible one.
    if (document.getElementById("view-projections").classList.contains("active")) drawChart();
    renderHistoryChart();
  });
}

function chartTheme() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    grid:         dark ? "#2a2a2c" : "#eee",
    label:        dark ? "#8e8e93" : "#888",
    ink:          dark ? "#f0f0f0" : "#1a1a1a",
    contribLine:  dark ? "#f0f0f0" : "#0f0f0f",
    contribFill:  dark ? "rgba(255,255,255,0.06)" : "rgba(15,15,15,0.06)",
    balanceFill:  dark ? "rgba(255,106,26,0.18)"  : "rgba(255,106,26,0.12)",
    orange:       "#ff6a1a",
    dotStroke:    dark ? "#1c1c1e" : "#ffffff",
  };
}

// ─────────────────────────────────────────────────────────────
// PWA — service worker + install prompt
// ─────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Registration can fail (file:// URLs, http without localhost, etc.) — just ignore.
    });
  });
}

let installPromptEvent = null;
const installBtn = document.getElementById("install-btn");
const installHelp = document.getElementById("install-help");

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

if (isStandalone()) {
  installBtn.textContent = "Installed";
  installBtn.disabled = true;
  if (installHelp) installHelp.textContent = "You're running Saverly as an installed app — nice.";
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPromptEvent = e;
  installBtn.disabled = false;
  installBtn.textContent = "Install Saverly";
  try { renderGlobalNotice(); } catch (_) {}
});

installBtn.addEventListener("click", async () => {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  try {
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === "accepted") {
      installBtn.disabled = true;
      installBtn.textContent = "Installed";
    }
  } catch (_) {}
  installPromptEvent = null;
});

window.addEventListener("appinstalled", () => {
  installBtn.disabled = true;
  installBtn.textContent = "Installed";
  installPromptEvent = null;
  showToast("Saverly installed.");
  try { renderGlobalNotice(); } catch (_) {}
  try { renderPersistStatus(); } catch (_) {}
  try { maybePersist(); } catch (_) {}
});

// ─────────────────────────────────────────────────────────────
// PERSISTENT STORAGE
// Browsers may evict a site's storage under pressure, and WebKit clears
// script-writable storage for sites left untouched for ~7 days. Asking for
// persistent mode tells the browser this data is worth keeping.
// ─────────────────────────────────────────────────────────────
const PERSIST_ASKED_KEY = "nestegg.persistAsked";
let persistCheckedThisSession = false;

function storageApiAvailable() {
  return !!(navigator.storage && navigator.storage.persist && navigator.storage.persisted);
}

async function isStoragePersisted() {
  if (!storageApiAvailable()) return null;
  try {
    return await navigator.storage.persisted();
  } catch (_) {
    return null;
  }
}

async function requestStoragePersistence() {
  if (!storageApiAvailable()) return null;
  try {
    return await navigator.storage.persist();
  } catch (_) {
    return null;
  }
}

// Ask silently, at most once per browser, and only once the user has data
// worth protecting. Chrome grants it from engagement heuristics without a
// prompt; Firefox may ask; Safari grants it to installed web apps.
async function maybePersist() {
  if (persistCheckedThisSession) return;
  if (!storageApiAvailable()) return;
  if (!hasSavedData()) return;
  persistCheckedThisSession = true;
  if (await isStoragePersisted()) return;
  if (localStorage.getItem(PERSIST_ASKED_KEY) === "1") return;
  localStorage.setItem(PERSIST_ASKED_KEY, "1");
  await requestStoragePersistence();
  renderPersistStatus();
}

async function renderPersistStatus() {
  const statusEl = document.getElementById("persist-status");
  const btn = document.getElementById("persist-btn");
  if (!statusEl || !btn) return;

  if (!storageApiAvailable()) {
    statusEl.innerHTML = `<strong>Not available in this browser.</strong> Your data is still saved here, it just has no extra protection. Keep an exported backup, and install Saverly to your home screen if you can.`;
    btn.classList.add("hidden");
    return;
  }

  const persisted = await isStoragePersisted();
  if (persisted) {
    statusEl.innerHTML = `<strong class="accent">Protected.</strong> Your browser has agreed to keep Saverly's data unless you delete it yourself.`;
    btn.classList.add("hidden");
  } else {
    statusEl.innerHTML = `<strong>Not protected yet.</strong> Your data is saved, but the browser could clear it to reclaim space.`;
    btn.classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────────
// GLOBAL NOTICE (backup reminder + install nudge, on every tab)
// ─────────────────────────────────────────────────────────────
const NOTICE_SNOOZE_KEY = "nestegg.noticeSnoozedUntil";
const INSTALL_NUDGE_KEY = "nestegg.installNudgeDismissed";

function hasSavedData() {
  return (state.goals && state.goals.length > 0) ||
         (state.expenses && state.expenses.length > 0) ||
         (state.budget && state.budget.income > 0) ||
         (state.emergencyFund && state.emergencyFund.saved > 0);
}

function isIOSLike() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function noticeSnoozed() {
  const until = localStorage.getItem(NOTICE_SNOOZE_KEY);
  return !!until && Date.now() < new Date(until).getTime();
}

function snoozeNotice(days) {
  const until = new Date(Date.now() + days * 86400000).toISOString();
  localStorage.setItem(NOTICE_SNOOZE_KEY, until);
}

function goToDataTab() {
  const tab = document.querySelector('.tab[data-view="data"]');
  if (tab) tab.click();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Returns the highest-priority notice to show, or null.
function pickNotice() {
  if (!hasSavedData() || noticeSnoozed()) return null;

  const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
  if (!lastExport) {
    return {
      html: `<strong>You have no backup yet.</strong> Everything you've entered lives only in this browser. One tap saves a copy you can restore any time.`,
      actionLabel: "Back up now",
      action: exportData,
    };
  }

  const days = Math.floor((Date.now() - new Date(lastExport).getTime()) / 86400000);
  if (days >= 30) {
    return {
      html: `<strong>Your last backup was ${days} days ago.</strong> A fresh copy takes a second and saves you from a bad day.`,
      actionLabel: "Back up now",
      action: exportData,
    };
  }

  // Nothing urgent about backups: nudge installing, which is what actually
  // stops the browser wiping the data out from under them.
  const installDismissed = localStorage.getItem(INSTALL_NUDGE_KEY) === "1";
  if (!installDismissed && !isStandalone()) {
    if (isIOSLike()) {
      return {
        html: `<strong>Add Saverly to your Home Screen.</strong> On iPhone and iPad, Safari clears saved data for sites you haven't opened in about a week. Installed web apps are kept.`,
        actionLabel: "Show me how",
        action: () => { localStorage.setItem(INSTALL_NUDGE_KEY, "1"); goToDataTab(); },
      };
    }
    if (installPromptEvent) {
      return {
        html: `<strong>Install Saverly on this device.</strong> It opens in its own window, works offline, and your saved data becomes much harder to lose.`,
        actionLabel: "Install",
        action: () => { localStorage.setItem(INSTALL_NUDGE_KEY, "1"); installBtn.click(); },
      };
    }
  }

  return null;
}

let currentNoticeAction = null;

function renderGlobalNotice() {
  const box = document.getElementById("global-notice");
  const textEl = document.getElementById("global-notice-text");
  const actionBtn = document.getElementById("global-notice-action");
  if (!box || !textEl || !actionBtn) return;

  const notice = pickNotice();
  if (!notice) {
    box.classList.add("hidden");
    currentNoticeAction = null;
    return;
  }

  textEl.innerHTML = notice.html;
  actionBtn.textContent = notice.actionLabel;
  currentNoticeAction = notice.action;
  box.classList.remove("hidden");
}

// ─────────────────────────────────────────────────────────────
// DATA (export / import / reset)
// ─────────────────────────────────────────────────────────────
const LAST_EXPORT_KEY = "nestegg.lastExport";

function exportData() {
  const payload = {
    app: "Saverly",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saverly-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  renderGlobalNotice();
  renderDataWarning();
  showToast("Backup downloaded.");
}

function renderDataWarning() {
  const warning = document.getElementById("data-warning");
  if (!warning) return;
  // The global notice bar already carries this message on every tab.
  // Don't say the same thing twice on the Data tab.
  const globalNotice = document.getElementById("global-notice");
  if (globalNotice && !globalNotice.classList.contains("hidden")) {
    warning.classList.add("hidden");
    return;
  }
  const last = localStorage.getItem(LAST_EXPORT_KEY);
  // Show only if the user has actually entered some data to lose.
  const hasData = (state.goals && state.goals.length > 0) ||
                  (state.expenses && state.expenses.length > 0) ||
                  (state.budget && state.budget.income > 0) ||
                  (state.emergencyFund && state.emergencyFund.saved > 0);
  if (!hasData) {
    warning.classList.add("hidden");
    return;
  }
  if (!last) {
    warning.innerHTML = `<strong>No backup yet.</strong> Your data lives only in this browser. Tap <em>Download my data</em> below to save a copy somewhere safe.`;
    warning.classList.remove("hidden");
    return;
  }
  const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
  if (days >= 30) {
    warning.innerHTML = `<strong>It's been ${days} days since your last backup.</strong> Consider exporting again — your data lives only in this browser.`;
    warning.classList.remove("hidden");
  } else {
    warning.classList.add("hidden");
  }
}

function applyImportedData(data) {
  state.goals = Array.isArray(data.goals) ? data.goals : [];
  state.expenses = Array.isArray(data.expenses) ? data.expenses : [];
  state.budget = data.budget ?? structuredClone(defaultState.budget);
  state.projection = data.projection ?? structuredClone(defaultState.projection);
  state.lastLog = data.lastLog ?? null;
  state.logHistory = Array.isArray(data.logHistory) ? data.logHistory : [];
  state.emergencyFund = data.emergencyFund
    ? { ...defaultState.emergencyFund, ...data.emergencyFund }
    : structuredClone(defaultState.emergencyFund);
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch {
      alert("This doesn't look like valid JSON.");
      return;
    }
    // Accept the wrapped format {app, version, data} or a raw state object.
    // "Nest Egg" is the app's former name: backups exported before the rename
    // must keep working, so both labels are accepted.
    const isWrapped = !!(parsed && parsed.data &&
      (parsed.app === "Saverly" || parsed.app === "Nest Egg"));
    const data = isWrapped ? parsed.data : parsed;
    if (!data || typeof data !== "object") {
      alert("This doesn't look like a Saverly backup.");
      return;
    }
    if (!confirm("Replace your current data with this backup? This can't be undone.")) return;

    applyImportedData(data);
    saveState();
    syncInputValuesFromState();
    rerenderAll();
    showToast("Backup imported.");
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm("Delete ALL your data — goals, expenses, budget, emergency fund, history? This cannot be undone.")) return;
  if (!confirm("Really sure? Click OK to wipe everything.")) return;

  applyImportedData(structuredClone(defaultState));
  saveState();
  syncInputValuesFromState();
  rerenderAll();
  showToast("All data cleared.");
}

// After we mutate state from outside the regular input handlers (import/reset),
// the form fields don't auto-refresh — sync them by hand.
function syncInputValuesFromState() {
  document.getElementById("income").value = state.budget.income || "";
  document.getElementById("proj-monthly").value = state.projection.monthly;
  document.getElementById("proj-initial").value = state.projection.initial;
  document.getElementById("proj-years").value = state.projection.years;
  document.getElementById("proj-rate").value = state.projection.rate;
}

function rerenderAll() {
  renderEmergencyFund();
  renderGoals();
  renderBudget();
  renderExpenses();
  renderProjections();
  renderHistoryChart();
  renderNetWorth();
}

document.getElementById("export-btn").addEventListener("click", exportData);
document.getElementById("reset-btn").addEventListener("click", resetAllData);
document.getElementById("import-btn").addEventListener("click", () => {
  document.getElementById("import-file").click();
});
document.getElementById("import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  handleImportFile(file);
  e.target.value = "";
});

// ─────────────────────────────────────────────────────────────
// Initial render
// ─────────────────────────────────────────────────────────────
renderOnboarding();
renderEmergencyFund();
renderGoals();
renderBudget();
renderExpenses();
renderProjections();
renderHistoryChart();
renderNetWorth();

// ── Global notice wiring ──
document.getElementById("global-notice-action").addEventListener("click", () => {
  if (typeof currentNoticeAction === "function") currentNoticeAction();
  renderGlobalNotice();
  renderDataWarning();
});

document.getElementById("global-notice-dismiss").addEventListener("click", () => {
  snoozeNotice(7);
  renderGlobalNotice();
  renderDataWarning();
});

// ── Storage protection wiring ──
document.getElementById("persist-btn").addEventListener("click", async () => {
  const granted = await requestStoragePersistence();
  localStorage.setItem(PERSIST_ASKED_KEY, "1");
  await renderPersistStatus();
  if (granted) {
    showToast("Your data is now protected.");
  } else {
    showToast("The browser said no. Installing Saverly usually changes its mind.");
  }
});

renderGlobalNotice();
renderDataWarning();
renderPersistStatus();
maybePersist();
