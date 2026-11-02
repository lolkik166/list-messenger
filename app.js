const CONFIG = window.APP_CONFIG || {};
const DEMO_KEY = 'list-messenger-demo-v1';
const DEMO_OTP = '123456';
const ROOMS = [
  { id: 'general', title: 'Общий чат', subtitle: 'Открытая комната для участников', preview: 'Начните разговор ✨', initials: 'О', color: 'avatar-lilac', pinned: 'Здесь можно начать разговор ✨' },
  { id: 'ideas', title: 'Идеи и вдохновение', subtitle: 'Делимся тем, что нас зажигает', preview: 'Какая классная идея!', initials: 'И', color: 'avatar-mint', pinned: 'Хорошие идеи любят компанию 🌱' },
  { id: 'music', title: 'Музыка', subtitle: 'Треки, которые хочется сохранить', preview: 'Послушайте этот альбом 🎧', initials: 'М', color: 'avatar-peach', pinned: 'Можно делиться любимыми находками 🎶' },
  { id: 'plans', title: 'Планы на вечер', subtitle: 'Встречи и маленькие приключения', preview: 'Встретимся после шести?', initials: 'П', color: 'avatar-yellow', pinned: 'Собирайте планы вместе ☀️' },
];

const SEED_MESSAGES = {
  general: [
    { id: 'g1', user_id: 'demo-masha', author: 'Маша', body: 'Доброе утро! Как настроение у всех? ☀️', created_at: minutesAgo(38) },
    { id: 'g2', user_id: 'demo-ilya', author: 'Илья', body: 'Отличное. Кажется, сегодня идеальный день для прогулки.', created_at: minutesAgo(32) },
    { id: 'g3', user_id: 'demo-masha', author: 'Маша', body: 'Давайте после обеда в парк? Возьму кофе и что-нибудь вкусное 🍪', created_at: minutesAgo(26) },
  ],
  ideas: [
    { id: 'i1', user_id: 'demo-katya', author: 'Катя', body: 'А что если устроить маленький книжный обмен? Каждый принесёт одну книгу, которую любит.', created_at: minutesAgo(57) },
    { id: 'i2', user_id: 'demo-misha', author: 'Миша', body: 'Какая классная идея! Можно ещё записки с рекомендациями вложить 🌱', created_at: minutesAgo(46) },
  ],
  music: [
    { id: 'm1', user_id: 'demo-varya', author: 'Варя', body: 'Утром нашла альбом, под который очень хорошо готовить завтрак. Отправлю ссылку чуть позже 🎧', created_at: minutesAgo(82) },
    { id: 'm2', user_id: 'demo-misha', author: 'Миша', body: 'Уже заинтригован!', created_at: minutesAgo(76) },
  ],
  plans: [
    { id: 'p1', user_id: 'demo-lera', author: 'Лёша', body: 'Кто-нибудь свободен вечером в пятницу?', created_at: minutesAgo(128) },
    { id: 'p2', user_id: 'demo-ira', author: 'Ира', body: 'Я свободна! Давно хотела попробовать новую пекарню на углу 🥐', created_at: minutesAgo(114) },
  ],
};

function minutesAgo(minutes) { return new Date(Date.now() - minutes * 60_000).toISOString(); }

const $ = (selector) => document.querySelector(selector);
const els = {
  authScreen: $('#authScreen'), appShell: $('#appShell'), phoneForm: $('#phoneForm'), codeForm: $('#codeForm'),
  phone: $('#phoneNumber'), displayName: $('#displayName'), code: $('#otpCode'), authNotice: $('#authNotice'),
  authTitle: $('#authTitle'), authLead: $('#authLead'), codeHint: $('#codeHint'), modeLabel: $('#modeLabel'),
  privacyCopy: $('#privacyCopy'), sendCode: $('#sendCodeButton'), verifyCode: $('#verifyCodeButton'),
  changePhone: $('#changePhoneButton'), roomList: $('#roomList'), roomSearch: $('#roomSearch'),
  messagesList: $('#messagesList'), messagesArea: $('#messagesArea'), messageInput: $('#messageInput'),
  messageForm: $('#messageForm'), sendMessage: $('#sendMessageButton'), roomTitle: $('#activeRoomTitle'),
  roomSubtitle: $('#activeRoomSubtitle'), roomAvatar: $('#activeRoomAvatar'), pinnedText: $('#pinnedText'),
  pinnedNote: $('#pinnedNote'), chatFootnote: $('#chatFootnote'), connectionDot: $('#connectionDot'),
  connectionLabel: $('#connectionLabel'), userName: $('#userName'), userPhone: $('#userPhone'), userAvatar: $('#userAvatar'),
  unreadCount: $('#unreadCount'), toast: $('#toast'), modalBackdrop: $('#modalBackdrop'), modalTitle: $('#modalTitle'),
  modalCopy: $('#modalCopy'), signOut: $('#signOutButton'), messageSearch: $('#messageSearch'),
  messageSearchInput: $('#messageSearchInput'), sidebar: $('#sidebar'),
};

const state = {
  backend: null,
  mode: 'demo',
  pendingPhone: '',
  pendingName: '',
  user: null,
  activeRoom: 'general',
  messages: [],
  authors: new Map(),
  channel: null,
  toastTimer: null,
  unread: new Set(['ideas', 'plans']),
  searchOpen: false,
};

function readDemoData() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}

function saveDemoData(data) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(data)); } catch { showToast('Не удалось сохранить данные в браузере.'); }
}

function normalizePhone(value) {
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('8') && digits.length === 11) digits = `+7${digits.slice(1)}`;
  else if (!digits.startsWith('+')) digits = `+${digits}`;
  return digits;
}

function validPhone(phone) { return /^\+[1-9]\d{7,14}$/.test(phone); }
function displayInitial(name) { return (name || 'Л').trim().charAt(0).toLocaleUpperCase('ru-RU') || 'Л'; }
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function getDemoMessages(roomId) {
  const data = readDemoData();
  const saved = data.messages?.[roomId];
  return Array.isArray(saved) ? saved : (SEED_MESSAGES[roomId] || []);
}

function getRoom(roomId = state.activeRoom) { return ROOMS.find((room) => room.id === roomId) || ROOMS[0]; }
function formatTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function showNotice(message, success = false) {
  els.authNotice.textContent = message || '';
  els.authNotice.classList.toggle('success', Boolean(success));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 2600);
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.querySelector('span').textContent = busy ? 'Подождите…' : label;
}

async function initBackend() {
  const url = String(CONFIG.supabaseUrl || '').trim();
  const key = String(CONFIG.supabaseAnonKey || '').trim();
  if (!url || !key) return;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    state.backend = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    state.mode = 'live';
  } catch (error) {
    console.error('Не удалось подключить Supabase:', error);
    showNotice('Не удалось подключить сервер. Проверьте настройки Supabase в config.js.');
  }
}

async function start() {
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    els.modeLabel.textContent = 'Вход по SMS';
    els.privacyCopy.textContent = 'Номер используется сервисом авторизации для отправки кода.';
    els.codeHint.textContent = 'Введите шестизначный код, который пришёл на ваш телефон.';
    els.chatFootnote.textContent = 'Сообщения доступны вошедшим участникам и обновляются в реальном времени.';
    els.connectionLabel.textContent = 'Подключение к серверу';
    els.connectionDot.classList.add('online');
  } else {
    els.modeLabel.textContent = 'Быстрый просмотр';
    els.privacyCopy.textContent = 'В демо-режиме сообщения сохраняются только в этом браузере.';
  }
  await initBackend();
  if (!state.backend && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    els.modeLabel.textContent = 'Демо-режим';
    els.privacyCopy.textContent = 'Сервер недоступен: код не отправляется. Демо-переписка хранится только в браузере.';
    els.connectionLabel.textContent = 'Демо на этом устройстве';
    els.connectionDot.classList.remove('online');
  }
  if (state.backend) {
    const { data } = await state.backend.auth.getSession();
    if (data.session?.user) {
      await enterApp(data.session.user, true);
      return;
    }
    els.connectionLabel.textContent = 'SMS и сообщения онлайн';
  }
}

async function requestCode(event) {
  event.preventDefault();
  showNotice('');
  const phone = normalizePhone(els.phone.value.trim());
  const name = els.displayName.value.trim().slice(0, 32);
  if (!validPhone(phone)) {
    showNotice('Проверьте номер: добавьте код страны, например +7 900 123‑45‑67.');
    els.phone.focus();
    return;
  }
  state.pendingPhone = phone;
  state.pendingName = name || `Участник ${phone.slice(-4)}`;
  setBusy(els.sendCode, true, 'Получить код');
  try {
    if (state.backend) {
      const { error } = await state.backend.auth.signInWithOtp({ phone, options: { data: { display_name: state.pendingName } } });
      if (error) throw error;
      showNotice('Код отправлен. Проверьте SMS на телефоне.', true);
    } else {
      showNotice(`Демо-код: ${DEMO_OTP}. Настоящее SMS не отправляется.`, true);
      els.codeHint.textContent = `Для демо введите ${DEMO_OTP}. Сообщения останутся в этом браузере.`;
    }
    els.phoneForm.hidden = true;
    els.codeForm.hidden = false;
    els.authTitle.textContent = 'Проверьте телефон';
    els.authLead.textContent = `Мы отправили код на ${phone}.`;
    els.modeLabel.textContent = state.backend ? 'Одноразовый код' : 'Демо-код';
    els.code.value = '';
    els.code.focus();
  } catch (error) {
    showNotice(error.message || 'Не получилось отправить код. Проверьте номер и настройки SMS.');
  } finally {
    setBusy(els.sendCode, false, 'Получить код');
  }
}

async function verifyCode(event) {
  event.preventDefault();
  showNotice('');
  const code = els.code.value.replace(/\D/g, '');
  if (code.length !== 6) {
    showNotice('Введите шестизначный код.');
    els.code.focus();
    return;
  }
  setBusy(els.verifyCode, true, 'Войти в Лист');
  try {
    if (state.backend) {
      const { data, error } = await state.backend.auth.verifyOtp({ phone: state.pendingPhone, token: code, type: 'sms' });
      if (error) throw error;
      if (!data.user) throw new Error('Не удалось подтвердить номер. Попробуйте ещё раз.');
      const { error: profileError } = await state.backend.from('profiles').upsert({ id: data.user.id, display_name: state.pendingName }, { onConflict: 'id' });
      if (profileError) throw profileError;
      await enterApp(data.user, false);
    } else {
      if (code !== DEMO_OTP) throw new Error(`Неверный код. Для демо используйте ${DEMO_OTP}.`);
      const data = readDemoData();
      data.profile = { displayName: state.pendingName, phoneSuffix: state.pendingPhone.slice(-4) };
      saveDemoData(data);
      await enterApp({ id: 'local-demo-user', user_metadata: { display_name: state.pendingName } }, false);
    }
  } catch (error) {
    showNotice(error.message || 'Код не подошёл. Попробуйте ещё раз.');
  } finally {
    setBusy(els.verifyCode, false, 'Войти в Лист');
  }
}

function showPhoneStep() {
  els.codeForm.hidden = true;
  els.phoneForm.hidden = false;
  els.authTitle.textContent = 'Рады видеть';
  els.authLead.textContent = 'Введите номер телефона — пришлём код для входа или регистрации.';
  els.modeLabel.textContent = state.backend ? 'Вход по SMS' : 'Быстрый просмотр';
  showNotice('');
  els.phone.focus();
}

async function enterApp(user, existingSession) {
  state.user = user;
  if (state.backend) {
    let displayName = user.user_metadata?.display_name || `Участник ${String(user.phone || '').slice(-4)}`;
    const { data } = await state.backend.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    if (data?.display_name) displayName = data.display_name;
    else await state.backend.from('profiles').upsert({ id: user.id, display_name: displayName }, { onConflict: 'id' });
    state.user = { id: user.id, displayName, phoneSuffix: String(user.phone || '').slice(-4) };
    els.connectionLabel.textContent = 'Сообщения онлайн';
    els.connectionDot.classList.add('online');
    els.chatFootnote.textContent = 'Номер телефона не показывается другим участникам.';
  } else {
    const profile = readDemoData().profile || { displayName: user.user_metadata?.display_name || 'Гость', phoneSuffix: '' };
    state.user = { ...profile, id: user.id };
    els.connectionLabel.textContent = 'Демо на этом устройстве';
    els.connectionDot.classList.remove('online');
    els.chatFootnote.textContent = 'Демо-пространство — сообщения останутся в этом браузере.';
  }
  els.userName.textContent = state.user.displayName;
  els.userPhone.textContent = state.user.phoneSuffix ? `•••• ${state.user.phoneSuffix}` : 'мой профиль';
  els.userAvatar.textContent = displayInitial(state.user.displayName);
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
  await selectRoom(state.activeRoom, false);
}

async function signOut() {
  closeModal();
  if (state.backend) await state.backend.auth.signOut();
  state.user = null;
  state.messages = [];
  if (state.channel) {
    await state.backend?.removeChannel(state.channel);
    state.channel = null;
  }
  els.appShell.hidden = true;
  els.authScreen.hidden = false;
  showPhoneStep();
  showToast('Вы вышли из аккаунта.');
}

function updateRoomList() {
  const query = els.roomSearch.value.trim().toLocaleLowerCase('ru-RU');
  const data = readDemoData();
  const html = ROOMS.filter((room) => room.title.toLocaleLowerCase('ru-RU').includes(query)).map((room) => {
    const messages = state.mode === 'demo' ? getDemoMessages(room.id) : (data.messages?.[room.id] || []);
    const last = messages[messages.length - 1];
    const preview = last?.body || room.preview;
    const unread = state.unread.has(room.id) && room.id !== state.activeRoom;
    return `<button class="room-item ${room.id === state.activeRoom ? 'active' : ''}" data-room-id="${room.id}" type="button">
      <span class="room-avatar ${room.color}">${esc(room.initials)}</span>
      <span class="room-copy"><span class="room-copy-top"><strong>${esc(room.title)}</strong><time>${last ? formatTime(last.created_at) : ''}</time></span>
      <span class="room-preview"><span>${esc(preview)}</span>${unread ? '<b class="room-unread">1</b>' : ''}</span></span>
    </button>`;
  }).join('');
  els.roomList.innerHTML = html || '<p class="empty-chat">Комнаты не найдены.</p>';
  els.roomList.querySelectorAll('[data-room-id]').forEach((button) => button.addEventListener('click', () => selectRoom(button.dataset.roomId)));
  const unreadCount = ROOMS.filter((room) => state.unread.has(room.id) && room.id !== state.activeRoom).length;
  els.unreadCount.textContent = unreadCount ? String(unreadCount) : '0';
}

async function selectRoom(roomId, scroll = true) {
  const room = getRoom(roomId);
  state.activeRoom = room.id;
  state.unread.delete(room.id);
  els.roomTitle.textContent = room.title;
  els.roomSubtitle.textContent = state.mode === 'live' ? room.subtitle : 'Пример переписки · демо';
  els.roomAvatar.textContent = room.initials;
  els.roomAvatar.className = `room-avatar room-avatar-large ${room.color}`;
  els.pinnedText.textContent = room.pinned;
  els.pinnedNote.hidden = false;
  els.messageSearchInput.value = '';
  updateRoomList();
  if (state.backend && state.mode === 'live') await loadLiveMessages();
  else {
    state.messages = getDemoMessages(room.id);
    state.authors.clear();
    renderMessages();
  }
  if (scroll) els.sidebar.classList.remove('open');
}

async function loadLiveMessages() {
  if (!state.backend || !state.user) return;
  if (state.channel) await state.backend.removeChannel(state.channel);
  const roomId = state.activeRoom;
  const { data, error } = await state.backend.from('messages').select('id,room_id,user_id,body,created_at').eq('room_id', roomId).order('created_at', { ascending: true }).limit(100);
  if (error) {
    showToast('Не удалось загрузить сообщения. Проверьте схему и правила Supabase.');
    console.error(error);
    state.messages = [];
    renderMessages();
    return;
  }
  state.messages = data || [];
  const ids = [...new Set(state.messages.map((message) => message.user_id))];
  if (ids.length) {
    const { data: profiles, error: profileError } = await state.backend.from('profiles').select('id,display_name').in('id', ids);
    if (!profileError) state.authors = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));
  } else state.authors.clear();
  renderMessages();
  state.channel = state.backend.channel(`messages-${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, () => loadLiveMessages())
    .subscribe();
}

function renderMessages() {
  const query = state.searchOpen ? els.messageSearchInput.value.trim().toLocaleLowerCase('ru-RU') : '';
  const shownMessages = state.messages.filter((message) => !query || String(message.body).toLocaleLowerCase('ru-RU').includes(query));
  if (!shownMessages.length) {
    els.messagesList.innerHTML = `<div class="empty-chat"><strong>${query ? 'Ничего не найдено' : 'Пока тихо'}</strong>${query ? 'Попробуйте изменить запрос.' : 'Отправьте первое сообщение — разговор начнётся с вас ✨'}</div>`;
  } else {
    els.messagesList.innerHTML = shownMessages.map((message) => {
      const mine = message.user_id === state.user?.id;
      const author = mine ? state.user?.displayName : (message.author || state.authors.get(message.user_id) || 'Участник');
      const initials = displayInitial(author);
      const color = mine ? 'avatar-violet' : avatarColor(message.user_id);
      return `<article class="message-row ${mine ? 'mine' : ''}">
        <span class="message-avatar ${color}">${esc(initials)}</span>
        <div class="message-content"><div class="message-meta"><strong>${esc(author)}</strong><time>${formatTime(message.created_at)}</time></div>
        <div class="message-bubble">${esc(message.body)}</div></div>
      </article>`;
    }).join('');
  }
  updateRoomList();
  requestAnimationFrame(() => { els.messagesArea.scrollTop = els.messagesArea.scrollHeight; });
}

function avatarColor(seed = '') {
  const colors = ['avatar-lilac', 'avatar-mint', 'avatar-peach', 'avatar-yellow'];
  const score = Array.from(String(seed)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[score % colors.length];
}

async function sendMessage(event) {
  event.preventDefault();
  const body = els.messageInput.value.trim();
  if (!body || body.length > 2000) return;
  els.sendMessage.disabled = true;
  if (state.backend && state.mode === 'live') {
    const { error } = await state.backend.from('messages').insert({ room_id: state.activeRoom, user_id: state.user.id, body });
    if (error) {
      showToast('Не получилось отправить сообщение. Проверьте правила Supabase.');
      console.error(error);
      els.sendMessage.disabled = false;
      return;
    }
  } else {
    const data = readDemoData();
    data.messages ||= {};
    data.messages[state.activeRoom] ||= getDemoMessages(state.activeRoom).slice();
    data.messages[state.activeRoom].push({ id: `local-${Date.now()}`, user_id: state.user.id, author: state.user.displayName, body, created_at: new Date().toISOString() });
    saveDemoData(data);
    state.messages = data.messages[state.activeRoom];
    renderMessages();
  }
  els.messageInput.value = '';
  resizeComposer();
  els.messageInput.focus();
}

function resizeComposer() {
  els.messageInput.style.height = 'auto';
  els.messageInput.style.height = `${Math.min(120, Math.max(39, els.messageInput.scrollHeight))}px`;
  els.sendMessage.disabled = !els.messageInput.value.trim();
}

function openModal(title, copy, profile = false) {
  els.modalTitle.textContent = title;
  els.modalCopy.textContent = copy;
  els.signOut.hidden = !profile;
  els.modalBackdrop.hidden = false;
  $('#modalConfirm').focus();
}
function closeModal() { els.modalBackdrop.hidden = true; }

function bindEvents() {
  els.phoneForm.addEventListener('submit', requestCode);
  els.codeForm.addEventListener('submit', verifyCode);
  els.changePhone.addEventListener('click', showPhoneStep);
  els.messageForm.addEventListener('submit', sendMessage);
  els.messageInput.addEventListener('input', resizeComposer);
  els.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); els.messageForm.requestSubmit(); }
  });
  els.roomSearch.addEventListener('input', updateRoomList);
  $('#focusSearchButton').addEventListener('click', () => els.roomSearch.focus());
  $('#createRoomButton').addEventListener('click', () => openModal('Комнаты Листа', 'Здесь доступны четыре открытые комнаты: общий чат, идеи, музыка и планы на вечер. В подключённой версии сообщения видны всем участникам.'));
  $('#roomInfoButton').addEventListener('click', () => {
    const room = getRoom();
    openModal(room.title, `${room.subtitle}. ${state.mode === 'live' ? 'Сообщения доступны вошедшим участникам.' : 'Сейчас это демонстрационная переписка, сохранённая только в вашем браузере.'}`);
  });
  $('#profileButton').addEventListener('click', () => openModal('Ваш профиль', `${state.user?.displayName || ''}${state.user?.phoneSuffix ? ` · номер оканчивается на ${state.user.phoneSuffix}` : ''}. ${state.mode === 'live' ? 'Ваш полный номер не отображается другим участникам.' : 'Это локальный демо-профиль на данном устройстве.'}`, true));
  $('#signOutButton').addEventListener('click', signOut);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalConfirm').addEventListener('click', closeModal);
  els.modalBackdrop.addEventListener('click', (event) => { if (event.target === els.modalBackdrop) closeModal(); });
  $('#dismissPinButton').addEventListener('click', () => { els.pinnedNote.hidden = true; });
  $('#mobileMenu').addEventListener('click', () => els.sidebar.classList.add('open'));
  $('#mobileClose').addEventListener('click', () => els.sidebar.classList.remove('open'));
  $('#emojiButton').addEventListener('click', () => { els.messageInput.value += ' ✨'; resizeComposer(); els.messageInput.focus(); });
  $('#chatSearchButton').addEventListener('click', () => {
    state.searchOpen = !state.searchOpen;
    els.messageSearch.hidden = !state.searchOpen;
    if (state.searchOpen) els.messageSearchInput.focus();
    else els.messageSearchInput.value = '';
    renderMessages();
  });
  $('#closeMessageSearch').addEventListener('click', () => {
    state.searchOpen = false;
    els.messageSearch.hidden = true;
    els.messageSearchInput.value = '';
    renderMessages();
  });
  els.messageSearchInput.addEventListener('input', renderMessages);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeModal(); els.sidebar.classList.remove('open'); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.roomSearch.focus(); }
  });
}

bindEvents();
start();
