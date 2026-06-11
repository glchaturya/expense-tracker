const STORAGE_KEY = 'expenseTracker.v1';
const PROFILE_PIC_KEY = 'expenseTracker.profilePic';
const PROFILE_NAME_KEY = 'expenseTracker.profileName';

const storage = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
const state = storage || {
  budget: 1500,
  expenses: [],
  goals: []
};

const dateToday = new Date().toISOString().slice(0, 10);

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initProfilePicture() {
  const profilePic = document.querySelector('#profile-pic');
  const uploadBtn = document.querySelector('#upload-btn');
  const profileUpload = document.querySelector('#profile-upload');
  const profileName = document.querySelector('#profile-name');

  if (!profilePic || !uploadBtn || !profileUpload) return;

  // Load saved profile picture
  const savedPicture = localStorage.getItem(PROFILE_PIC_KEY);
  if (savedPicture) {
    profilePic.src = savedPicture;
    profilePic.style.display = 'block';
  } else {
    profilePic.style.display = 'none';
  }

  // Load saved profile name
  if (profileName) {
    const savedName = localStorage.getItem(PROFILE_NAME_KEY) || 'Guest';
    profileName.textContent = savedName;
  }

  // Upload button click
  uploadBtn.addEventListener('click', () => {
    profileUpload.click();
  });

  // Profile picture click to upload
  profilePic.addEventListener('click', () => {
    profileUpload.click();
  });

  // Click name to edit
  if (profileName) {
    profileName.addEventListener('click', () => {
      const current = profileName.textContent || '';
      const newName = prompt('Enter your display name', current);
      if (newName !== null) {
        const trimmed = newName.trim();
        profileName.textContent = trimmed || 'Guest';
        localStorage.setItem(PROFILE_NAME_KEY, profileName.textContent);
      }
    });
  }

  // File input change
  profileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      localStorage.setItem(PROFILE_PIC_KEY, imageData);
      profilePic.src = imageData;
      profilePic.style.display = 'block';
      alert('Profile picture updated successfully!');
    };
    reader.readAsDataURL(file);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function parseDate(dateString) {
  return new Date(dateString);
}

function sortExpenses(expenses, order) {
  return [...expenses].sort((a, b) => {
    if (order === 'newest') return b.date.localeCompare(a.date);
    if (order === 'oldest') return a.date.localeCompare(b.date);
    if (order === 'amountHigh') return b.amount - a.amount;
    if (order === 'amountLow') return a.amount - b.amount;
    return 0;
  });
}

function dashboardInit() {
  const budgetInput = document.querySelector('#budget-input');
  const totalSpentElem = document.querySelector('#total-spent');
  const monthlyBudgetElem = document.querySelector('#monthly-budget');
  const remainingBudgetElem = document.querySelector('#remaining-budget');
  const expenseForm = document.querySelector('#expense-form');
  const expenseList = document.querySelector('#expense-list');
  const categoryFilter = document.querySelector('#category-filter');
  const sortOrder = document.querySelector('#sort-order');
  const expenseDate = document.querySelector('#expense-date');
  const budgetButton = document.querySelector('#save-budget');

  expenseDate.value = dateToday;
  budgetInput.value = state.budget;

  function getFilteredExpenses() {
    let filtered = state.expenses;
    const category = categoryFilter.value;
    if (category !== 'All') {
      filtered = filtered.filter(expense => expense.category === category);
    }
    return sortExpenses(filtered, sortOrder.value);
  }

  function renderSummary() {
    const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    totalSpentElem.textContent = formatCurrency(totalSpent);
    monthlyBudgetElem.textContent = formatCurrency(state.budget);
    remainingBudgetElem.textContent = formatCurrency(state.budget - totalSpent);
  }

  function renderExpenses() {
    const expenses = getFilteredExpenses();
    if (!expenses.length) {
      expenseList.innerHTML = '<div class="expense-item"><div class="expense-meta"><strong>No expenses yet</strong><small>Add your first entry to see history and insights.</small></div></div>';
      return;
    }

    expenseList.innerHTML = expenses.map(expense => {
      return `
        <div class="expense-item">
          <div class="expense-meta">
            <strong>${expense.description}</strong>
            <small>${expense.category} • ${formatCurrency(expense.amount)} • ${expense.date}</small>
          </div>
          <div class="expense-actions">
            <button type="button" data-id="${expense.id}" class="delete-expense">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    expenseList.querySelectorAll('.delete-expense').forEach(button => {
      button.addEventListener('click', event => {
        const id = event.target.dataset.id;
        state.expenses = state.expenses.filter(item => item.id !== id);
        saveState();
        renderSummary();
        renderExpenses();
      });
    });
  }

  budgetButton.addEventListener('click', () => {
    const value = Number(budgetInput.value);
    if (isNaN(value) || value < 0) return;
    state.budget = value;
    saveState();
    renderSummary();
  });

  expenseForm.addEventListener('submit', event => {
    event.preventDefault();
    const description = document.querySelector('#expense-description').value.trim();
    const amount = Number(document.querySelector('#expense-amount').value);
    const category = document.querySelector('#expense-category').value;
    const date = document.querySelector('#expense-date').value;
    if (!description || isNaN(amount) || amount <= 0 || !date) return;

    state.expenses.push({
      id: Date.now().toString(),
      description,
      amount,
      category,
      date
    });
    saveState();
    expenseForm.reset();
    expenseDate.value = dateToday;
    renderSummary();
    renderExpenses();
  });

  categoryFilter.addEventListener('change', renderExpenses);
  sortOrder.addEventListener('change', renderExpenses);

  renderSummary();
  renderExpenses();
}

function goalsInit() {
  const goalForm = document.querySelector('#goal-form');
  const contributionForm = document.querySelector('#contribution-form');
  const goalList = document.querySelector('#goal-list');
  const goalSelect = document.querySelector('#contribution-goal');
  const activeGoalsCount = document.querySelector('#active-goals-count');
  const totalGoalSavings = document.querySelector('#total-goal-savings');

  function updateGoalSelect() {
    goalSelect.innerHTML = state.goals.length ? state.goals.map(goal => `<option value="${goal.id}">${goal.title}</option>`).join('') : '<option value="" disabled>No active goals</option>';
  }

  function renderGoals() {
    if (!state.goals.length) {
      goalList.innerHTML = '<div class="goal-item"><div class="goal-meta"><strong>No goals yet</strong><small>Create one and start saving today.</small></div></div>';
    } else {
      goalList.innerHTML = state.goals.map(goal => {
        const progress = Math.min(100, (goal.saved / goal.target) * 100 || 0);
        return `
          <div class="goal-item">
            <div class="goal-meta">
              <strong>${goal.title}</strong>
              <small>Saved ${formatCurrency(goal.saved)} of ${formatCurrency(goal.target)} • Due ${goal.deadline}</small>
            </div>
            <div class="progress-bar"><span style="width: ${progress}%"></span></div>
            <div class="goal-actions">
              <button type="button" data-id="${goal.id}" class="secondary">Deposit</button>
              <button type="button" data-id="${goal.id}" class="delete-goal">Delete</button>
            </div>
          </div>
        `;
      }).join('');

      goalList.querySelectorAll('.delete-goal').forEach(button => {
        button.addEventListener('click', event => {
          const id = event.target.dataset.id;
          state.goals = state.goals.filter(goal => goal.id !== id);
          saveState();
          renderGoals();
          updateGoalSelect();
          renderGoalSummary();
        });
      });

      goalList.querySelectorAll('.secondary').forEach(button => {
        button.addEventListener('click', event => {
          const id = event.target.dataset.id;
          const selected = state.goals.find(goal => goal.id === id);
          if (!selected) return;
          const amount = Number(prompt(`Add contribution to ${selected.title}`, '50'));
          if (!amount || amount <= 0) return;
          selected.saved += amount;
          saveState();
          renderGoals();
          updateGoalSelect();
          renderGoalSummary();
        });
      });
    }
  }

  function renderGoalSummary() {
    const activeCount = state.goals.length;
    const totalSaved = state.goals.reduce((sum, goal) => sum + goal.saved, 0);
    activeGoalsCount.textContent = activeCount;
    totalGoalSavings.textContent = formatCurrency(totalSaved);
  }

  goalForm.addEventListener('submit', event => {
    event.preventDefault();
    const title = document.querySelector('#goal-title').value.trim();
    const target = Number(document.querySelector('#goal-target').value);
    const deadline = document.querySelector('#goal-deadline').value;
    if (!title || isNaN(target) || target <= 0 || !deadline) return;

    state.goals.push({
      id: Date.now().toString(),
      title,
      target,
      saved: 0,
      deadline
    });
    saveState();
    goalForm.reset();
    updateGoalSelect();
    renderGoals();
    renderGoalSummary();
  });

  contributionForm.addEventListener('submit', event => {
    event.preventDefault();
    const goalId = goalSelect.value;
    const amount = Number(document.querySelector('#contribution-amount').value);
    if (!goalId || isNaN(amount) || amount <= 0) return;

    const goal = state.goals.find(goalItem => goalItem.id === goalId);
    if (!goal) return;
    goal.saved += amount;
    saveState();
    contributionForm.reset();
    updateGoalSelect();
    renderGoals();
    renderGoalSummary();
  });

  updateGoalSelect();
  renderGoals();
  renderGoalSummary();
}

function analysisInit() {
  const categoryChart = document.querySelector('#category-chart');
  const trendChart = document.querySelector('#trend-chart');
  const insightGrid = document.querySelector('#analysis-insights');

  const categories = ['Food', 'Housing', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Other'];
  const monthlyLabels = [];
  const monthlyTotals = {};

  const today = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyLabels.push(label);
    monthlyTotals[label] = 0;
  }

  const categoryTotals = categories.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});

  state.expenses.forEach(expense => {
    if (categoryTotals[expense.category] !== undefined) {
      categoryTotals[expense.category] += expense.amount;
    } else {
      categoryTotals.Other += expense.amount;
    }

    const date = parseDate(expense.date);
    const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (monthlyTotals[key] !== undefined) {
      monthlyTotals[key] += expense.amount;
    }
  });

  const totalExpenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (!state.expenses.length) {
    categoryChart.innerHTML = '<div class="expense-item"><div class="expense-meta"><strong>No data yet.</strong><small>Enter expenses on the dashboard to enable analysis.</small></div></div>';
    trendChart.innerHTML = '<div class="expense-item"><div class="expense-meta"><strong>Empty trend.</strong><small>Add expenses across dates to see monthly patterns.</small></div></div>';
    insightGrid.innerHTML = '<div class="insight-card"><span>Start tracking</span><strong>Add your first expense and return for insights.</strong></div>';
    return;
  }

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  categoryChart.innerHTML = sortedCategories.map(([category, amount]) => {
    const percentage = totalExpenses ? Math.round((amount / totalExpenses) * 100) : 0;
    return `
      <article class="category-card">
        <span>${category}</span>
        <strong>${formatCurrency(amount)}</strong>
        <div class="category-bar"><span style="width: ${percentage}%"></span></div>
        <small>${percentage}% of total spending</small>
      </article>
    `;
  }).join('');

  const trendMax = Math.max(...Object.values(monthlyTotals), 1);
  trendChart.innerHTML = monthlyLabels.map(label => {
    const amount = monthlyTotals[label];
    const width = Math.round((amount / trendMax) * 100);
    return `
      <div class="trend-row">
        <div class="trend-label">
          <strong>${label}</strong>
          <small>${formatCurrency(amount)}</small>
        </div>
        <div class="category-bar"><span style="width: ${width}%"></span></div>
      </div>
    `;
  }).join('');

  const topCategory = sortedCategories[0];
  const categoryInsight = topCategory ? `${topCategory[0]} is your largest expense category.` : 'No category insight available.';
  insightGrid.innerHTML = `
    <article class="insight-card">
      <span>Total spend</span>
      <strong>${formatCurrency(totalExpenses)}</strong>
    </article>
    <article class="insight-card">
      <span>Top category</span>
      <strong>${categoryInsight}</strong>
    </article>
    <article class="insight-card">
      <span>Budget outlook</span>
      <strong>${state.budget ? `You have ${formatCurrency(state.budget - totalExpenses)} remaining this month.` : 'Set a budget on the dashboard.'}</strong>
    </article>
  `;
}

function init() {
  initProfilePicture();
  const page = document.body.dataset.page;
  if (page === 'dashboard') {
    dashboardInit();
  }
  if (page === 'goals') {
    goalsInit();
  }
  if (page === 'analysis') {
    analysisInit();
  }
}

init();

init();
