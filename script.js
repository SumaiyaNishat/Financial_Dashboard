(function () {
  const STORAGE_KEY = 'pf_transactions_v1';
  const THEME_KEY = 'pf_theme_v1';

  const tbody = document.getElementById('tbody');
  const kpiIncome = document.getElementById('kpiIncome');
  const kpiExpense = document.getElementById('kpiExpense');
  const kpiBalance = document.getElementById('kpiBalance');
  const monthFilter = document.getElementById('monthFilter');
  const searchInput = document.getElementById('searchInput');
  const addBtn = document.getElementById('addBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const themeToggle = document.getElementById('themeToggle');

  const modal = document.getElementById('txnModal');
  const modalTitle = document.getElementById('modalTitle');
  const closeModal = document.getElementById('closeModal');
  const form = document.getElementById('txnForm');
  const fType = document.getElementById('type');
  const fCategory = document.getElementById('category');
  const fAmount = document.getElementById('amount');
  const fDate = document.getElementById('date');
  const fNote = document.getElementById('note');

  let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  let editingId = null;

  themeToggle.checked = localStorage.getItem(THEME_KEY) === 'dark';
  document.body.classList.toggle('light', !themeToggle.checked);

  const today = new Date();
  monthFilter.value = today.toISOString().slice(0, 7);
  fDate.value = today.toISOString().slice(0, 10);

  function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }

  function render() {
    renderKPIs();
    renderTable();
    renderPie();
  }

  function renderKPIs() {
    const filtered = getFiltered();
    const income = filtered.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    kpiIncome.textContent = formatCurrency(income);
    kpiExpense.textContent = formatCurrency(expense);
    kpiBalance.textContent = formatCurrency(income - expense);
  }

  function renderTable() {
    const filtered = getFiltered();
    tbody.innerHTML = '';
    if (!filtered.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan='6' style='text-align:center;color:var(--muted)'>No transactions yet.</td>`;
      tbody.appendChild(tr);
      return;
    }
    filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.date}</td>
        <td><span class='row-pill ${t.type === 'income' ? 'pill-income' : 'pill-expense'}'>${t.type}</span></td>
        <td>${escapeHtml(t.category)}</td>
        <td>${escapeHtml(t.note || '')}</td>
        <td>${formatCurrency(t.amount)}</td>
        <td>
          <button data-edit='${t.id}'>Edit</button>
          <button data-del='${t.id}'>Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openModal(transactions.find(t => t.id === btn.dataset.edit))));
    tbody.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => {
      if (confirm('Delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== btn.dataset.del);
        saveData();
        render();
      }
    }));
  }

  let pieChart;
  function renderPie() {
    const ctx = document.getElementById('pieCanvas').getContext('2d');
    const expenses = getFiltered().filter(t => t.type === 'expense');
    const grouped = {};
    expenses.forEach(t => { grouped[t.category] = (grouped[t.category] || 0) + t.amount; });
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(grouped),
        datasets: [{ data: Object.values(grouped), backgroundColor: Object.keys(grouped).map(_ => getRandomColor()) }]
      }
    });
  }

  function getFiltered() {
    const q = (searchInput.value || '').toLowerCase();
    const month = monthFilter.value;
    return transactions.filter(t => (!month || t.date.startsWith(month)) && (!q || t.category.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q)));
  }

  function openModal(txn) {
    editingId = txn?.id || null;
    modalTitle.textContent = editingId ? 'Edit Transaction' : 'Add Transaction';
    fType.value = txn?.type || 'income';
    fCategory.value = txn?.category || '';
    fAmount.value = txn?.amount || '';
    fDate.value = txn?.date || today.toISOString().slice(0, 10);
    fNote.value = txn?.note || '';
    modal.showModal();
  }

  closeModal.onclick = () => modal.close();
  addBtn.onclick = () => openModal();
  form.onsubmit = function (e) {
    e.preventDefault();
    const txn = { id: editingId || Date.now().toString(), type: fType.value, category: fCategory.value, amount: parseFloat(fAmount.value), date: fDate.value, note: fNote.value };
    if (editingId) { transactions = transactions.map(t => t.id === editingId ? txn : t); } else { transactions.push(txn); }
    saveData();
    modal.close();
    render();
  };

  exportBtn.onclick = () => {
    if (!transactions.length) { alert('No data'); return; }
    const csv = 'id,type,category,amount,date,note\n' + transactions.map(t => `${t.id},${t.type},${t.category},${t.amount},${t.date},${t.note}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  clearBtn.onclick = () => { if (confirm('Delete all?')) { transactions = []; saveData(); render(); } };

  themeToggle.onchange = () => { document.body.classList.toggle('light', !themeToggle.checked); localStorage.setItem(THEME_KEY, themeToggle.checked ? 'dark' : 'light'); };

  function formatCurrency(n) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0); }
  function escapeHtml(s) { return String(s || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function getRandomColor() { return '#' + Math.floor(Math.random() * 16777215).toString(16); }

  render();
})();
