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

const CATEGORY_MAP = {
  broadcast: { ko: '음악방송', colorVar: 'var(--color-broadcast)', glowVar: 'var(--neon-pink-glow)' },
  fansign: { ko: '팬싸인회', colorVar: 'var(--color-fansign)', glowVar: 'var(--neon-blue-glow)' },
  videocall: { ko: '영통팬싸', colorVar: 'var(--color-videocall)', glowVar: 'var(--neon-gold-glow)' },
  comeback: { ko: '컴백/티저', colorVar: 'var(--color-comeback)', glowVar: 'var(--neon-purple-glow)' },
  event: { ko: '행사', colorVar: 'var(--color-event)', glowVar: 'var(--neon-green-glow)' },
  etc: { ko: '기타', colorVar: 'var(--color-etc)', glowVar: 'var(--neon-gray-glow)' },
  tour: { ko: '투어', colorVar: 'var(--color-tour, #ff5722)', glowVar: 'var(--neon-orange-glow)' },
  award: { ko: '시상식', colorVar: 'var(--color-award, #9c27b0)', glowVar: 'var(--neon-purple-glow)' }
};

// ==========================================================================
// DATE HELPER FUNCTIONS
// ==========================================================================
function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatPrettyDate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} (${week})`;
  } catch (e) { return dateStr; }
}

function generateCORTISDefaultSchedules() {
  return [
    { id: 'cortis-init-1', date: '2026-04-20', time: '18:00', category: 'comeback', content: "리드 싱글 'REDRED' 발매" },
    { id: 'cortis-init-2', date: '2026-04-20', time: '20:00', category: 'etc', content: "리드 싱글 ‘REDRED' 발매 기념 릴리즈 파티" },
    { id: 'cortis-init-3', date: '2026-05-04', time: '18:00', category: 'comeback', content: "EP 2집 'GREENGREEN' 발매" },
    { id: 'cortis-init-4', date: '2026-05-04', time: '20:00', category: 'etc', content: "EP 2집 'GREENGREEN' 발매 기념 릴리즈 파티" },
    { id: 'cortis-init-5', date: '2026-05-30', time: '15:50', category: 'broadcast', content: "MBC 음악중심 'ACAI'" },
    { id: 'cortis-init-6', date: '2026-06-04', time: '18:00', category: 'broadcast', content: "KBS 뮤직뱅크 'YOUNGCREATORCREW'" },
    { id: 'cortis-init-7', date: '2026-06-07', time: '15:15', category: 'broadcast', content: "SBS 인기가요 'REDRED' 막방" },
    { id: 'cortis-init-8', date: '2026-06-10', time: '19:00', category: 'videocall', content: "위드뮤 'REDRED' 영통팬싸" },
    { id: 'cortis-init-9', date: '2026-06-12', time: '09:00', category: 'event', content: '2026 FIFA 북중미 월드컵 서울 광화문 광장 거리 응원' },
    { id: 'cortis-init-10', date: '2026-06-13', time: '18:00', category: 'event', content: '레드불 댄스 유어 스타일 스페셜' },
    { id: 'cortis-init-11', date: '2026-06-14', time: '19:00', category: 'fansign', content: 'Meet&Greet 일본 오프라인' },
    { id: 'cortis-init-12', date: '2026-06-20', time: '', category: 'event', content: 'Allo Bank Festival (인도네시아 아레나)' },
    { id: 'cortis-init-13', date: '2026-07-18', time: '', category: 'tour', content: 'PUT YOUR PHONE DOWN INCHEON (인스파이어 아레나)' },
    { id: 'cortis-init-14', date: '2026-07-19', time: '', category: 'tour', content: 'PUT YOUR PHONE DOWN INCHEON (인스파이어 아레나)' },
    { id: 'cortis-init-15', date: '2026-07-25', time: '', category: 'award', content: 'KMA 차트어워즈 (고려대학교 화정체육관)' },
    { id: 'cortis-init-16', date: '2026-07-31', time: '', category: 'event', content: 'Lollapalooza Early Show' }
  ];
}

// ==========================================================================
// LOCAL STORAGE SYNC
// ==========================================================================
// 🔍 [바뀐 부분 1: 데이터 영구 보존] loadSchedules와 saveSchedules 함수가 새로고침 시 초기화 현상을 막아줍니다.
function loadSchedules() {
  const stored = localStorage.getItem('cortis_schedules');
  if (stored) {
    try {
      schedules = JSON.parse(stored);
    } catch (e) {
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
// DOM ELEMENTS REFERENCE & MODAL CONTROLS
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
  all: document.getElementById('count-all'), broadcast: document.getElementById('count-broadcast'),
  fansign: document.getElementById('count-fansign'), videocall: document.getElementById('count-videocall'),
  comeback: document.getElementById('count-comeback'), event: document.getElementById('count-event'),
  etc: document.getElementById('count-etc'), tour: document.getElementById('count-tour'), award: document.getElementById('count-award')
};
let activeCategoryFilter = 'all';

function openModal(editId = null) {
  clearValidationErrors();
  if (editId) {
    isEditMode = true;
    editingScheduleId = editId;
    const schedule = schedules.find(s => s.id === editId);
    if (schedule) {
      inputDate.value = schedule.date;
      inputTime.value = schedule.time || '';
      inputContent.value = schedule.content;
      const radio = scheduleForm.querySelector(`input[name="input-category"][value="${schedule.category}"]`);
      if (radio) radio.checked = true;
      document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square header-icon"></i> 스케줄 수정';
      document.getElementById('btn-submit').textContent = '수정완료';
    }
  } else {
    isEditMode = false;
    editingScheduleId = null;
    scheduleForm.reset();
    inputDate.value = getTodayString();
    inputTime.value = '';
    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-circle-plus header-icon"></i> 스케줄 등록';
    document.getElementById('btn-submit').textContent = '등록하기';
  }
  scheduleModal.classList.add('active');
}

function closeModal() {
  scheduleModal.classList.remove('active');
  clearValidationErrors();
}

function clearValidationErrors() {
  document.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));
}

// ==========================================================================
// CORE VALIDATION LOGIC
// ==========================================================================
// 🔍 [바뀐 부분 2: 유효성 검사] 제목/내용 누락 시 빈 카드 생성을 차단하고, 시간은 미정이 가능하도록 패스시킵니다.
function validateForm() {
  let isValid = true;
  clearValidationErrors();

  if (!inputDate.value) {
    document.getElementById('error-date').parentElement.classList.add('has-error');
    isValid = false;
  }
  
  // 💡 [시간 검사 제외 지점]: 시간 필드는 공백 제출을 허용하므로 체크 로직을 넣지 않았습니다.

  const selectedCategory = scheduleForm.querySelector('input[name="input-category"]:checked');
  if (!selectedCategory) {
    const errCat = document.getElementById('error-category');
    if (errCat) errCat.parentElement.classList.add('has-error');
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
  todaySchedules.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (todaySchedules.length === 0) {
    todayTimelineContainer.innerHTML = `<div class="no-schedule-fallback"><p>오늘 공식 일정이 없습니다.</p></div>`;
    return;
  }

  todayTimelineContainer.innerHTML = todaySchedules.map(item => {
    const catDetails = CATEGORY_MAP[item.category] || { ko: '기타', colorVar: '#ffffff' };
    const timeTagHTML = item.time 
      ? `<div class="timeline-time-tag"><i class="fa-regular fa-clock"></i> ${item.time}</div>` 
      : `<div class="timeline-time-tag timeless"><i class="fa-regular fa-calendar"></i> 하루종일</div>`;

    return `
      <div class="timeline-card" style="--category-color: ${catDetails.colorVar};">
        ${timeTagHTML}
        <div class="timeline-content">${escapeHTML(item.content)}</div>
        <div class="card-footer"><span class="timeline-category-badge">${catDetails.ko}</span></div>
      </div>`;
  }).join('');
}

function renderAllSchedules() {
  updateCategoryCounts();
  let filtered = activeCategoryFilter !== 'all' ? schedules.filter(s => s.category === activeCategoryFilter) : [...schedules];
  filtered.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (a.time || '').localeCompare(b.time || ''));

  if (filtered.length === 0) {
    databaseScheduleList.innerHTML = `<div class="no-schedule-fallback"><p>스케줄이 존재하지 않습니다.</p></div>`;
    return;
  }

  databaseScheduleList.innerHTML = filtered.map(item => {
    const catDetails = CATEGORY_MAP[item.category] || { ko: '기타', colorVar: '#ffffff' };
    const timeDisplayHTML = item.time 
      ? `<span class="db-time"><i class="fa-regular fa-clock"></i> ${item.time}</span>` 
      : `<span class="db-time timeless"><i class="fa-solid fa-minus"></i> 시간미정</span>`;
    
    return `
      <div class="db-card" style="--category-color: ${catDetails.colorVar}">
        <div class="db-card-info">
          <div class="db-date-time-row">
            <span><i class="fa-regular fa-calendar-days"></i> ${formatPrettyDate(item.date)}</span>
            ${timeDisplayHTML}
          </div>
          <div class="db-content">${escapeHTML(item.content)}</div>
        </div>
        <div class="db-card-actions">
          <span class="timeline-category-badge">${catDetails.ko}</span>
          <button class="btn-edit-card" onclick="handleEditSchedule('${item.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn-delete-card" onclick="handleDeleteSchedule('${item.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>`;
  }).join('');
}

function updateCategoryCounts() {
  const totals = { all: schedules.length, broadcast: 0, fansign: 0, videocall: 0, comeback: 0, event: 0, etc: 0, tour: 0, award: 0 };
  schedules.forEach(s => { if (totals[s.category] !== undefined) totals[s.category]++; });
  Object.keys(counts).forEach(key => { if (counts[key]) counts[key].textContent = totals[key]; });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// ==========================================================================
// EVENT HANDLERS
// ==========================================================================
function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return;

  const selectedCategoryEl = scheduleForm.querySelector('input[name="input-category"]:checked');
  
  if (isEditMode && editingScheduleId) {
    schedules = schedules.map(s => {
      if (s.id === editingScheduleId) {
        return {
          ...s,
          date: inputDate.value,
          time: inputTime.value ? inputTime.value : '',
          category: selectedCategoryEl.value,
          content: inputContent.value.trim()
        };
      }
      return s;
    });
    // 🔍 [바뀐 부분 3-1: 실시간 동기화] 수정 완료 시 즉시 브라우저에 저장
    saveSchedules();
  } else {
    const newSchedule = {
      id: 'custom-' + Date.now().toString(),
      date: inputDate.value,
      time: inputTime.value ? inputTime.value : '',
      category: selectedCategoryEl.value,
      content: inputContent.value.trim()
    };
    schedules.push(newSchedule);
    // 🔍 [바뀐 부분 3-2: 실시간 동기화] 등록 성공 시 즉시 브라우저에 저장
    saveSchedules();
  }
  renderTodayTimeline();
  renderAllSchedules();
  closeModal();
}

window.handleEditSchedule = function(id) { openModal(id); };
window.handleDeleteSchedule = function(id) {
  if (confirm('이 스케줄을 삭제하시겠습니까?')) {
    schedules = schedules.filter(s => s.id !== id);
    saveSchedules(); // 🔍 [바뀐 부분 3-3: 실시간 동기화] 삭제 시 즉시 스토리지 반영
    renderTodayTimeline();
    renderAllSchedules();
  }
};

function handleClearAll() {
  if (confirm('정말로 모든 스케줄을 초기화하시겠습니까?')) {
    schedules = [];
    saveSchedules(); // 🔍 [바뀐 부분 3-4: 실시간 동기화] 전체 삭제 시 즉시 스토리지 초기화
    renderTodayTimeline();
    renderAllSchedules();
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
  btnOpenModal.addEventListener('click', () => openModal());
  btnCloseModalX.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  scheduleForm.addEventListener('submit', handleFormSubmit);
  btnClearAll.addEventListener('click', handleClearAll);

  // 🔍 [바뀐 부분 1-2: 초기 로드] 앱 구동 직후 로컬스토리지 데이터를 가장 먼저 검사하여 가져옵니다.
  loadSchedules();
  initFilterTabs();
  renderTodayTimeline();
  renderAllSchedules();
}

document.addEventListener('DOMContentLoaded', init);
