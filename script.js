const form = document.getElementById('metrics-form');
const resultsEl = document.getElementById('results');

const healthScoreEl = document.getElementById('health-score');
const profitMarginEl = document.getElementById('profit-margin');
const burnRateEl = document.getElementById('burn-rate');
const cashRunwayEl = document.getElementById('cash-runway');
const historyListEl = document.getElementById('history-list');
const benchmarkBoxEl = document.getElementById('benchmark-box');
const goalCalculateBtn = document.getElementById('goal-calculate-btn');
const goalResultEl = document.getElementById('goal-result');
const aiDiagnosticBtn = document.getElementById('ai-diagnostic-btn');
const aiDiagnosticOutputEl = document.getElementById('ai-diagnostic-output');
const chatWindowEl = document.getElementById('chat-window');
const chatInputEl = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const checklistGenerateBtn = document.getElementById('checklist-generate-btn');
const checklistOutputEl = document.getElementById('checklist-output');
const checklistProgressEl = document.getElementById('checklist-progress');
const simRevenueSlider = document.getElementById('sim-revenue-slider');
const simExpenseSlider = document.getElementById('sim-expense-slider');
const simRevenueLabel = document.getElementById('sim-revenue-label');
const simExpenseLabel = document.getElementById('sim-expense-label');
const simulatorOutputEl = document.getElementById('simulator-output');
const voiceBtn = document.getElementById('voice-btn');
const voiceStatusEl = document.getElementById('voice-status');
const pdfExportBtn = document.getElementById('pdf-export-btn');

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
let chatHistory = [];

renderHistory();
renderTrendChart();
renderExpenseChart();

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const monthLabel = document.getElementById('month-label').value.trim();
  const businessType = document.getElementById('business-type').value;
  const revenue = parseFloat(document.getElementById('revenue').value) || 0;
  const notes = document.getElementById('notes').value.trim();

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
    notes,
    metrics,
    checklist: []
  };

  entries.push(entry);
  saveEntries();
  renderHistory();
  renderTrendChart();
  renderExpenseChart();
  displayResults(metrics);
  displayBenchmark(businessType, parseFloat(metrics.profitMargin));

  aiDiagnosticOutputEl.innerHTML = '';
  chatHistory = [];
  chatWindowEl.innerHTML = '';
  checklistOutputEl.innerHTML = '';
  checklistProgressEl.innerHTML = '';

  simRevenueSlider.value = 0;
  simExpenseSlider.value = 0;
  simRevenueLabel.textContent = '0%';
  simExpenseLabel.textContent = '0%';
  runSimulation();

  form.reset();
});

goalCalculateBtn.addEventListener('click', function () {
  if (entries.length === 0) {
    goalResultEl.innerHTML = `<p class="goal-text">Add at least one month of data first.</p>`;
    return;
  }

  const latest = entries[entries.length - 1];
  const targetRunway = parseFloat(document.getElementById('goal-runway').value) || 0;

  if (targetRunway <= 0) {
    goalResultEl.innerHTML = `<p class="goal-text">Enter a valid target runway.</p>`;
    return;
  }

  const revenue = latest.revenue;
  const expenses = latest.totalExpenses;
  const cashBalance = latest.cashBalance;

  if (expenses <= revenue) {
    goalResultEl.innerHTML = `<p class="goal-text goal-good">You're currently profitable (no cash burn), so runway isn't a concern. Your goal is already met.</p>`;
    return;
  }

  const currentBurn = expenses - revenue;
  const currentRunway = cashBalance / currentBurn;
  const maxAllowedBurn = cashBalance / targetRunway;

  if (currentRunway >= targetRunway) {
    goalResultEl.innerHTML = `<p class="goal-text goal-good">You already have ${currentRunway.toFixed(1)} months of runway, which meets your ${targetRunway}-month goal.</p>`;
    return;
  }

  const requiredBurnReduction = currentBurn - maxAllowedBurn;

  goalResultEl.innerHTML = `
    <p class="goal-text goal-warning">
      To reach ${targetRunway} months of runway, you need to reduce your monthly burn by
      approximately <strong>₹${requiredBurnReduction.toFixed(0)}</strong>.
      This means either increasing revenue by that amount, cutting expenses by that amount,
      or a combination of both.
    </p>
  `;
});

aiDiagnosticBtn.addEventListener('click', async function () {
  if (entries.length === 0) {
    aiDiagnosticOutputEl.innerHTML = `<p class="ai-text">Add at least one month of data first.</p>`;
    return;
  }

  const latest = entries[entries.length - 1];

  aiDiagnosticOutputEl.innerHTML = `<p class="ai-loading">Analyzing your business data...</p>`;
  aiDiagnosticBtn.disabled = true;

  const prompt = buildContextPrompt(latest) + `

Give a short, plain-English diagnostic (3-4 sentences) covering: overall health, the biggest risk if any, and one specific actionable recommendation. Be direct and practical, avoid generic advice.`;

  try {
    const response = await puter.ai.chat(prompt);
    const responseText = extractText(response);
    aiDiagnosticOutputEl.innerHTML = `<p class="ai-text">${responseText.replace(/\n/g, '<br>')}</p>`;
    chatHistory.push({ role: 'assistant', content: responseText });
  } catch (error) {
    aiDiagnosticOutputEl.innerHTML = `<p class="ai-text ai-error">Could not get AI diagnostic. Error: ${error.message || error}</p>`;
  } finally {
    aiDiagnosticBtn.disabled = false;
  }
});

checklistGenerateBtn.addEventListener('click', async function () {
  if (entries.length === 0) {
    checklistOutputEl.innerHTML = `<p class="ai-text">Add at least one month of data first.</p>`;
    return;
  }

  const latest = entries[entries.length - 1];

  checklistOutputEl.innerHTML = `<p class="ai-loading">Generating your action checklist...</p>`;
  checklistGenerateBtn.disabled = true;

  const prompt = buildContextPrompt(latest) + `

Based on this data, list exactly 3 to 4 specific, actionable steps this business owner should take this month.
Respond with ONLY a JSON array of short strings, nothing else, no explanation, no markdown formatting. Example format:
["Reduce marketing spend by 10%", "Follow up on overdue receivables from top 3 clients", "Renegotiate rent or explore a smaller space"]`;

  try {
    const response = await puter.ai.chat(prompt);
    const responseText = extractText(response);
    const items = parseChecklistResponse(responseText);

    latest.checklist = items.map(text => ({ text, done: false }));
    saveEntries();
    renderChecklist(latest);
  } catch (error) {
    checklistOutputEl.innerHTML = `<p class="ai-text ai-error">Could not generate checklist. Error: ${error.message || error}</p>`;
  } finally {
    checklistGenerateBtn.disabled = false;
  }
});

pdfExportBtn.addEventListener('click', function () {
  if (entries.length === 0) {
    alert('Add at least one month of data first.');
    return;
  }

  const latest = entries[entries.length - 1];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20;
  const lineHeight = 8;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text('Business Health Report', pageWidth / 2, y, { align: 'center' });
  y += lineHeight * 2;

  doc.setFontSize(11);
  doc.text(`Month: ${latest.monthLabel}`, 20, y); y += lineHeight;
  doc.text(`Business Type: ${latest.businessType || 'Not specified'}`, 20, y); y += lineHeight * 1.5;

  doc.setFontSize(14);
  doc.text(`Health Score: ${latest.metrics.score} / 100`, 20, y); y += lineHeight * 1.5;

  doc.setFontSize(11);
  doc.text(`Profit Margin: ${latest.metrics.profitMargin}%`, 20, y); y += lineHeight;
  doc.text(`Burn Rate: ${latest.metrics.isBurning ? '₹' + latest.metrics.burnRate + ' / month' : 'Profitable — no burn'}`, 20, y); y += lineHeight;
  doc.text(`Cash Runway: ${latest.metrics.runwayMonths !== null ? latest.metrics.runwayMonths + ' months' : 'Not applicable'}`, 20, y); y += lineHeight * 1.5;

  doc.setFontSize(12);
  doc.text('Financials', 20, y); y += lineHeight;
  doc.setFontSize(10);
  doc.text(`Revenue: Rs. ${latest.revenue}`, 20, y); y += lineHeight;
  doc.text(`Total Expenses: Rs. ${latest.totalExpenses}`, 20, y); y += lineHeight;
  doc.text(`  - Rent: Rs. ${latest.expenseCategories.rent}`, 25, y); y += lineHeight;
  doc.text(`  - Salaries: Rs. ${latest.expenseCategories.salaries}`, 25, y); y += lineHeight;
  doc.text(`  - Marketing: Rs. ${latest.expenseCategories.marketing}`, 25, y); y += lineHeight;
  doc.text(`  - Other: Rs. ${latest.expenseCategories.other}`, 25, y); y += lineHeight;
  doc.text(`Receivables: Rs. ${latest.receivables}`, 20, y); y += lineHeight;
  doc.text(`Cash Balance: Rs. ${latest.cashBalance}`, 20, y); y += lineHeight * 1.5;

  if (latest.notes) {
    doc.setFontSize(12);
    doc.text('Notes', 20, y); y += lineHeight;
    doc.setFontSize(10);
    const notesLines = doc.splitTextToSize(latest.notes, pageWidth - 40);
    doc.text(notesLines, 20, y);
    y += lineHeight * notesLines.length + lineHeight * 0.5;
  }

  if (latest.checklist && latest.checklist.length > 0) {
    doc.setFontSize(12);
    doc.text('Action Checklist', 20, y); y += lineHeight;
    doc.setFontSize(10);
    latest.checklist.forEach(item => {
      const checkbox = item.done ? '[x]' : '[ ]';
      const itemLines = doc.splitTextToSize(`${checkbox} ${item.text}`, pageWidth - 40);
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(itemLines, 20, y);
      y += lineHeight * itemLines.length;
    });
    y += lineHeight * 0.5;
  }

  const aiText = aiDiagnosticOutputEl.querySelector('.ai-text')?.textContent;
  if (aiText) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text('AI Diagnostic', 20, y); y += lineHeight;
    doc.setFontSize(10);
    const aiLines = doc.splitTextToSize(aiText, pageWidth - 40);
    doc.text(aiLines, 20, y);
    y += lineHeight * aiLines.length;
  }

  const filename = `business-health-${latest.monthLabel.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
});

chatSendBtn.addEventListener('click', sendChatMessage);
chatInputEl.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') sendChatMessage();
});

simRevenueSlider.addEventListener('input', function () {
  simRevenueLabel.textContent = `${this.value}%`;
  runSimulation();
});

simExpenseSlider.addEventListener('input', function () {
  simExpenseLabel.textContent = `${this.value}%`;
  runSimulation();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = function () {
    voiceStatusEl.textContent = 'Listening...';
    voiceBtn.disabled = true;
  };

  recognition.onerror = function (event) {
    voiceStatusEl.textContent = `Could not hear that (${event.error}). Try again.`;
    voiceBtn.disabled = false;
  };

  recognition.onend = function () {
    voiceBtn.disabled = false;
  };

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript.toLowerCase();
    voiceStatusEl.textContent = `Heard: "${transcript}"`;
    parseVoiceCommand(transcript);
  };

  voiceBtn.addEventListener('click', function () {
    recognition.start();
  });
} else {
  voiceBtn.disabled = true;
  voiceStatusEl.textContent = 'Voice input not supported in this browser. Try Chrome or Edge.';
}

function parseVoiceCommand(transcript) {
  const fieldMap = {
    revenue: 'revenue',
    rent: 'exp-rent',
    salary: 'exp-salaries',
    salaries: 'exp-salaries',
    marketing: 'exp-marketing',
    other: 'exp-other',
    receivable: 'receivables',
    receivables: 'receivables',
    'cash balance': 'cash-balance',
    cash: 'cash-balance',
    balance: 'cash-balance'
  };

  let matchedField = null;
  for (const keyword in fieldMap) {
    if (transcript.includes(keyword)) {
      matchedField = fieldMap[keyword];
      break;
    }
  }

  if (transcript.includes('note')) {
    const noteText = transcript.replace(/^.*?note[s]?\s*/i, '').trim();
    if (noteText) {
      const notesField = document.getElementById('notes');
      notesField.value = notesField.value ? notesField.value + '. ' + noteText : noteText;
      voiceStatusEl.textContent += ` — Added to notes: "${noteText}".`;
      return;
    }
  }

  const numberMatch = transcript.match(/[\d,]+/);
  if (!numberMatch) {
    voiceStatusEl.textContent += ' — No number detected, please try again.';
    return;
  }
  const amount = numberMatch[0].replace(/,/g, '');

  if (matchedField) {
    document.getElementById(matchedField).value = amount;
    voiceStatusEl.textContent += ` — Filled ${matchedField.replace('-', ' ')} with ₹${amount}.`;
  } else {
    voiceStatusEl.textContent += ' — Could not identify which field. Try saying e.g. "20000 rent" or "note customer complained about delays".';
  }
}

function runSimulation() {
  if (entries.length === 0) {
    simulatorOutputEl.innerHTML = `<p class="ai-text">Add at least one month of data first.</p>`;
    return;
  }

  const latest = entries[entries.length - 1];
  const revenueChangePercent = parseFloat(simRevenueSlider.value);
  const expenseChangePercent = parseFloat(simExpenseSlider.value);

  const simulatedRevenue = latest.revenue * (1 + revenueChangePercent / 100);
  const simulatedExpenses = latest.totalExpenses * (1 + expenseChangePercent / 100);

  const simulatedMetrics = calculateMetrics(
    simulatedRevenue,
    simulatedExpenses,
    latest.receivables,
    latest.cashBalance
  );

  const scoreDiff = simulatedMetrics.score - latest.metrics.score;
  const scoreDiffText = scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`;
  const scoreDiffClass = scoreDiff > 0 ? 'sim-positive' : (scoreDiff < 0 ? 'sim-negative' : '');

  simulatorOutputEl.innerHTML = `
    <div class="sim-result-grid">
      <div class="sim-result">
        <span class="metric-label">Simulated Score</span>
        <span class="metric-value">${simulatedMetrics.score} <span class="${scoreDiffClass}">(${scoreDiffText})</span></span>
      </div>
      <div class="sim-result">
        <span class="metric-label">Simulated Margin</span>
        <span class="metric-value">${simulatedMetrics.profitMargin}%</span>
      </div>
      <div class="sim-result">
        <span class="metric-label">Simulated Runway</span>
        <span class="metric-value">${simulatedMetrics.runwayMonths !== null ? simulatedMetrics.runwayMonths + ' months' : 'Not applicable'}</span>
      </div>
    </div>
  `;
}

async function sendChatMessage() {
  const question = chatInputEl.value.trim();
  if (!question) return;

  if (entries.length === 0) {
    appendChatMessage('assistant', 'Add at least one month of data first so I have something to reference.');
    return;
  }

  const latest = entries[entries.length - 1];

  appendChatMessage('user', question);
  chatHistory.push({ role: 'user', content: question });
  chatInputEl.value = '';

  const loadingId = appendChatMessage('assistant', 'Thinking...', true);
  chatSendBtn.disabled = true;

  const contextPrompt = buildContextPrompt(latest);
  const conversationSoFar = chatHistory.map(m => `${m.role === 'user' ? 'Owner' : 'AI-CFO'}: ${m.content}`).join('\n');

  const fullPrompt = `${contextPrompt}

Conversation so far:
${conversationSoFar}

Respond to the owner's latest question as the AI-CFO, referencing the actual numbers above where relevant. Keep it concise (2-4 sentences), direct and practical.`;

  try {
    const response = await puter.ai.chat(fullPrompt);
    const responseText = extractText(response);
    updateChatMessage(loadingId, responseText);
    chatHistory.push({ role: 'assistant', content: responseText });
  } catch (error) {
    updateChatMessage(loadingId, `Could not get a response. Error: ${error.message || error}`);
  } finally {
    chatSendBtn.disabled = false;
  }
}

function appendChatMessage(role, text, isLoading = false) {
  const id = `chat-msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-${role}`;
  bubble.id = id;
  bubble.textContent = text;
  if (isLoading) bubble.classList.add('chat-loading');
  chatWindowEl.appendChild(bubble);
  chatWindowEl.scrollTop = chatWindowEl.scrollHeight;
  return id;
}

function updateChatMessage(id, text) {
  const bubble = document.getElementById(id);
  if (bubble) {
    bubble.textContent = text;
    bubble.classList.remove('chat-loading');
  }
}

function parseChecklistResponse(responseText) {
  const match = responseText.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {}
  }

  return responseText
    .split('\n')
    .map(line => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(line => line.length > 0)
    .slice(0, 4);
}

function renderChecklist(entry) {
  checklistOutputEl.innerHTML = '';

  if (!entry.checklist || entry.checklist.length === 0) {
    checklistOutputEl.innerHTML = `<p class="ai-text">No checklist yet. Click "Generate Action Checklist" above.</p>`;
    checklistProgressEl.innerHTML = '';
    return;
  }

  entry.checklist.forEach((item, index) => {
    const row = document.createElement('label');
    row.className = 'checklist-item';
    row.innerHTML = `
      <input type="checkbox" ${item.done ? 'checked' : ''} data-index="${index}">
      <span class="${item.done ? 'checklist-done' : ''}">${item.text}</span>
    `;
    checklistOutputEl.appendChild(row);
  });

  checklistOutputEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', function () {
      const idx = Number(this.getAttribute('data-index'));
      entry.checklist[idx].done = this.checked;
      saveEntries();
      renderChecklist(entry);
    });
  });

  updateChecklistProgress(entry);
}

function updateChecklistProgress(entry) {
  const total = entry.checklist.length;
  const done = entry.checklist.filter(i => i.done).length;

  let progressText = `${done} of ${total} action items completed`;

  const prevWithChecklist = [...entries].reverse().find(e => e.id !== entry.id && e.checklist && e.checklist.length > 0);
  if (prevWithChecklist) {
    const prevTotal = prevWithChecklist.checklist.length;
    const prevDone = prevWithChecklist.checklist.filter(i => i.done).length;
    const prevPercent = prevTotal > 0 ? Math.round((prevDone / prevTotal) * 100) : 0;
    progressText += ` (previous month: ${prevPercent}% completed)`;
  }

  checklistProgressEl.innerHTML = `<p class="checklist-progress-text">${progressText}</p>`;
}

function buildContextPrompt(entry) {
  return `You are an AI-CFO advising a small business owner. Here is their latest data:

Business type: ${entry.businessType || 'unspecified'}
Revenue: ₹${entry.revenue}
Total expenses: ₹${entry.totalExpenses}
Expense breakdown: Rent ₹${entry.expenseCategories.rent}, Salaries ₹${entry.expenseCategories.salaries}, Marketing ₹${entry.expenseCategories.marketing}, Other ₹${entry.expenseCategories.other}
Outstanding receivables: ₹${entry.receivables}
Cash balance: ₹${entry.cashBalance}
Profit margin: ${entry.metrics.profitMargin}%
${entry.metrics.isBurning ? `Monthly burn rate: ₹${entry.metrics.burnRate}, Cash runway: ${entry.metrics.runwayMonths} months` : 'Currently profitable, no burn.'}
Owner's notes: ${entry.notes || 'none provided'}`;
}

function extractText(response) {
  if (typeof response === 'string') return response;
  if (response?.message?.content) {
    if (typeof response.message.content === 'string') return response.message.content;
    if (Array.isArray(response.message.content)) {
      return response.message.content.map(c => c.text || '').join(' ');
    }
  }
  return response?.toString() || 'No response received.';
}

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

  setRiskFlag('flag-margin', getMarginRisk(parseFloat(metrics.profitMargin)));
  setRiskFlag('flag-burn', getBurnRisk(metrics.isBurning));
  setRiskFlag('flag-runway', getRunwayRisk(metrics.runwayMonths !== null ? parseFloat(metrics.runwayMonths) : null));
}

function getMarginRisk(margin) {
  if (margin < 0) return 'red';
  if (margin < 10) return 'amber';
  return 'green';
}

function getBurnRisk(isBurning) {
  return isBurning ? 'amber' : 'green';
}

function getRunwayRisk(runwayMonths) {
  if (runwayMonths === null) return 'green';
  if (runwayMonths < 3) return 'red';
  if (runwayMonths < 6) return 'amber';
  return 'green';
}

function setRiskFlag(elementId, riskLevel) {
  const el = document.getElementById(elementId);
  const icons = { green: '🟢', amber: '🟡', red: '🔴' };
  el.textContent = icons[riskLevel] || '';
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
      runSimulation();
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
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#4a3f35' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#7a6a58' },
          grid: { color: 'rgba(168, 112, 47, 0.1)' }
        },
        x: {
          ticks: { color: '#7a6a58' },
          grid: { color: 'rgba(168, 112, 47, 0.1)' }
        }
      }
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
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#4a3f35' }
        }
      }
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