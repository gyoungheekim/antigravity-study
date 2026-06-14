/**
 * CORTIS STAGE ON-AIR - Behavior Script
 * Rebranded for CORTIS, now supporting robust localStorage schedule edits.
 */

// ==========================================================================
// STATE MANAGEMENT & CONFIG
// ==========================================================================
let schedules = [];
let isEditMode = false;
let editingScheduleId = null;

// Category mapping helper
const CATEGORY_MAP = {
  broadcast: { ko: '음악방송', colorVar: 'var(--color-broadcast)', glowVar: 'var(--neon-pink-glow)' },
  fansign: { ko: '팬싸인회', colorVar: 'var(--color-fansign)', glowVar: 'var(--neon-blue-glow)' },
  videocall: { ko: '영통팬싸', colorVar: 'var(--color-videocall)', glowVar: 'var(--neon-gold-glow)' },
  comeback: { ko: '컴백/티저', colorVar: 'var(--color-comeback)', glowVar: 'var(--neon-purple-glow)' },
  event: { ko: '행사', colorVar: 'var(--color-event)', glowVar: 'var(--neon-green-glow)' },
  etc: { ko: '기타', colorVar: 'var(--color-etc)', glowVar: 'var(--neon-gray-glow)' }
};

// ==========================================================================
// DATE HELPER FUNCTIONS
// ==========================================================================
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOffsetDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${date}`;
}

function formatPrettyDate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${year}.${month}.${day} (${week})`;
  } catch (e) {
    return dateStr;
  }
}

// ==========================================================================
// CORTIS DEFAULT DATA INITIALIZER
// ==========================================================================
function generateCORTISDefaultSchedules() {
  const today = getTodayString();
  
  return [
    {
      id: 'cortis-init-1',
      date: today,
      time: '14:00',
      category: 'videocall',
      content: '코르티스(CORTIS) 데뷔 1주년 기념 1:1 스페셜 영통팬싸인회'
    },
    {
      id: 'cortis-init-2',
      date: today,
      time: '18:00',
      category: 'broadcast',
      content: 'Mnet 엠카운트다운 - 코르티스 신곡 RESONANCE 컴백 스페셜 무대 본방송'
    },
    {
      id: 'cortis-init-3',
      date: today,
      time: '22:00',
      category: 'comeback',
      content: 'CORTIS 공식 유튜브 채널 - 미니 1집 "color outside the line" 컴백 기념 스페셜 코멘터리 톡방'
    },
    {
      id: 'cortis-init-4',
      date: getOffsetDateString(1), // Tomorrow
      time: '19:00',
      category: 'fansign',
      content: '코르티스 미니 2집 발매 기념 오프라인 팬싸인회 (핫트랙스 명동점 대면)'
    },
    {
      id: 'cortis-init-5',
      date: getOffsetDateString(3), // In 3 days
      time: '00:00',
      category: 'comeback',
      content: 'CORTIS 미니 3집 서브 타이틀곡 "Double Green" 공식 티저 이미지 & 뮤비 티저 공개'
    },
    {
      id: 'cortis-init-6',
      date: getOffsetDateString(2), // In 2 days
      time: '15:00',
      category: 'etc',
      content: 'CORTIS 공식 팬카페 - 데뷔 1주년 스페셜 텍스트 채팅 파티 이벤트'
    },
    {
      id: 'cortis-init-7',
      date: getOffsetDateString(4), // In 4 days
      time: '19:00',
      category: 'event',
      content: 'CORTIS 2026 드림콘서트 본공연 라이브 무대 출연 (서울 월드컵 경기장)'
    }
  ];
}

// ==========================================================================
// LOCAL STORAGE SYNC
// ==========================================================================
function loadSchedules() {
  const stored = localStorage.getItem('cortis_schedules');
  if (stored) {
    try {
      schedules = JSON.parse(stored);
      if (!Array.isArray(schedules)) {
        throw new Error('Stored data is not an array');
      }
    } catch (e) {
      console.error('Failed to parse CORTIS stored schedules. Resetting to defaults.', e);
      schedules = generateCORTISDefaultSchedules();
      saveSchedules();
    }
  } else {
    schedules = generateCORTISDefaultSchedules();
    saveSchedules();
  }
}

function saveSchedules() {
  localStorage.setItem('cortis_schedules', JSON.stringify(schedules));
}

// ==========================================================================
// DOM ELEMENTS REFERENCE
// ==========================================================================
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModalX = document.getElementById('btn-close-modal-x');
const btnCancel = document.getElementById('btn-cancel');
const scheduleModal = document.getElementById('schedule-modal');
const scheduleForm = document.getElementById('schedule-form');
const btnClearAll = document.getElementById('btn-clear-all');

const inputDate = document.getElementById('input-date');
const inputTime = document.getElementById('input-time');
const inputContent = document.getElementById('input-content');

const currentDateDisplay = document.getElementById('current-date-display');
const todayTimelineContainer = document.getElementById('today-timeline-container');
const databaseScheduleList = document.getElementById('database-schedule-list');

const filterTabs = document.querySelectorAll('.tab-btn');
const counts = {
  all: document.getElementById('count-all'),
  broadcast: document.getElementById('count-broadcast'),
  fansign: document.getElementById('count-fansign'),
  videocall: document.getElementById('count-videocall'),
  comeback: document.getElementById('count-comeback'),
  event: document.getElementById('count-event'),
  etc: document.getElementById('count-etc')
};

let activeCategoryFilter = 'all';

// ==========================================================================
// TOAST NOTIFICATION UTILITY
// ==========================================================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="fa-solid fa-circle-info"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Trigger browser paint
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Dismiss toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3000);
}

// ==========================================================================
// MODAL CONTROLS & FORM VALIDATION
// ==========================================================================
function openModal(editId = null) {
  clearValidationErrors();

  if (editId) {
    // 1. Edit Mode
    isEditMode = true;
    editingScheduleId = editId;

    const schedule = schedules.find(s => s.id === editId);
    if (schedule) {
      inputDate.value = schedule.date;
      inputTime.value = schedule.time;
      inputContent.value = schedule.content;
      
      const radio = scheduleForm.querySelector(`input[name="input-category"][value="${schedule.category}"]`);
      if (radio) radio.checked = true;

      // Update Modal UI Header & Submit Button
      document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square header-icon"></i> 스케줄 수정';
      document.getElementById('btn-submit').textContent = '수정완료';
    }
  } else {
    // 2. Register Mode
    isEditMode = false;
    editingScheduleId = null;

    scheduleForm.reset();
    inputDate.value = getTodayString();
    const now = new Date();
    inputTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Reset Modal UI Header & Submit Button
    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-circle-plus header-icon"></i> 스케줄 등록';
    document.getElementById('btn-submit').textContent = '등록하기';
  }

  scheduleModal.classList.add('active');
  scheduleModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  scheduleModal.classList.remove('active');
  scheduleModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  clearValidationErrors();
  scheduleForm.reset();
  isEditMode = false;
  editingScheduleId = null;
}

function clearValidationErrors() {
  document.querySelectorAll('.form-group').forEach(group => {
    group.classList.remove('has-error');
  });
}

function validateForm() {
  let isValid = true;
  clearValidationErrors();

  if (!inputDate.value) {
    document.getElementById('error-date').parentElement.classList.add('has-error');
    isValid = false;
  }
  if (!inputTime.value) {
    document.getElementById('error-time').parentElement.classList.add('has-error');
    isValid = false;
  }
  const selectedCategory = scheduleForm.querySelector('input[name="input-category"]:checked');
  if (!selectedCategory) {
    document.getElementById('error-category').parentElement.classList.add('has-error');
    isValid = false;
  }
  if (!inputContent.value || inputContent.value.trim() === '') {
    document.getElementById('error-content').parentElement.classList.add('has-error');
    isValid = false;
  }
  return isValid;
}

// ==========================================================================
// CORE CRUD & RENDER LOGIC
// ==========================================================================
function renderTodayTimeline() {
  const today = getTodayString();
  currentDateDisplay.textContent = formatPrettyDate(today);

  const todaySchedules = schedules.filter(s => s.date === today);
  todaySchedules.sort((a, b) => a.time.localeCompare(b.time));

  if (todaySchedules.length === 0) {
    todayTimelineContainer.innerHTML = `
      <div class="no-schedule-fallback">
        <i class="fa-solid fa-moon fallback-icon"></i>
        <p>오늘 공식 일정이 없습니다.</p>
        <p class="fallback-sub">새로운 스케줄을 추가하여 CORTIS의 하루를 채워보세요!</p>
      </div>
    `;
    return;
  }

  todayTimelineContainer.innerHTML = todaySchedules.map(item => {
    const catDetails = CATEGORY_MAP[item.category] || { ko: '기타', colorVar: '#ffffff', glowVar: 'rgba(255,255,255,0.2)' };
    return `
      <div class="timeline-card" style="--category-color: ${catDetails.colorVar}; --category-glow: ${catDetails.glowVar};">
        <div class="timeline-node"></div>
        <div class="timeline-time-tag">
          <i class="fa-regular fa-clock"></i> ${item.time}
        </div>
        <div class="timeline-content">${escapeHTML(item.content)}</div>
        <div class="card-footer">
          <span class="timeline-category-badge">${catDetails.ko}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAllSchedules() {
  updateCategoryCounts();

  let filtered = [...schedules];
  if (activeCategoryFilter !== 'all') {
    filtered = schedules.filter(s => s.category === activeCategoryFilter);
  }

  filtered.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });

  if (filtered.length === 0) {
    databaseScheduleList.innerHTML = `
      <div class="no-schedule-fallback">
        <i class="fa-solid fa-box-open fallback-icon"></i>
        <p>스케줄이 존재하지 않습니다.</p>
        <p class="fallback-sub">선택한 분류에 새로운 스케줄을 기록해 보세요.</p>
      </div>
    `;
    return;
  }

  databaseScheduleList.innerHTML = filtered.map(item => {
    const catDetails = CATEGORY_MAP[item.category] || { ko: '기타', colorVar: '#ffffff', glowVar: 'rgba(255,255,255,0.2)' };
    const dateFormatted = formatPrettyDate(item.date);
    
    return `
      <div class="db-card" style="--category-color: ${catDetails.colorVar}">
        <div class="db-card-info">
          <div class="db-date-time-row">
            <span><i class="fa-regular fa-calendar-days"></i> ${dateFormatted}</span>
            <span class="db-time"><i class="fa-regular fa-clock"></i> ${item.time}</span>
          </div>
          <div class="db-content">${escapeHTML(item.content)}</div>
        </div>
        <div class="db-card-actions">
          <span class="timeline-category-badge" style="margin-right: 0.5rem;">${catDetails.ko}</span>
          <!-- Edit Button -->
          <button class="btn-edit-card" onclick="handleEditSchedule('${item.id}')" title="스케줄 수정" aria-label="스케줄 수정">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <!-- Delete Button -->
          <button class="btn-delete-card" onclick="handleDeleteSchedule('${item.id}')" title="스케줄 삭제" aria-label="스케줄 삭제">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateCategoryCounts() {
  const totals = { all: schedules.length, broadcast: 0, fansign: 0, videocall: 0, comeback: 0, event: 0, etc: 0 };
  schedules.forEach(s => {
    if (totals[s.category] !== undefined) totals[s.category]++;
  });

  Object.keys(counts).forEach(key => {
    if (counts[key]) counts[key].textContent = totals[key];
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================================================
// EVENT HANDLERS
// ==========================================================================
function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return;

  const selectedCategoryEl = scheduleForm.querySelector('input[name="input-category"]:checked');
  
  if (isEditMode && editingScheduleId) {
    // 1. Edit Mode Submission
    schedules = schedules.map(s => {
      if (s.id === editingScheduleId) {
        return {
          ...s,
          date: inputDate.value,
          time: inputTime.value,
          category: selectedCategoryEl.value,
          content: inputContent.value.trim()
        };
      }
      return s;
    });

    saveSchedules();
    renderTodayTimeline();
    renderAllSchedules();
    closeModal();
    showToast("스케줄이 성공적으로 수정되었습니다!");
  } else {
    // 2. Register Mode Submission
    const newSchedule = {
      id: 'custom-' + Date.now().toString(),
      date: inputDate.value,
      time: inputTime.value,
      category: selectedCategoryEl.value,
      content: inputContent.value.trim()
    };

    schedules.push(newSchedule);
    saveSchedules();
    renderTodayTimeline();
    renderAllSchedules();
    closeModal();
    showToast("새로운 스케줄이 성공적으로 등록되었습니다!");
  }
}

// Global hook for Edit button click
window.handleEditSchedule = function(id) {
  openModal(id);
};

window.handleDeleteSchedule = function(id) {
  if (confirm('이 스케줄을 삭제하시겠습니까?')) {
    schedules = schedules.filter(s => s.id !== id);
    saveSchedules();
    renderTodayTimeline();
    renderAllSchedules();
    showToast("스케줄이 삭제되었습니다.");
  }
};

function handleClearAll() {
  if (confirm('정말로 등록된 모든 스케줄을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
    schedules = [];
    saveSchedules();
    renderTodayTimeline();
    renderAllSchedules();
    showToast("모든 스케줄이 완전히 초기화되었습니다.");
  }
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function initFilterTabs() {
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategoryFilter = tab.getAttribute('data-category');
      renderAllSchedules();
    });
  });
}

function init() {
  // Bind Event Listeners
  btnOpenModal.addEventListener('click', () => openModal());
  btnCloseModalX.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  scheduleForm.addEventListener('submit', handleFormSubmit);
  btnClearAll.addEventListener('click', handleClearAll);

  // Close modal on escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && scheduleModal.classList.contains('active')) {
      closeModal();
    }
  });

  // Close modal clicking outside
  scheduleModal.addEventListener('click', (e) => {
    if (e.target === scheduleModal) {
      closeModal();
    }
  });

  // Load Data & Render
  loadSchedules();
  initFilterTabs();
  renderTodayTimeline();
  renderAllSchedules();
}

document.addEventListener('DOMContentLoaded', init);
