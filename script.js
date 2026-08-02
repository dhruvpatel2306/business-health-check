const form = document.getElementById('metrics-form');
const resultsEl = document.getElementById('results');

const healthScoreEl = document.getElementById('health-score');
const profitMarginEl = document.getElementById('profit-margin');
const burnRateEl = document.getElementById('burn-rate');
const cashRunwayEl = document.getElementById('cash-runway');
const historyListEl = document.getElementById('history-list');
const benchmarkBoxEl = document.getElementById('benchmark-box');

const STORAGE_KEY = 'businessHealthEntries';

const BENCHMARKS = {
  retail: { label: 'Retail', marginLow: 5, marginHigh: 15 },
  saas: { label: 'SaaS / Software', marginLow: 20, marginHigh: 40 },
  restaurant: { label: 'Restaurant / Food', marginLow: 3, marginHigh: 9 },
  services: { label: 'Professional Services', marginLow: 15, marginHigh: 30 }
};

let entries = loadEntries();
let trendChart = null;
let expenseChart = null;

renderHistory();
renderTrendChart();
renderExpenseChart();

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const monthLabel = document.getElementById('month-label').value.trim();
  const businessType = document.getElementById('business-type').value;
  const revenue = parseFloat(document.getElementById('revenue').value) || 0;

  const expenseCategories = {
    rent: parseFloat(document.getElementById('exp-rent').value) || 0,
    salaries: parseFloat(document.getElementById('exp-salaries').value) || 0,
    marketing: parseFloat(document.getElementById('exp-marketing').value) || 0,
    other: parseFloat(document.getElementById('exp-other').value) || 0
  };

  const totalExpenses = Object.values(expenseCategories).reduce((sum, val) => sum + val, 0);

  const receivables = parseFloat(document.getElementById('receivables').value) || 0;
  const cashBalance = parseFloat(document.getElementById('cash-balance').value) || 0;

  if (!monthLabel) return;

  const metrics = calculateMetrics(revenue, totalExpenses, receivables, cashBalance);

  const entry = {
    id: Date.now(),
    monthLabel,
    businessType,
    revenue,
    expenseCategories,
    totalExpenses,
    receivables,
    cashBalance,
    metrics
  };

  entries.push(entry);
  saveEntries();
  renderHistory();
  renderTrendChart();
  renderExpenseChart();
  displayResults(metrics);
  displayBenchmark(businessType, parseFloat(metrics.profitMargin));

  form.reset();
});

function calculateMetrics(revenue, expenses, receivables, cashBalance) {
  let profitMargin = 0;
  if (revenue > 0) {
    profitMargin = ((revenue - expenses) / revenue) * 100;
  }

  const isBurning = expenses > revenue;
  const burnRate = isBurning ? (expenses - revenue) : 0;

  let runwayMonths = null;
  if (isBurning && burnRate > 0) {
    runwayMonths = cashBalance / burnRate;
  }

  let score = 50;
  score += Math.max(-30, Math.min(30, profitMargin));

  if (runwayMonths === null) {
    score += 20;
  } else if (runwayMonths >= 6) {
    score += 15;
  } else if (runwayMonths >= 3) {
    score += 5;
  } else {
    score -= 15;
  }

  if (revenue > 0 && receivables > revenue * 2) {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    profitMargin: profitMargin.toFixed(1),
    burnRate: burnRate.toFixed(0),
    isBurning,
    runwayMonths: runwayMonths !== null ? runwayMonths.toFixed(1) : null,
    score
  };
}

function displayResults(metrics) {
  resultsEl.classList.remove('hidden');

  healthScoreEl.textContent = metrics.score;
  profitMarginEl.textContent = `${metrics.profitMargin}%`;

  if (metrics.isBurning) {
    burnRateEl.textContent = `₹${metrics.burnRate} / month`;
  } else {
    burnRateEl.textContent = 'Profitable — no burn';
  }

  if (metrics.runwayMonths !== null) {
    cashRunwayEl.textContent = `${metrics.runwayMonths} months`;
  } else {
    cashRunwayEl.textContent = 'Not applicable';
  }
}

function displayBenchmark(businessType, profitMargin) {
  if (!businessType || !BENCHMARKS[businessType]) {
    benchmarkBoxEl.innerHTML = '';
    return;
  }

  const benchmark = BENCHMARKS[businessType];
  let comparisonText = '';
  let statusClass = '';

  if (profitMargin < benchmark.marginLow) {
    comparisonText = `Your profit margin (${profitMargin.toFixed(1)}%) is below the typical range for ${benchmark.label} (${benchmark.marginLow}-${benchmark.marginHigh}%). Worth investigating why.`;
    statusClass = 'benchmark-low';
  } else if (profitMargin > benchmark.marginHigh) {
    comparisonText = `Your profit margin (${profitMargin.toFixed(1)}%) is above the typical range for ${benchmark.label} (${benchmark.marginLow}-${benchmark.marginHigh}%). Strong performance.`;
    statusClass = 'benchmark-high';
  } else {
    comparisonText = `Your profit margin (${profitMargin.toFixed(1)}%) is within the typical range for ${benchmark.label} (${benchmark.marginLow}-${benchmark.marginHigh}%).`;
    statusClass = 'benchmark-normal';
  }

  benchmarkBoxEl.innerHTML = `<p class="benchmark-text ${statusClass}">${comparisonText}</p>`;
}

function renderHistory() {
  historyListEl.innerHTML = '';

  if (entries.length === 0) {
    historyListEl.textContent = 'No entries yet. Add your first month above.';
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-month">${entry.monthLabel}</div>
      <div class="history-details">
        Score: ${entry.metrics.score} | Margin: ${entry.metrics.profitMargin}% |
        ${entry.metrics.isBurning ? `Burn: ₹${entry.metrics.burnRate}/mo` : 'Profitable'}
      </div>
      <button class="delete-entry" data-id="${entry.id}">Delete</button>
    `;
    historyListEl.appendChild(item);
  });

  document.querySelectorAll('.delete-entry').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = Number(this.getAttribute('data-id'));
      entries = entries.filter(e => e.id !== id);
      saveEntries();
      renderHistory();
      renderTrendChart();
      renderExpenseChart();
    });
  });
}

function renderTrendChart() {
  if (entries.length === 0) {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
    return;
  }

  const labels = entries.map(e => e.monthLabel);
  const revenueData = entries.map(e => e.revenue);
  const expensesData = entries.map(e => e.totalExpenses);

  const ctx = document.getElementById('trend-chart').getContext('2d');

  if (trendChart) {
    trendChart.destroy();
  }

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: '#2f7a4f',
          backgroundColor: 'rgba(47, 122, 79, 0.1)',
          tension: 0.2
        },
        {
          label: 'Expenses',
          data: expensesData,
          borderColor: '#a3453a',
          backgroundColor: 'rgba(163, 69, 58, 0.1)',
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderExpenseChart() {
  if (entries.length === 0) {
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    return;
  }

  const latest = entries[entries.length - 1];
  const categories = latest.expenseCategories;

  const ctx = document.getElementById('expense-chart').getContext('2d');

  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Rent', 'Salaries', 'Marketing', 'Other'],
      datasets: [{
        data: [categories.rent, categories.salaries, categories.marketing, categories.other],
        backgroundColor: ['#2f4f3a', '#a3453a', '#c9a227', '#4a4a4a']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'right' } }
    }
  });
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}