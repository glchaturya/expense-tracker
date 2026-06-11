// App logic: localStorage-backed expense tracker used across pages
const STORAGE_KEY = 'expense-tracker:data:v1';
const PROFILE_PIC_KEY = 'expenseTracker.profilePic';
const PROFILE_NAME_KEY = 'expenseTracker.profileName';
const LOGIN_KEY = 'expenseTracker.currentUser';

// Check if user is logged in
function checkAuth() {
  const currentUser = localStorage.getItem(LOGIN_KEY);
  if (!currentUser) {
    window.location.href = 'login.html';
  }
}

function logout() {
  localStorage.removeItem(LOGIN_KEY);
  localStorage.removeItem('expenseTracker.rememberMe');
  window.location.href = 'login.html';
}

function loadData(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {expenses:[], salary:0, goal:{target:1200, saved:400}} }catch(e){return {expenses:[], salary:0, goal:{target:1200, saved:400}}}
}
function saveData(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

// Shared UI helpers
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

// Modal helpers
function openModal(modalId){ const m = document.getElementById(modalId); if(m) m.classList.remove('hidden'); }
function closeModal(modalId){ const m = document.getElementById(modalId); if(m) m.classList.add('hidden'); }

// Dashboard-specific
function renderDashboard(){
  const data = loadData();
  const salary = Number(data.salary) || 0;
  const txIncome = data.expenses.filter(e=>e.amount>0).reduce((s,e)=>s+e.amount,0);
  const income = txIncome + salary;
  const expenses = data.expenses.filter(e=>e.amount<0).reduce((s,e)=>s+Math.abs(e.amount),0);
  const balance = income - expenses;
  const fmt = v=> '₹' + v.toFixed(2);
  if($('#salary-value')) $('#salary-value').textContent = fmt(salary);
  if($('#total-income')) $('#total-income').textContent = fmt(income);
  if($('#total-expenses')) $('#total-expenses').textContent = fmt(expenses);
  if($('#total-balance')) $('#total-balance').textContent = fmt(balance);

  // transactions
  const list = $('#transactions-list');
  if(list){
    list.innerHTML = '';
    const items = data.expenses.slice().reverse().slice(0,6);
    if(items.length===0) list.innerHTML = '<p class="muted">No transactions yet.</p>';
    items.forEach(tx=>{
      const el = document.createElement('div'); el.className='tx';
      el.innerHTML = `<div><strong>${tx.title}</strong><div class=muted>${tx.category} • ${tx.date||''}</div></div><div class="transaction-actions"><span class="amount ${tx.amount<0?'neg':'pos'}">${tx.amount<0?'-':''}₹${Math.abs(tx.amount).toFixed(2)}</span><button class="delete-btn" data-id="${tx.id}">Delete</button></div>`;
      list.appendChild(el);
    });
    list.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        const id = event.currentTarget.dataset.id;
        const updated = loadData();
        updated.expenses = updated.expenses.filter(item => item.id !== id);
        saveData(updated);
        renderDashboard();
        renderSpending();
      });
    });
  }

  // side goal
  if($('#goal-amount')) $('#goal-amount').textContent = '₹' + data.goal.target;
  if($('#goal-saved')) $('#goal-saved').textContent = '₹' + data.goal.saved;
  if($('#goal-progress')){
    const pct = Math.min(100, Math.round((data.goal.saved / data.goal.target)*100));
    $('#goal-progress').style.width = pct + '%';
  }

  // simple bars for spending trend
  const bars = $('#chart-bars');
  if(bars){ bars.innerHTML = ''; for(let i=0;i<7;i++){ const h = 30 + Math.random()*80; const d = document.createElement('div'); d.className='bar'; d.style.height = h+'px'; d.title = '₹'+(Math.round(h*5)); bars.appendChild(d);} }
}

// Spending page
function renderSpending(){
  const data = loadData();
  const breakdown = {};
  data.expenses.forEach(tx=>{ const k = tx.category||'Other'; breakdown[k] = (breakdown[k]||0) + Math.abs(tx.amount); });
  const total = Object.values(breakdown).reduce((s,v)=>s+v,0) || 1;
  const donut = $('#donut');
  if(donut){ donut.innerHTML=''; const colors = ['#630ed4','#94223a','#006a61','#eaddff','#f3f4f6']; let offset=0; const radius=40; const c=2*Math.PI*radius; Object.entries(breakdown).forEach(([k,v],i)=>{ const frac = v/total; const dash = frac*c; const circle = document.createElementNS('http://www.w3.org/2000/svg','svg'); circle.setAttribute('viewBox','0 0 100 100'); circle.classList.add('donut-slice'); circle.innerHTML = `<circle cx=50 cy=50 r=${radius} stroke="#eceef0" stroke-width=12 fill="transparent"></circle><circle cx=50 cy=50 r=${radius} stroke="${colors[i%colors.length]}" stroke-width=12 fill="transparent" stroke-dasharray="${dash} ${c-dash}" transform="rotate(-90 50 50) translate(0,0)" style="stroke-dashoffset:${-offset}"></circle>`; offset += dash; donut.appendChild(circle); }); }

  // breakdown list
  const list = $('#breakdown-list');
  if(list){ list.innerHTML=''; Object.entries(breakdown).forEach(([k,v])=>{ const el = document.createElement('div'); el.className='break-item'; el.innerHTML = `<div>${k}</div><div class=muted>₹${v.toFixed(2)}</div>`; list.appendChild(el); }); if(Object.keys(breakdown).length===0) list.innerHTML='<p class="muted">No data yet.</p>' }
}

// Goal page handlers
function initSalary(){
  const data = loadData();
  const salaryInput = $('#salary-input');
  const salaryBtn = $('#save-salary');
  if(salaryBtn){
    salaryBtn.addEventListener('click', ()=>{
      const val = Number(salaryInput.value || 0);
      if(val <= 0){ alert('Enter a valid salary amount'); return; }
      const updated = loadData();
      updated.salary = val;
      saveData(updated);
      renderDashboard();
      salaryInput.value = '';
    });
  }
}

function initGoal(){
  const data = loadData();
  const goalForm = document.getElementById('goal-form');
  if(goalForm){
    goalForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('goal-name-input').value;
      const target = Number(document.getElementById('goal-target-input').value) || 0;
      const saved = Number(document.getElementById('goal-saved-input').value) || 0;
      const monthly = Number(document.getElementById('goal-monthly-input').value) || 600;
      if(target <= 0){ alert('Enter a valid target amount'); return; }
      const updated = loadData();
      updated.goal = { name, target, saved, monthly };
      saveData(updated);
      renderGoal();
      goalForm.reset();
      alert('Goal saved!');
    });
  }

  const clearGoalButton = document.getElementById('clear-goal');
  if(clearGoalButton){
    clearGoalButton.addEventListener('click', ()=>{
      const updated = loadData();
      updated.goal = { name: 'Dream Vacation', target: 1200, saved: 400, monthly: 600 };
      saveData(updated);
      renderGoal();
      alert('Goal cleared and reset to default.');
    });
  }
  const slider = $('#speed-slider');
  const rec = $('#recommended');
  const monthlyInput = document.getElementById('goal-monthly-input');
  if(slider){
    slider.addEventListener('input', e=>{
      rec.textContent = 'Recommended: ₹'+e.target.value;
      slider._value = +e.target.value;
      if(monthlyInput) monthlyInput.value = e.target.value;
      renderGoal();
    });
  }

  if(monthlyInput){
    monthlyInput.addEventListener('input', e=>{
      const val = Number(e.target.value) || 0;
      if(slider && val > 0) slider.value = val;
      if(rec) rec.textContent = 'Recommended: ₹'+(val || slider?.value || 600);
      renderGoal();
    });
  }

  if($('#toggle-standard')) $('#toggle-standard').addEventListener('click', ()=>{ slider.value=400; slider.dispatchEvent(new Event('input')); });
  if($('#toggle-fast')) $('#toggle-fast').addEventListener('click', ()=>{ slider.value=600; slider.dispatchEvent(new Event('input')); });

  if($('#boost-now')) $('#boost-now').addEventListener('click', ()=>{
    const val = Number(slider.value||600);
    data.goal.saved = (data.goal.saved||0) + val;
    saveData(data); renderDashboard(); renderGoal(); alert('Boost added: ₹'+val);
  });

  const saveMonthlyRemainsBtn = document.getElementById('save-monthly-remains');
  if(saveMonthlyRemainsBtn){
    saveMonthlyRemainsBtn.addEventListener('click', ()=>{
      const updated = loadData();
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthNet = updated.expenses.reduce((sum, tx) => {
        if(!tx.date) return sum;
        const txDate = new Date(tx.date);
        if(txDate.getFullYear() !== currentYear || txDate.getMonth() !== currentMonth) return sum;
        return sum + Number(tx.amount || 0);
      }, 0);
      const monthlySalary = Number(updated.salary) || 0;
      const remainder = monthlySalary + monthNet;
      if(remainder <= 0){
        alert('No positive remainder to save this month.');
        return;
      }
      updated.goal.saved = (updated.goal.saved || 0) + remainder;
      saveData(updated);
      renderDashboard(); renderGoal();
      alert('₹' + remainder.toFixed(2) + ' from this month has been added to your goal!');
    });
  }
}

function renderGoal(){ 
  const data = loadData(); 
  if($('#goal-saved-2')) $('#goal-saved-2').textContent = '₹'+data.goal.saved; 
  if($('#goal-title')) $('#goal-title').textContent = data.goal.name || 'Dream Vacation';
  if($('#goal-target')) $('#goal-target').textContent = '₹' + data.goal.target;
  if($('#goal-percent')) $('#goal-percent').textContent = Math.round((data.goal.saved/data.goal.target)*100)+'%';
  const remaining = Math.max(0, data.goal.target - data.goal.saved);
  const monthlyDeposit = data.goal.monthly || document.getElementById('speed-slider')?.value || 600;
  const months = monthlyDeposit > 0 ? Math.ceil(remaining / monthlyDeposit) : 0;
  if($('#months-to-reach')) $('#months-to-reach').textContent = months + ' months';
  const celebration = $('#goal-celebration');
  if(celebration){
    if(data.goal.saved >= data.goal.target){
      celebration.style.display = 'block';
    } else {
      celebration.style.display = 'none';
    }
  }
  const slider = $('#speed-slider');
  const monthlyInput = document.getElementById('goal-monthly-input');
  if(data.goal.monthly && monthlyInput) monthlyInput.value = data.goal.monthly;
  if(data.goal.monthly && slider) slider.value = data.goal.monthly;
}

// Add expense handling (shared)
function wireAddExpense(formId, modalId){
  const form = document.getElementById(formId);
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = loadData();
    const fd = new FormData(form);
    const title = fd.get('title');
    const amount = Number(fd.get('amount')) || 0;
    const category = fd.get('category') || 'Other';
    const date = fd.get('date') || new Date().toISOString().slice(0,10);
    // For simplicity positive amounts are income if >0, negative if expense want expense as negative
    const isIncome = category.toLowerCase() === 'income';
    const tx = {id:uid(), title, amount: isIncome ? Math.abs(amount) : -Math.abs(amount), category, date};
    data.expenses.push(tx);
    saveData(data);
    form.reset();
    closeModal(modalId);
    renderDashboard(); renderSpending(); renderGoal();
  });
}

// Wire modal triggers across pages
function wireModals(){
  const m1 = $('#modal'); if(m1){ $('#open-add')?.addEventListener('click', ()=>openModal('modal')); $('#close-modal')?.addEventListener('click', ()=>closeModal('modal')); wireAddExpense('add-expense-form','modal'); }
  const m2 = $('#modal-2'); if(m2){ $('#open-add-2')?.addEventListener('click', ()=>openModal('modal-2')); $('#close-modal-2')?.addEventListener('click', ()=>closeModal('modal-2')); wireAddExpense('add-expense-form-2','modal-2'); }
  const m3 = document.getElementById('modal'); if(m3){ $('#open-add-3')?.addEventListener('click', ()=>openModal('modal')); }
  const clearAll = $('#clear-all'); if(clearAll){ clearAll.addEventListener('click', ()=>{
      if(confirm('Delete all transactions and reset your tracker?')){
        localStorage.removeItem(STORAGE_KEY);
        renderDashboard(); renderSpending(); renderGoal();
      }
    });
  }
}

// Profile picture management
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

// Init when DOM ready
window.addEventListener('DOMContentLoaded', ()=>{
  checkAuth();
  wireModals();
  renderDashboard();
  renderSpending();
  initSalary();
  initGoal();
  renderGoal();
  initProfilePicture();
  
  const logoutBtn = document.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    });
  }
  // Mobile floating add buttons
  document.querySelectorAll('.fab-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = btn.getAttribute('data-target') || 'modal';
      openModal(target);
    });
  });
});
