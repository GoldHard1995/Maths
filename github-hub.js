const PLATFORM_URL = 'https://script.google.com/macros/s/AKfycbzJRblwkScQZuKpUQjiwkpZIMKyY0-h4vO8aFhqqVU2rgINbxYDPW0nH60YL8Pxpz0r/exec';
const DIRECTED_URL = 'https://kwh-number-blocks.kongwinghang1995.chatgpt.site/';
const ALGEBRA_URL = 'https://kwh-algebra-blocks.kongwinghang1995.chatgpt.site/';
const STORAGE_KEY = 'maths-platform-student-v1';
const BADGE_ASSET_ROOT = 'maths-block-world-hub/public/badges/';

let config = { schoolYear: '', classes: ['1A', '1B', '1C', '1D'], studentNoMin: 1, studentNoMax: 33 };
let identity = readIdentity();
let currentFilter = 'all';
let badges = [];

const identityView = document.querySelector('#identity-view');
const dashboardView = document.querySelector('#dashboard-view');
const schoolYear = document.querySelector('#school-year');
const className = document.querySelector('#class-name');
const studentNo = document.querySelector('#student-no');
const chooseStudent = document.querySelector('#choose-student');
const identityMessage = document.querySelector('#identity-message');
const dashboardMessage = document.querySelector('#dashboard-message');

function readIdentity() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function jsonp(parameters, prefix) {
  return new Promise((resolve, reject) => {
    const callback = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('讀取逾時，請稍後再試。')), 15000);
    function finish(error, value) {
      clearTimeout(timer);
      script.remove();
      delete window[callback];
      error ? reject(error) : resolve(value);
    }
    window[callback] = value => finish(null, value);
    script.src = `${PLATFORM_URL}?${new URLSearchParams({ ...parameters, callback })}`;
    script.onerror = () => finish(new Error('未能連接收藏系統。'));
    document.body.appendChild(script);
  });
}

function validIdentity() {
  const no = Number(studentNo.value);
  return Boolean(config.schoolYear) && config.classes.includes(className.value) && Number.isInteger(no) && no >= config.studentNoMin && no <= config.studentNoMax;
}

function populateConfig(nextConfig) {
  config = nextConfig;
  schoolYear.value = config.schoolYear || '等待連接';
  studentNo.placeholder = `${config.studentNoMin} 至 ${config.studentNoMax}`;
  className.replaceChildren(new Option('請選擇', ''));
  config.classes.forEach(item => className.add(new Option(item, item)));
  chooseStudent.disabled = !validIdentity();
}

function gameUrl(base) {
  const url = new URL(base);
  url.searchParams.set('schoolYear', identity.schoolYear);
  url.searchParams.set('className', identity.className);
  url.searchParams.set('studentNo', String(identity.studentNo));
  return url.toString();
}

function showDashboard() {
  identityView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  document.querySelector('#student-label').textContent = `${identity.schoolYear}　${identity.className} 班　${identity.studentNo} 號`;
  document.querySelector('#student-heading').textContent = `${identity.className} 班　${identity.studentNo} 號`;
  document.querySelector('#directed-game').href = gameUrl(DIRECTED_URL);
  document.querySelector('#algebra-game').href = gameUrl(ALGEBRA_URL);
  loadProfile();
}

function setWorldProgress(id, completed) {
  document.querySelector(`#${id}-progress`).style.width = `${completed / 7 * 100}%`;
  document.querySelector(`#${id}-count`).textContent = `已完成 ${completed}／7`;
}

function renderProfile(profile) {
  document.querySelector('#earned-badges').textContent = `${profile.summary.earnedBadges}／${profile.summary.totalBadges}`;
  document.querySelector('#completed-stages').textContent = `${profile.summary.completedStages}／14`;
  document.querySelector('#first-try-correct').textContent = profile.summary.firstTryCorrect;
  const directed = profile.worldProgress.find(item => item.worldId === 'directed-number');
  const algebra = profile.worldProgress.find(item => item.worldId === 'algebra');
  setWorldProgress('directed', directed?.completed || 0);
  setWorldProgress('algebra', algebra?.completed || 0);
  badges = profile.badges || [];
  renderBadges();
}

function renderBadges() {
  const grid = document.querySelector('#badge-grid');
  grid.replaceChildren();
  badges.filter(badge => currentFilter === 'all' || badge.category === currentFilter).forEach(badge => {
    const hidden = badge.hidden && !badge.earned;
    const card = document.createElement('article');
    card.className = `badge-card ${badge.earned ? 'earned' : 'locked'} ${hidden ? 'secret' : ''}`;
    const image = document.createElement('div');
    image.className = 'badge-image';
    if (hidden) {
      image.textContent = '◆';
      image.setAttribute('aria-label', '隱藏襟章');
    } else {
      const img = document.createElement('img');
      img.src = `${BADGE_ASSET_ROOT}${badge.asset}-128.png`;
      img.alt = '';
      image.appendChild(img);
    }
    const details = document.createElement('div');
    const state = document.createElement('span');
    state.textContent = badge.earned && badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString('zh-HK') : '尚未取得';
    const heading = document.createElement('h3');
    heading.textContent = hidden ? '？？？' : badge.name;
    const description = document.createElement('p');
    description.textContent = hidden ? '隱藏襟章' : badge.description;
    details.append(state, heading, description);
    if (!badge.earned && badge.progress !== null && badge.target !== null && !hidden) {
      const progress = document.createElement('div');
      progress.className = 'badge-progress';
      const bar = document.createElement('i');
      bar.style.width = `${badge.progress / badge.target * 100}%`;
      const label = document.createElement('small');
      label.textContent = `${badge.progress}／${badge.target}`;
      progress.append(bar, label);
      details.appendChild(progress);
    }
    card.append(image, details);
    grid.appendChild(card);
  });
}

async function loadProfile() {
  dashboardMessage.textContent = '正在更新收藏……';
  try {
    const profile = await jsonp({ action: 'profile', schoolYear: identity.schoolYear, className: identity.className, studentNo: String(identity.studentNo) }, '__mathsProfile');
    if (!profile.ok) throw new Error(profile.message || '未能讀取收藏。');
    renderProfile(profile);
    dashboardMessage.textContent = '';
  } catch (error) {
    dashboardMessage.textContent = error.message || '未能讀取收藏。';
  }
}

chooseStudent.addEventListener('click', () => {
  if (!validIdentity()) return;
  identity = { schoolYear: config.schoolYear, className: className.value, studentNo: Number(studentNo.value) };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  showDashboard();
});
[className, studentNo].forEach(field => field.addEventListener('input', () => {
  if (field === studentNo) studentNo.value = studentNo.value.replace(/\D/g, '').slice(0, 2);
  chooseStudent.disabled = !validIdentity();
}));
document.querySelector('#switch-student').addEventListener('click', () => {
  sessionStorage.removeItem(STORAGE_KEY);
  location.reload();
});
document.querySelector('#refresh-profile').addEventListener('click', loadProfile);
document.querySelector('#badge-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  currentFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
  renderBadges();
});

Promise.all([jsonp({ action: 'config' }, '__mathsConfig'), jsonp({ action: 'catalog' }, '__mathsCatalog')])
  .then(([nextConfig]) => {
    if (!nextConfig.ok) throw new Error(nextConfig.message || '未能讀取平台設定。');
    populateConfig(nextConfig);
    identityMessage.textContent = '';
    if (identity) showDashboard();
  })
  .catch(error => {
    identityMessage.textContent = error.message || '暫時未能連接收藏系統，請稍後重新整理。';
  });
