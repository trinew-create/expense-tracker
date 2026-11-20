(() => {
  'use strict';

  // ==================== Constants & Storage Keys ====================
  const STORAGE_KEYS = {
    CONFIG: 'pet_config_v1',
    TRANSACTIONS: 'pet_transactions_v1',
    LAST_SYNC: 'pet_last_sync_v1',
    PENDING_QUEUE: 'pet_pending_queue_v1',
    FIRST_PROMPT_SEEN: 'pet_first_prompt_seen_v1',
  };

  const API_TIMEOUT_MS = 15000;

  const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];

  const THAI_WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  const CATEGORIES = {
    expense: [
      { id: 'อาหาร', label: 'อาหาร', icon: '🍜', bg: 'bg-orange-100 text-orange-700' },
      { id: 'เดินทาง', label: 'เดินทาง', icon: '🚆', bg: 'bg-sky-100 text-sky-700' },
      { id: 'ช้อปปิ้ง', label: 'ช้อปปิ้ง', icon: '🛍️', bg: 'bg-pink-100 text-pink-700' },
      { id: 'บิล/ค่าน้ำไฟ', label: 'บิล/ค่าน้ำไฟ', icon: '💡', bg: 'bg-amber-100 text-amber-700' },
      { id: 'ที่พัก', label: 'ที่พัก', icon: '🏠', bg: 'bg-indigo-100 text-indigo-700' },
      { id: 'สุขภาพ', label: 'สุขภาพ', icon: '💊', bg: 'bg-emerald-100 text-emerald-700' },
      { id: 'บันเทิง', label: 'บันเทิง', icon: '🎬', bg: 'bg-purple-100 text-purple-700' },
      { id: 'อื่นๆ', label: 'อื่นๆ', icon: '📦', bg: 'bg-slate-100 text-slate-700' },
    ],
    income: [
      { id: 'เงินเดือน', label: 'เงินเดือน', icon: '💼', bg: 'bg-emerald-100 text-emerald-700' },
      { id: 'โบนัส', label: 'โบนัส', icon: '🎁', bg: 'bg-teal-100 text-teal-700' },
      { id: 'ขายของ', label: 'ขายของ', icon: '🛒', bg: 'bg-lime-100 text-lime-700' },
      { id: 'ลงทุน', label: 'ลงทุน', icon: '📈', bg: 'bg-cyan-100 text-cyan-700' },
      { id: 'คืนเงิน', label: 'คืนเงิน', icon: '💸', bg: 'bg-sky-100 text-sky-700' },
      { id: 'อื่นๆ', label: 'อื่นๆ', icon: '✨', bg: 'bg-slate-100 text-slate-700' },
    ],
  };

  const currencyFormatter = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ==================== App State ====================
  const now = new Date();
  const state = {
    config: { webAppUrl: '', pin: '' },
    transactions: [],
    pendingQueue: [],
    lastSync: null,
    selectedYear: now.getFullYear(),
    selectedMonth: now.getMonth(), // 0-11
    filterType: 'all', // 'all' | 'expense' | 'income'
    isSyncing: false,
    editingId: null,
    pendingDeleteId: null,
  };

  let toastTimer = null;

  // ==================== DOM References ====================
  const els = {
    syncDot: document.getElementById('syncDot'),
    syncText: document.getElementById('syncText'),
    refreshBtn: document.getElementById('refreshBtn'),
    refreshIcon: document.getElementById('refreshIcon'),
    settingsBtn: document.getElementById('settingsBtn'),
    setupBanner: document.getElementById('setupBanner'),
    bannerSetupBtn: document.getElementById('bannerSetupBtn'),

    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    monthSelect: document.getElementById('monthSelect'),
    yearSelect: document.getElementById('yearSelect'),
    todayMonthBtn: document.getElementById('todayMonthBtn'),

    summaryCount: document.getElementById('summaryCount'),
    netBalance: document.getElementById('netBalance'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    ratioWrap: document.getElementById('ratioWrap'),
    ratioLabel: document.getElementById('ratioLabel'),
    ratioBar: document.getElementById('ratioBar'),

    filterBtns: Array.from(document.querySelectorAll('.filter-btn')),
    txList: document.getElementById('txList'),
    emptyState: document.getElementById('emptyState'),
    fabAddBtn: document.getElementById('fabAddBtn'),
    toast: document.getElementById('toast'),

    // Bottom Sheet (Add / Edit)
    txDialog: document.getElementById('txDialog'),
    txDialogTitle: document.getElementById('txDialogTitle'),
    closeTxDialogBtn: document.getElementById('closeTxDialogBtn'),
    txForm: document.getElementById('txForm'),
    txId: document.getElementById('txId'),
    typeExpense: document.getElementById('typeExpense'),
    typeIncome: document.getElementById('typeIncome'),
    txAmount: document.getElementById('txAmount'),
    txAmountError: document.getElementById('txAmountError'),
    categoryGrid: document.getElementById('categoryGrid'),
    txCategoryError: document.getElementById('txCategoryError'),
    txDate: document.getElementById('txDate'),
    txDateError: document.getElementById('txDateError'),
    txNote: document.getElementById('txNote'),
    txSubmitBtn: document.getElementById('txSubmitBtn'),
    txDeleteBtn: document.getElementById('txDeleteBtn'),

    // Settings Modal
    settingsDialog: document.getElementById('settingsDialog'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    settingsForm: document.getElementById('settingsForm'),
    cfgUrl: document.getElementById('cfgUrl'),
    cfgUrlError: document.getElementById('cfgUrlError'),
    cfgPin: document.getElementById('cfgPin'),
    cfgPinError: document.getElementById('cfgPinError'),
    togglePinBtn: document.getElementById('togglePinBtn'),
    eyeShowIcon: document.getElementById('eyeShowIcon'),
    eyeHideIcon: document.getElementById('eyeHideIcon'),
    settingsFeedback: document.getElementById('settingsFeedback'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    clearCacheBtn: document.getElementById('clearCacheBtn'),

    // Confirm Delete Modal
    confirmDialog: document.getElementById('confirmDialog'),
    confirmSummary: document.getElementById('confirmSummary'),
    confirmCancelBtn: document.getElementById('confirmCancelBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  };

  // ==================== Modern Top-Layer Dialog Helpers ====================
  let supportsDisplayTransitionCache;

  function canTransitionDisplay() {
    if (supportsDisplayTransitionCache !== undefined) return supportsDisplayTransitionCache;
    if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
      return false;
    }
    const probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    getComputedStyle(probe).display;
    probe.style.display = 'none';
    supportsDisplayTransitionCache = getComputedStyle(probe).display === 'block';
    probe.remove();
    return supportsDisplayTransitionCache;
  }

  function supportsTopLayerExit() {
    return Boolean(window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay());
  }

  function openDialog(dialog) {
    dialog.removeAttribute('data-closing');
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  async function closeDialog(dialog) {
    if (!dialog.open) return;

    if (!supportsTopLayerExit()) {
      if (dialog.hasAttribute('data-closing')) return;
      dialog.setAttribute('data-closing', '');
      const animations = dialog.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ]);
      }
      if (!dialog.hasAttribute('data-closing')) return;
      dialog.removeAttribute('data-closing');
    }

    dialog.close();
  }

  function setupDialog(dialog) {
    // Route Esc / closedby cancel through animated exit helper
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });

    // Fallback light-dismiss for browsers without <dialog closedby> (e.g., Safari)
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (!isInside) {
          closeDialog(dialog);
        }
      });
    }
  }

  // ==================== Storage & Cache Helpers ====================
  function readStorageJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeStorageJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('LocalStorage write failed:', err);
    }
  }

  function loadLocalState() {
    const savedConfig = readStorageJson(STORAGE_KEYS.CONFIG, null);
    if (savedConfig && typeof savedConfig === 'object') {
      state.config = {
        webAppUrl: String(savedConfig.webAppUrl || '').trim(),
        pin: String(savedConfig.pin || '').trim(),
      };
    }

    const savedTx = readStorageJson(STORAGE_KEYS.TRANSACTIONS, []);
    state.transactions = Array.isArray(savedTx) ? savedTx : [];

    const savedQueue = readStorageJson(STORAGE_KEYS.PENDING_QUEUE, []);
    state.pendingQueue = Array.isArray(savedQueue) ? savedQueue : [];

    state.lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || null;
  }

  function saveTransactionsCache() {
    writeStorageJson(STORAGE_KEYS.TRANSACTIONS, state.transactions);
  }

  function savePendingQueue() {
    writeStorageJson(STORAGE_KEYS.PENDING_QUEUE, state.pendingQueue);
  }

  function saveConfig(webAppUrl, pin) {
    state.config = { webAppUrl: webAppUrl.trim(), pin: pin.trim() };
    writeStorageJson(STORAGE_KEYS.CONFIG, state.config);
  }

  function isConfigured() {
    return Boolean(state.config.webAppUrl && state.config.pin);
  }

  // ==================== Date & Formatting Helpers ====================
  function getTodayLocalISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getOffsetLocalISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatBaht(amount, { showSign = false } = {}) {
    const num = Number(amount) || 0;
    const absText = currencyFormatter.format(Math.abs(num));
    if (showSign) {
      if (num > 0) return `+฿${absText}`;
      if (num < 0) return `-฿${absText}`;
    } else if (num < 0) {
      return `-฿${absText}`;
    }
    return `฿${absText}`;
  }

  function formatThaiDateHeading(isoDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
    if (!match) return isoDate || 'ไม่ระบุวันที่';

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const beYear = year + 543;
    const datePart = `${day} ${THAI_MONTHS_SHORT[monthIndex] || ''} ${beYear}`;

    const today = getTodayLocalISO();
    const yesterday = getOffsetLocalISO(-1);

    if (isoDate === today) return `วันนี้ · ${datePart}`;
    if (isoDate === yesterday) return `เมื่อวาน · ${datePart}`;

    const localDate = new Date(year, monthIndex, day);
    const weekday = THAI_WEEKDAYS_SHORT[localDate.getDay()] || '';
    return `${weekday} ${datePart}`;
  }

  function formatSyncTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }

  function generateId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function getCategoryMeta(type, categoryName) {
    const list = CATEGORIES[type] || CATEGORIES.expense;
    const found = list.find((c) => c.id === categoryName);
    if (found) return found;
    return {
      id: categoryName || 'อื่นๆ',
      label: categoryName || 'อื่นๆ',
      icon: type === 'income' ? '💰' : '🏷️',
      bg: type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700',
    };
  }

  // ==================== Sync Status & Toast ====================
  function updateSyncBadge(status, customMessage) {
    const dotColors = {
      idle: 'bg-slate-400',
      syncing: 'bg-sky-500 animate-pulse',
      synced: 'bg-emerald-500',
      pending: 'bg-amber-500',
      error: 'bg-rose-500',
      unconfigured: 'bg-amber-400',
    };

    els.syncDot.className = `h-2 w-2 rounded-full shrink-0 ${dotColors[status] || dotColors.idle}`;
    els.refreshIcon.classList.toggle('is-spinning', status === 'syncing');
    els.refreshBtn.disabled = status === 'syncing';

    if (customMessage) {
      els.syncText.textContent = customMessage;
      return;
    }

    switch (status) {
      case 'unconfigured':
        els.syncText.textContent = 'โหมดในเครื่อง (ยังไม่เชื่อมต่อ)';
        break;
      case 'syncing':
        els.syncText.textContent = 'กำลังซิงก์ข้อมูล...';
        break;
      case 'synced': {
        const timeStr = formatSyncTime(state.lastSync);
        els.syncText.textContent = timeStr ? `ซิงก์แล้ว ${timeStr}` : 'ซิงก์ข้อมูลแล้ว';
        break;
      }
      case 'pending':
        els.syncText.textContent = `รอซิงก์ ${state.pendingQueue.length} รายการ`;
        break;
      case 'error':
        els.syncText.textContent = 'ซิงก์ไม่สำเร็จ (แสดงข้อมูลแคช)';
        break;
      default:
        els.syncText.textContent = 'พร้อมใช้งาน';
    }
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2800);
  }

  // ==================== Apps Script API Client ====================
  async function callApi(action, payload = {}, overrideConfig = null) {
    const cfg = overrideConfig || state.config;
    if (!cfg.webAppUrl || !cfg.pin) {
      const err = new Error('ยังไม่ได้ตั้งค่า Web App URL หรือ PIN');
      err.code = 'NOT_CONFIGURED';
      throw err;
    }

    const body = JSON.stringify({
      action,
      pin: cfg.pin,
      ...payload,
    });

    try {
      const signal = typeof AbortSignal?.timeout === 'function'
        ? AbortSignal.timeout(API_TIMEOUT_MS)
        : undefined;

      // ใช้ text/plain เพื่อเป็น CORS Simple Request และเลี่ยง preflight OPTIONS ของ Apps Script
      const response = await fetch(cfg.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ไม่สามารถติดต่อ Google Apps Script ได้`);
      }

      const rawText = await response.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON กรุณาตรวจสอบสิทธิ์ Web App (Who has access: Anyone)', {
          cause: parseErr,
        });
      }

      if (!result || result.ok !== true) {
        const apiErr = new Error(result?.message || 'คำขอไม่สำเร็จ');
        apiErr.code = result?.error || 'API_ERROR';
        throw apiErr;
      }

      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        const timeoutErr = new Error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง', { cause: err });
        timeoutErr.code = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  // ==================== Sync Engine ====================
  async function flushPendingQueue() {
    if (!isConfigured() || state.pendingQueue.length === 0) return true;

    const remaining = [];
    for (let i = 0; i < state.pendingQueue.length; i++) {
      const item = state.pendingQueue[i];
      try {
        if (item.action === 'add') {
          await callApi('add', { data: item.data });
        } else if (item.action === 'update') {
          await callApi('update', { data: item.data });
        } else if (item.action === 'delete') {
          await callApi('delete', { id: item.id });
        }
      } catch (err) {
        // ถ้า PIN ผิด ให้หยุดและแจ้งผู้ใช้ทันที
        if (err.code === 'UNAUTHORIZED') {
          remaining.push(...state.pendingQueue.slice(i));
          state.pendingQueue = remaining;
          savePendingQueue();
          throw err;
        }
        // ถ้าไม่พบรายการขณะลบ ถือว่าถูกลบไปแล้ว
        if (item.action === 'delete' && err.code === 'NOT_FOUND') {
          continue;
        }
        // กรณีเครือข่ายล่ม ให้เก็บรายการที่เหลือไว้ซิงก์รอบถัดไป
        remaining.push(...state.pendingQueue.slice(i));
        state.pendingQueue = remaining;
        savePendingQueue();
        return false;
      }
    }

    state.pendingQueue = remaining;
    savePendingQueue();
    return true;
  }

  async function syncFromServer({ manual = false } = {}) {
    if (!isConfigured()) {
      updateSyncBadge('unconfigured');
      if (manual) {
        showToast('กรุณาตั้งค่า Web App URL และ PIN ก่อนซิงก์');
        openSettingsModal();
      }
      return;
    }

    if (state.isSyncing) return;
    state.isSyncing = true;
    updateSyncBadge('syncing');

    try {
      const flushed = await flushPendingQueue();
      if (!flushed) {
        updateSyncBadge('pending');
        if (manual) showToast('ไม่สามารถเชื่อมต่อได้ ยังมีรายการรอซิงก์');
        return;
      }

      const res = await callApi('getAll');
      if (Array.isArray(res.data)) {
        state.transactions = res.data;
        saveTransactionsCache();
      }

      state.lastSync = res.serverTime || new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, state.lastSync);

      renderApp();
      updateSyncBadge('synced');
      if (manual) showToast('ซิงก์ข้อมูลล่าสุดเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Sync failed:', err);
      if (err.code === 'UNAUTHORIZED') {
        updateSyncBadge('error', 'รหัส PIN ไม่ถูกต้อง');
        showToast('รหัส PIN ไม่ถูกต้อง กรุณาตรวจสอบในหน้าตั้งค่า');
      } else if (state.pendingQueue.length > 0) {
        updateSyncBadge('pending');
        if (manual) showToast('ออฟไลน์: แสดงข้อมูลจากแคชในเครื่อง');
      } else {
        updateSyncBadge('error');
        if (manual) showToast(err.message || 'ซิงก์ข้อมูลไม่สำเร็จ');
      }
    } finally {
      state.isSyncing = false;
    }
  }

  async function pushMutation(action, payload) {
    if (!isConfigured()) {
      updateSyncBadge('unconfigured');
      return;
    }

    updateSyncBadge('syncing');
    try {
      const res = await callApi(action, payload);
      if ((action === 'add' || action === 'update') && res.data?.id) {
        const idx = state.transactions.findIndex((t) => t.id === res.data.id);
        if (idx !== -1) {
          state.transactions[idx] = res.data;
          saveTransactionsCache();
          renderApp();
        }
      }
      state.lastSync = res.serverTime || new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, state.lastSync);
      updateSyncBadge(state.pendingQueue.length > 0 ? 'pending' : 'synced');
    } catch (err) {
      console.error(`Mutation "${action}" failed:`, err);
      if (err.code === 'UNAUTHORIZED') {
        updateSyncBadge('error', 'รหัส PIN ไม่ถูกต้อง');
        showToast('ซิงก์ไม่สำเร็จ: รหัส PIN ไม่ถูกต้อง');
        return;
      }
      // เก็บลงคิวรอซิงก์เมื่อออนไลน์
      state.pendingQueue.push({
        opId: generateId(),
        action,
        data: payload.data,
        id: payload.id,
        createdAt: new Date().toISOString(),
      });
      savePendingQueue();
      updateSyncBadge('pending');
      showToast('บันทึกในเครื่องแล้ว จะซิงก์เมื่อออนไลน์');
    }
  }

  // ==================== Month/Year Picker & Filtering ====================
  function populateMonthYearSelectors() {
    const monthOptions = THAI_MONTHS_FULL.map((name, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = name;
      return opt;
    });
    els.monthSelect.replaceChildren(...monthOptions);

    // สร้างช่วงปีครอบคลุมปีปัจจุบันและปีที่มีในรายการ
    const yearsSet = new Set([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, state.selectedYear]);
    for (const tx of state.transactions) {
      const y = Number(String(tx.date || '').slice(0, 4));
      if (y >= 2000 && y <= 2100) yearsSet.add(y);
    }

    const sortedYears = Array.from(yearsSet).toSorted((a, b) => b - a);
    const yearOptions = sortedYears.map((y) => {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = `พ.ศ. ${y + 543}`;
      return opt;
    });
    els.yearSelect.replaceChildren(...yearOptions);

    els.monthSelect.value = String(state.selectedMonth);
    els.yearSelect.value = String(state.selectedYear);

    const isCurrentMonth =
      state.selectedYear === now.getFullYear() && state.selectedMonth === now.getMonth();
    els.todayMonthBtn.hidden = isCurrentMonth;
  }

  function shiftMonth(delta) {
    const d = new Date(state.selectedYear, state.selectedMonth + delta, 1);
    state.selectedYear = d.getFullYear();
    state.selectedMonth = d.getMonth();
    renderApp();
  }

  function getMonthTransactions() {
    const prefix = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    return state.transactions.filter((tx) => String(tx.date || '').startsWith(prefix));
  }

  // ==================== Rendering ====================
  function renderSummary(monthItems) {
    let income = 0;
    let expense = 0;

    for (const tx of monthItems) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') income += amt;
      else expense += amt;
    }

    const net = income - expense;

    els.summaryCount.textContent = `${monthItems.length} รายการ`;
    els.netBalance.textContent = formatBaht(net);
    els.netBalance.classList.toggle('text-rose-300', net < 0);
    els.netBalance.classList.toggle('text-white', net >= 0);

    els.totalIncome.textContent = formatBaht(income);
    els.totalExpense.textContent = formatBaht(expense);

    if (income > 0) {
      const pct = Math.round((expense / income) * 100);
      els.ratioWrap.hidden = false;
      els.ratioLabel.textContent = `${pct}%`;
      els.ratioBar.style.width = `${Math.min(pct, 100)}%`;
      els.ratioBar.className = `h-full rounded-full transition-all duration-300 ${
        pct > 100 ? 'bg-rose-400' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'
      }`;
    } else if (expense > 0) {
      els.ratioWrap.hidden = false;
      els.ratioLabel.textContent = 'ยังไม่มีรายรับ';
      els.ratioBar.style.width = '100%';
      els.ratioBar.className = 'h-full rounded-full transition-all duration-300 bg-rose-400';
    } else {
      els.ratioWrap.hidden = true;
    }
  }

  function groupByDate(items) {
    if (typeof Object.groupBy === 'function') {
      return Object.groupBy(items, (tx) => tx.date || 'unknown');
    }
    const groups = Object.create(null);
    for (const tx of items) {
      const key = tx.date || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    }
    return groups;
  }

  function renderTransactionList(monthItems) {
    const filtered =
      state.filterType === 'all'
        ? monthItems
        : monthItems.filter((tx) => tx.type === state.filterType);

    if (filtered.length === 0) {
      els.txList.replaceChildren();
      els.emptyState.hidden = false;
      return;
    }

    els.emptyState.hidden = true;

    const sorted = filtered.toSorted((a, b) => {
      const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCmp !== 0) return dateCmp;
      return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
    });

    const grouped = groupByDate(sorted);
    const dateKeys = Object.keys(grouped).toSorted((a, b) => b.localeCompare(a));

    const fragments = dateKeys.map((dateKey) => {
      const dayItems = grouped[dateKey] ?? [];
      let dayNet = 0;
      for (const item of dayItems) {
        dayNet += item.type === 'income' ? Number(item.amount) || 0 : -(Number(item.amount) || 0);
      }

      const section = document.createElement('section');
      section.className = 'space-y-2';

      // Date Header
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between px-1';

      const dateHeading = document.createElement('h3');
      dateHeading.className = 'text-xs font-semibold text-slate-500';
      dateHeading.textContent = formatThaiDateHeading(dateKey);

      const subtotal = document.createElement('span');
      subtotal.className = `text-xs font-semibold tabular-nums ${
        dayNet > 0 ? 'text-emerald-600' : dayNet < 0 ? 'text-rose-600' : 'text-slate-500'
      }`;
      subtotal.textContent = formatBaht(dayNet, { showSign: true });

      header.append(dateHeading, subtotal);

      // Day Card
      const card = document.createElement('div');
      card.className = 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs divide-y divide-slate-100';

      const rows = dayItems.map((tx) => {
        const meta = getCategoryMeta(tx.type, tx.category);
        const isIncome = tx.type === 'income';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-slate-50 active:bg-slate-100 transition min-h-[60px]';
        btn.dataset.txId = tx.id;

        const left = document.createElement('div');
        left.className = 'flex items-center gap-3 min-w-0';

        const iconBox = document.createElement('span');
        iconBox.className = `flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${meta.bg}`;
        iconBox.setAttribute('aria-hidden', 'true');
        iconBox.textContent = meta.icon;

        const textWrap = document.createElement('div');
        textWrap.className = 'min-w-0';

        const catTitle = document.createElement('p');
        catTitle.className = 'text-sm font-semibold text-slate-900 truncate';
        catTitle.textContent = tx.category || meta.label;

        textWrap.appendChild(catTitle);

        if (tx.note) {
          const noteEl = document.createElement('p');
          noteEl.className = 'text-xs text-slate-500 truncate mt-0.5';
          noteEl.textContent = tx.note;
          textWrap.appendChild(noteEl);
        }

        left.append(iconBox, textWrap);

        const amountEl = document.createElement('span');
        amountEl.className = `shrink-0 text-sm font-bold tabular-nums ${
          isIncome ? 'text-emerald-600' : 'text-rose-600'
        }`;
        amountEl.textContent = formatBaht(isIncome ? tx.amount : -tx.amount, { showSign: true });

        btn.append(left, amountEl);
        btn.addEventListener('click', () => openEditTransaction(tx.id));
        return btn;
      });

      card.replaceChildren(...rows);
      section.append(header, card);
      return section;
    });

    els.txList.replaceChildren(...fragments);
  }

  function renderFilterButtons() {
    for (const btn of els.filterBtns) {
      const isActive = btn.dataset.filter === state.filterType;
      btn.setAttribute('aria-pressed', String(isActive));
      btn.className = isActive
        ? 'filter-btn flex-1 rounded-lg py-2 text-xs font-semibold transition min-h-[40px] bg-white text-slate-900 shadow-xs'
        : 'filter-btn flex-1 rounded-lg py-2 text-xs font-semibold transition min-h-[40px] text-slate-600 hover:text-slate-900';
    }
  }

  function renderApp() {
    els.setupBanner.hidden = isConfigured();
    populateMonthYearSelectors();
    renderFilterButtons();
    const monthItems = getMonthTransactions();
    renderSummary(monthItems);
    renderTransactionList(monthItems);
  }

  // ==================== Bottom Sheet: Add / Edit Transaction ====================
  function renderCategoryGrid(type, selectedCategory = '') {
    const list = CATEGORIES[type] || CATEGORIES.expense;
    const defaultCat = selectedCategory && list.some((c) => c.id === selectedCategory)
      ? selectedCategory
      : list[0].id;

    // กรณีข้อมูลเดิมใน Sheet มีหมวดหมู่ที่ไม่ได้อยู่ในลิสต์มาตรฐาน ให้เพิ่มเข้าไปด้วยเพื่อไม่ให้ค่าหายตอนแก้ไข
    const items = list.some((c) => c.id === selectedCategory) || !selectedCategory
      ? list
      : [...list, { id: selectedCategory, label: selectedCategory, icon: '🏷️', bg: 'bg-slate-100 text-slate-700' }];

    const nodes = items.map((cat, idx) => {
      const wrap = document.createElement('div');
      const inputId = `cat-${type}-${idx}`;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'category';
      input.id = inputId;
      input.value = cat.id;
      input.dataset.type = type;
      input.className = 'visually-hidden radio-card-input cat-radio';
      input.checked = (selectedCategory || defaultCat) === cat.id;
      input.addEventListener('change', () => clearFieldError(null, els.txCategoryError));

      const label = document.createElement('label');
      label.htmlFor = inputId;
      label.className = 'radio-card-label cat-card flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-1 py-2 text-center transition hover:bg-slate-50';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'text-xl leading-none';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = cat.icon;

      const textSpan = document.createElement('span');
      textSpan.className = 'text-[11px] font-semibold text-slate-700 leading-tight line-clamp-1';
      textSpan.textContent = cat.label;

      label.append(iconSpan, textSpan);
      wrap.append(input, label);
      return wrap;
    });

    els.categoryGrid.replaceChildren(...nodes);
  }

  function clearFieldError(inputEl, errorEl) {
    if (inputEl) {
      inputEl.removeAttribute('aria-invalid');
      inputEl.setCustomValidity('');
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  function setFieldError(inputEl, errorEl, message) {
    if (inputEl) {
      inputEl.setAttribute('aria-invalid', 'true');
      inputEl.setCustomValidity(message);
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  function parseAmountInput(raw) {
    const normalized = String(raw || '').replace(/,/g, '').trim();
    if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return NaN;
    return Number(normalized);
  }

  function validateAmountField() {
    const val = parseAmountInput(els.txAmount.value);
    if (!els.txAmount.value.trim()) {
      setFieldError(els.txAmount, els.txAmountError, 'กรุณากรอกจำนวนเงิน');
      return false;
    }
    if (!Number.isFinite(val) || val <= 0) {
      setFieldError(els.txAmount, els.txAmountError, 'กรุณากรอกจำนวนเงินที่มากกว่า 0 (ทศนิยมไม่เกิน 2 ตำแหน่ง)');
      return false;
    }
    clearFieldError(els.txAmount, els.txAmountError);
    return true;
  }

  function validateDateField() {
    const dateVal = els.txDate.value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      setFieldError(els.txDate, els.txDateError, 'กรุณาเลือกวันที่ให้ถูกต้อง');
      return false;
    }
    clearFieldError(els.txDate, els.txDateError);
    return true;
  }

  function openAddTransaction() {
    state.editingId = null;
    els.txForm.reset();
    els.txId.value = '';
    els.txDialogTitle.textContent = 'จดรายการใหม่';
    els.txSubmitBtn.textContent = 'บันทึกรายการ';
    els.txDeleteBtn.hidden = true;

    els.typeExpense.checked = true;
    els.txDate.value = getTodayLocalISO();
    renderCategoryGrid('expense');

    clearFieldError(els.txAmount, els.txAmountError);
    clearFieldError(els.txDate, els.txDateError);
    clearFieldError(null, els.txCategoryError);

    openDialog(els.txDialog);
    requestAnimationFrame(() => els.txAmount.focus());
  }

  function openEditTransaction(id) {
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx) return;

    state.editingId = tx.id;
    els.txId.value = tx.id;
    els.txDialogTitle.textContent = 'แก้ไขรายการ';
    els.txSubmitBtn.textContent = 'บันทึกการแก้ไข';
    els.txDeleteBtn.hidden = false;

    const type = tx.type === 'income' ? 'income' : 'expense';
    els.typeIncome.checked = type === 'income';
    els.typeExpense.checked = type === 'expense';

    els.txAmount.value = String(Number(tx.amount) || '');
    els.txDate.value = tx.date || getTodayLocalISO();
    els.txNote.value = tx.note || '';
    renderCategoryGrid(type, tx.category);

    clearFieldError(els.txAmount, els.txAmountError);
    clearFieldError(els.txDate, els.txDateError);
    clearFieldError(null, els.txCategoryError);

    openDialog(els.txDialog);
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();

    const isAmountValid = validateAmountField();
    const isDateValid = validateDateField();
    const selectedCategoryEl = els.txForm.querySelector('input[name="category"]:checked');

    if (!selectedCategoryEl) {
      setFieldError(null, els.txCategoryError, 'กรุณาเลือกหมวดหมู่');
    } else {
      clearFieldError(null, els.txCategoryError);
    }

    if (!isAmountValid) {
      els.txAmount.focus();
      return;
    }
    if (!selectedCategoryEl) {
      els.categoryGrid.querySelector('input')?.focus();
      return;
    }
    if (!isDateValid) {
      els.txDate.focus();
      return;
    }

    els.txSubmitBtn.disabled = true;

    try {
      const formData = new FormData(els.txForm);
      const type = formData.get('type') === 'income' ? 'income' : 'expense';
      const amount = Math.round(parseAmountInput(formData.get('amount')) * 100) / 100;
      const category = String(formData.get('category') || '').trim();
      const date = String(formData.get('date') || '').trim();
      const note = String(formData.get('note') || '').trim();
      const nowIso = new Date().toISOString();

      const isEdit = Boolean(state.editingId);
      const record = {
        id: isEdit ? state.editingId : generateId(),
        date,
        type,
        category,
        amount,
        note,
        updated_at: nowIso,
      };

      // ปรับเดือนที่แสดงให้ตรงกับวันที่ของรายการที่เพิ่งบันทึก เพื่อเห็นผลทันที
      const [recYear, recMonth] = date.split('-').map(Number);
      if (recYear && recMonth) {
        state.selectedYear = recYear;
        state.selectedMonth = recMonth - 1;
      }

      if (isEdit) {
        const idx = state.transactions.findIndex((t) => t.id === record.id);
        if (idx !== -1) {
          state.transactions = state.transactions.with(idx, structuredClone(record));
        }
      } else {
        state.transactions = [structuredClone(record), ...state.transactions];
      }

      saveTransactionsCache();
      renderApp();
      await closeDialog(els.txDialog);

      showToast(isEdit ? 'แก้ไขรายการแล้ว' : 'บันทึกรายการแล้ว');
      pushMutation(isEdit ? 'update' : 'add', { data: record });
    } finally {
      els.txSubmitBtn.disabled = false;
    }
  }

  // ==================== Confirm Delete Flow ====================
  function openConfirmDelete(id) {
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx) return;

    state.pendingDeleteId = tx.id;
    const signAmt = formatBaht(tx.type === 'income' ? tx.amount : -tx.amount, { showSign: true });
    const notePart = tx.note ? ` (${tx.note})` : '';
    els.confirmSummary.textContent = `${tx.category}${notePart} · ${signAmt} · วันที่ ${formatThaiDateHeading(tx.date)}`;

    openDialog(els.confirmDialog);
  }

  async function executeDelete() {
    const id = state.pendingDeleteId;
    if (!id) return;

    state.pendingDeleteId = null;
    state.transactions = state.transactions.filter((tx) => tx.id !== id);
    saveTransactionsCache();
    renderApp();

    await closeDialog(els.confirmDialog);
    await closeDialog(els.txDialog);

    showToast('ลบรายการเรียบร้อยแล้ว');
    pushMutation('delete', { id });
  }

  // ==================== Settings Modal ====================
  function showSettingsFeedback(type, message) {
    const styles = {
      success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      error: 'bg-rose-50 text-rose-800 border border-rose-200',
      info: 'bg-sky-50 text-sky-800 border border-sky-200',
    };
    els.settingsFeedback.className = `rounded-xl px-3.5 py-2.5 text-xs font-medium ${styles[type] || styles.info}`;
    els.settingsFeedback.textContent = message;
    els.settingsFeedback.hidden = false;
  }

  function hideSettingsFeedback() {
    els.settingsFeedback.hidden = true;
    els.settingsFeedback.textContent = '';
  }

  function validateSettingsUrl() {
    const raw = els.cfgUrl.value.trim();
    if (!raw) {
      setFieldError(els.cfgUrl, els.cfgUrlError, 'กรุณากรอก Web App URL');
      return false;
    }
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== 'https:') {
        setFieldError(els.cfgUrl, els.cfgUrlError, 'URL ต้องขึ้นต้นด้วย https://');
        return false;
      }
    } catch {
      setFieldError(els.cfgUrl, els.cfgUrlError, 'รูปแบบ URL ไม่ถูกต้อง');
      return false;
    }
    clearFieldError(els.cfgUrl, els.cfgUrlError);
    return true;
  }

  function validateSettingsPin() {
    const raw = els.cfgPin.value.trim();
    if (!raw) {
      setFieldError(els.cfgPin, els.cfgPinError, 'กรุณากรอกรหัส PIN / Secret Token');
      return false;
    }
    clearFieldError(els.cfgPin, els.cfgPinError);
    return true;
  }

  function openSettingsModal() {
    els.cfgUrl.value = state.config.webAppUrl;
    els.cfgPin.value = state.config.pin;
    els.cfgPin.type = 'password';
    els.togglePinBtn.setAttribute('aria-pressed', 'false');
    els.togglePinBtn.setAttribute('aria-label', 'แสดงรหัส PIN');
    els.eyeShowIcon.classList.remove('hidden');
    els.eyeHideIcon.classList.add('hidden');

    clearFieldError(els.cfgUrl, els.cfgUrlError);
    clearFieldError(els.cfgPin, els.cfgPinError);
    hideSettingsFeedback();

    openDialog(els.settingsDialog);
  }

  async function handleTestConnection() {
    hideSettingsFeedback();
    const urlOk = validateSettingsUrl();
    const pinOk = validateSettingsPin();
    if (!urlOk) {
      els.cfgUrl.focus();
      return;
    }
    if (!pinOk) {
      els.cfgPin.focus();
      return;
    }

    els.testConnectionBtn.disabled = true;
    showSettingsFeedback('info', 'กำลังทดสอบการเชื่อมต่อกับ Google Sheets...');

    try {
      const res = await callApi('ping', {}, {
        webAppUrl: els.cfgUrl.value.trim(),
        pin: els.cfgPin.value.trim(),
      });
      showSettingsFeedback('success', res.message || 'เชื่อมต่อ Google Sheets สำเร็จ!');
    } catch (err) {
      showSettingsFeedback('error', err.message || 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบ URL และ PIN');
    } finally {
      els.testConnectionBtn.disabled = false;
    }
  }

  async function handleSettingsSubmit(event) {
    event.preventDefault();
    hideSettingsFeedback();

    const urlOk = validateSettingsUrl();
    const pinOk = validateSettingsPin();
    if (!urlOk) {
      els.cfgUrl.focus();
      return;
    }
    if (!pinOk) {
      els.cfgPin.focus();
      return;
    }

    els.saveSettingsBtn.disabled = true;
    showSettingsFeedback('info', 'กำลังตรวจสอบการเชื่อมต่อและบันทึก...');

    const candidateUrl = els.cfgUrl.value.trim();
    const candidatePin = els.cfgPin.value.trim();

    try {
      await callApi('ping', {}, { webAppUrl: candidateUrl, pin: candidatePin });
      saveConfig(candidateUrl, candidatePin);
      localStorage.setItem(STORAGE_KEYS.FIRST_PROMPT_SEEN, '1');
      await closeDialog(els.settingsDialog);
      renderApp();
      showToast('บันทึกการตั้งค่าแล้ว กำลังซิงก์ข้อมูล...');
      syncFromServer({ manual: false });
    } catch (err) {
      showSettingsFeedback('error', err.message || 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบ URL และ PIN');
    } finally {
      els.saveSettingsBtn.disabled = false;
    }
  }

  function handleClearCache() {
    state.transactions = [];
    state.pendingQueue = [];
    state.lastSync = null;
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.PENDING_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    renderApp();
    showSettingsFeedback('info', 'ล้างข้อมูลแคชในเครื่องเรียบร้อยแล้ว');
    if (isConfigured()) {
      syncFromServer({ manual: false });
    } else {
      updateSyncBadge('unconfigured');
    }
  }

  // ==================== Event Wiring ====================
  function bindEvents() {
    setupDialog(els.txDialog);
    setupDialog(els.settingsDialog);
    setupDialog(els.confirmDialog);

    // Header actions
    els.refreshBtn.addEventListener('click', () => syncFromServer({ manual: true }));
    els.settingsBtn.addEventListener('click', openSettingsModal);
    els.bannerSetupBtn.addEventListener('click', openSettingsModal);

    // Month/Year navigation
    els.prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
    els.nextMonthBtn.addEventListener('click', () => shiftMonth(1));
    els.monthSelect.addEventListener('change', () => {
      state.selectedMonth = Number(els.monthSelect.value);
      renderApp();
    });
    els.yearSelect.addEventListener('change', () => {
      state.selectedYear = Number(els.yearSelect.value);
      renderApp();
    });
    els.todayMonthBtn.addEventListener('click', () => {
      const today = new Date();
      state.selectedYear = today.getFullYear();
      state.selectedMonth = today.getMonth();
      renderApp();
    });

    // Filter pills
    for (const btn of els.filterBtns) {
      btn.addEventListener('click', () => {
        state.filterType = btn.dataset.filter || 'all';
        renderApp();
      });
    }

    // FAB & Transaction Bottom Sheet
    els.fabAddBtn.addEventListener('click', openAddTransaction);
    els.closeTxDialogBtn.addEventListener('click', () => closeDialog(els.txDialog));

    els.typeExpense.addEventListener('change', () => {
      if (els.typeExpense.checked) renderCategoryGrid('expense');
    });
    els.typeIncome.addEventListener('change', () => {
      if (els.typeIncome.checked) renderCategoryGrid('income');
    });

    // Validate on blur, clear on input
    els.txAmount.addEventListener('input', () => {
      // กรองอักขระที่ไม่ใช่ตัวเลข จุดทศนิยม หรือลูกน้ำ
      const cleaned = els.txAmount.value.replace(/[^\d.,]/g, '');
      if (cleaned !== els.txAmount.value) {
        els.txAmount.value = cleaned;
      }
      if (els.txAmount.getAttribute('aria-invalid') === 'true') {
        validateAmountField();
      }
    });
    els.txAmount.addEventListener('blur', () => {
      if (els.txAmount.value.trim()) validateAmountField();
    });

    els.txDate.addEventListener('input', () => {
      if (els.txDate.getAttribute('aria-invalid') === 'true') validateDateField();
    });
    els.txDate.addEventListener('blur', validateDateField);

    els.txForm.addEventListener('submit', handleTransactionSubmit);
    els.txDeleteBtn.addEventListener('click', () => {
      if (state.editingId) openConfirmDelete(state.editingId);
    });

    // Confirm Delete Modal
    els.confirmCancelBtn.addEventListener('click', () => closeDialog(els.confirmDialog));
    els.confirmDeleteBtn.addEventListener('click', executeDelete);

    // Settings Modal
    els.closeSettingsBtn.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEYS.FIRST_PROMPT_SEEN, '1');
      closeDialog(els.settingsDialog);
    });
    els.cfgUrl.addEventListener('input', () => {
      if (els.cfgUrl.getAttribute('aria-invalid') === 'true') validateSettingsUrl();
    });
    els.cfgUrl.addEventListener('blur', () => {
      if (els.cfgUrl.value.trim()) validateSettingsUrl();
    });
    els.cfgPin.addEventListener('input', () => {
      if (els.cfgPin.getAttribute('aria-invalid') === 'true') validateSettingsPin();
    });
    els.cfgPin.addEventListener('blur', () => {
      if (els.cfgPin.value.trim()) validateSettingsPin();
    });

    els.togglePinBtn.addEventListener('click', () => {
      const showing = els.cfgPin.type === 'text';
      els.cfgPin.type = showing ? 'password' : 'text';
      els.togglePinBtn.setAttribute('aria-pressed', String(!showing));
      els.togglePinBtn.setAttribute('aria-label', showing ? 'แสดงรหัส PIN' : 'ซ่อนรหัส PIN');
      els.eyeShowIcon.classList.toggle('hidden', !showing);
      els.eyeHideIcon.classList.toggle('hidden', showing);
    });

    els.testConnectionBtn.addEventListener('click', handleTestConnection);
    els.settingsForm.addEventListener('submit', handleSettingsSubmit);
    els.clearCacheBtn.addEventListener('click', handleClearCache);

    // Online reconnect auto-sync
    window.addEventListener('online', () => {
      if (isConfigured()) {
        syncFromServer({ manual: false });
      }
    });
  }

  // ==================== PWA Service Worker ====================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
      });
    }
  }

  // ==================== Quick Setup via URL Hash ====================
  function applySetupFromHash() {
    if (!window.location.hash || window.location.hash.length <= 1) {
      return false;
    }

    const params = new URLSearchParams(window.location.hash.slice(1));
    const rawUrl = params.get('url')?.trim();
    if (!rawUrl) {
      return false;
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return false;
    }
    if (parsed.protocol !== 'https:') {
      return false;
    }

    history.replaceState(null, '', window.location.pathname + window.location.search);
    openSettingsModal();
    els.cfgUrl.value = rawUrl;
    clearFieldError(els.cfgUrl, els.cfgUrlError);
    showSettingsFeedback('info', 'กรอก Web App URL ให้อัตโนมัติแล้ว กรุณาใส่รหัส PIN แล้วกดบันทึก');
    requestAnimationFrame(() => els.cfgPin.focus());
    return true;
  }

  // ==================== Bootstrap ====================
  function init() {
    loadLocalState();
    bindEvents();

    // 1. แสดงข้อมูลจาก LocalStorage ทันที (Instant Load)
    renderApp();

    // 2. ตรวจสอบการตั้งค่าและซิงก์เบื้องหลัง
    if (isConfigured()) {
      if (state.pendingQueue.length > 0) {
        updateSyncBadge('pending');
      } else if (state.lastSync) {
        updateSyncBadge('synced');
      }
      syncFromServer({ manual: false });
    } else {
      updateSyncBadge('unconfigured');
    }

    const handledHash = applySetupFromHash();
    if (!handledHash && !isConfigured() && !localStorage.getItem(STORAGE_KEYS.FIRST_PROMPT_SEEN)) {
      openSettingsModal();
    }

    registerServiceWorker();
  }

  init();
})();
