const CONFIG = window.APP_CONFIG || {};
const DEMO_KEY = 'list-messenger-demo-v1';
const DEMO_OTP = '123456';
const ROOMS = [
  { id: 'general', title: 'Общий чат', subtitle: 'Открытая комната для участников', preview: 'Начните разговор ✨', initials: 'О', color: 'avatar-lilac', pinned: 'Здесь можно начать разговор ✨', kind: 'group' },
  { id: 'ideas', title: 'Идеи и вдохновение', subtitle: 'Делимся тем, что нас зажигает', preview: 'Какая классная идея!', initials: 'И', color: 'avatar-mint', pinned: 'Хорошие идеи любят компанию 🌱', kind: 'group' },
  { id: 'music', title: 'Музыка', subtitle: 'Треки, которые хочется сохранить', preview: 'Послушайте этот альбом 🎧', initials: 'М', color: 'avatar-peach', pinned: 'Можно делиться любимыми находками 🎶', kind: 'group' },
  { id: 'plans', title: 'Планы на вечер', subtitle: 'Встречи и маленькие приключения', preview: 'Встретимся после шести?', initials: 'П', color: 'avatar-yellow', pinned: 'Собирайте планы вместе ☀️', kind: 'group' },
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
  createRoomBackdrop: $('#createRoomBackdrop'), createRoomForm: $('#createRoomForm'),
  createRoomName: $('#newRoomName'), createRoomDescription: $('#newRoomDescription'),
  voicePreview: $('#voicePreview'), voicePreviewAudio: $('#voicePreviewAudio'),
  recordButton: $('#recordButton'), sendVoiceButton: $('#sendVoiceButton'),
  callScreen: $('#callScreen'), callTitle: $('#callTitle'), callStatus: $('#callStatus'),
  callAvatar: $('#callAvatar'), callVideoStage: $('#callVideoStage'), remoteVideo: $('#remoteVideo'),
  localVideo: $('#localVideo'), remoteAudio: $('#remoteAudio'), incomingActions: $('#incomingActions'),
  callControls: $('#callControls'),
};

const state = {
  backend: null,
  mode: 'demo',
  pendingPhone: '',
  pendingName: '',
  user: null,
  activeRoom: 'general',
  messages: [],
  rooms: ROOMS.slice(),
  roomFilter: 'all',
  createType: 'group',
  authors: new Map(),
  channel: null,
  roomsChannel: null,
  callChannel: null,
  callChannelReady: null,
  callRoomId: null,
  call: null,
  peerConnection: null,
  localStream: null,
  remoteStream: null,
  queuedCandidates: [],
  callTimer: null,
  callStartedAt: null,
  recorder: null,
  recordingStream: null,
  recordingTimer: null,
  pendingVoice: null,
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

function getRooms() { return state.rooms || ROOMS; }
function getRoom(roomId = state.activeRoom) { return getRooms().find((room) => room.id === roomId) || ROOMS[0]; }
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
  await loadRooms();
  await selectRoom(state.activeRoom, false);
}

async function loadRooms() {
  let customRooms = [];
  if (state.backend && state.mode === 'live') {
    const { data, error } = await state.backend.from('rooms').select('id,title,subtitle,kind,created_by').order('created_at', { ascending: true });
    if (error) {
      showToast('Не удалось загрузить список чатов. Проверьте обновлённую схему Supabase.');
      console.error(error);
    } else {
      customRooms = (data || []).filter((room) => !ROOMS.some((fixed) => fixed.id === room.id)).map((room) => roomFromRecord(room));
    }
  } else {
    const saved = readDemoData().rooms;
    customRooms = Array.isArray(saved) ? saved.map((room) => roomFromRecord(room)) : [];
  }
  state.rooms = [...ROOMS, ...customRooms];
  if (state.backend && state.mode === 'live' && !state.roomsChannel) {
    state.roomsChannel = state.backend.channel('rooms:index', { config: { private: true } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, async () => {
        await loadRooms();
        updateRoomList();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('Не удалось подписаться на новые чаты.');
      });
  }
}

function roomFromRecord(room) {
  const isChannel = room.kind === 'channel';
  const initials = displayInitial(room.title);
  const color = isChannel ? 'avatar-yellow' : avatarColor(room.id);
  return {
    id: String(room.id), title: String(room.title || 'Новый чат'),
    subtitle: String(room.subtitle || (isChannel ? 'Канал' : 'Групповой чат')),
    preview: isChannel ? 'Публикации канала' : 'Начните разговор', initials, color,
    pinned: String(room.subtitle || (isChannel ? 'Новости и публикации канала' : 'Групповой чат Листа')),
    kind: isChannel ? 'channel' : 'group', created_by: room.created_by || room.createdBy || null,
  };
}

async function signOut() {
  closeModal();
  if (state.call) await finishCall(false);
  if (state.backend) await state.backend.auth.signOut();
  state.user = null;
  state.messages = [];
  if (state.channel) {
    await state.backend?.removeChannel(state.channel);
    state.channel = null;
  }
  if (state.callChannel) {
    await state.backend?.removeChannel(state.callChannel);
    state.callChannel = null;
    state.callRoomId = null;
    state.callChannelReady = null;
  }
  if (state.roomsChannel) {
    await state.backend?.removeChannel(state.roomsChannel);
    state.roomsChannel = null;
  }
  cancelVoicePreview();
  els.appShell.hidden = true;
  els.authScreen.hidden = false;
  showPhoneStep();
  showToast('Вы вышли из аккаунта.');
}

function updateRoomList() {
  const query = els.roomSearch.value.trim().toLocaleLowerCase('ru-RU');
  const data = readDemoData();
  const visibleRooms = getRooms().filter((room) => {
    const matchesFilter = state.roomFilter === 'all' || room.kind === state.roomFilter;
    return matchesFilter && room.title.toLocaleLowerCase('ru-RU').includes(query);
  });
  const html = visibleRooms.map((room) => {
    const messages = state.mode === 'demo' ? getDemoMessages(room.id) : (data.messages?.[room.id] || []);
    const last = messages[messages.length - 1];
    const preview = last?.kind === 'voice' ? '🎙 Голосовое сообщение' : (last?.body || room.preview);
    const unread = state.unread.has(room.id) && room.id !== state.activeRoom;
    return `<button class="room-item ${room.id === state.activeRoom ? 'active' : ''}" data-room-id="${esc(room.id)}" type="button" aria-current="${room.id === state.activeRoom ? 'page' : 'false'}">
      <span class="room-avatar ${room.color}">${esc(room.initials)}</span>
      <span class="room-copy"><span class="room-copy-top"><strong>${esc(room.title)}</strong><span class="room-kind">${room.kind === 'channel' ? 'канал' : 'группа'}</span><time>${last ? formatTime(last.created_at) : ''}</time></span>
      <span class="room-preview"><span>${esc(preview)}</span>${unread ? '<b class="room-unread">1</b>' : ''}</span></span>
    </button>`;
  }).join('');
  els.roomList.innerHTML = html || '<p class="empty-chat">Чаты не найдены.</p>';
  els.roomList.querySelectorAll('[data-room-id]').forEach((button) => button.addEventListener('click', () => selectRoom(button.dataset.roomId)));
  const unreadCount = getRooms().filter((room) => state.unread.has(room.id) && room.id !== state.activeRoom).length;
  els.unreadCount.textContent = unreadCount ? String(unreadCount) : '0';
}

async function selectRoom(roomId, scroll = true) {
  const room = getRoom(roomId);
  if (!room) return;
  state.activeRoom = room.id;
  state.unread.delete(room.id);
  els.roomTitle.textContent = room.title;
  els.roomSubtitle.textContent = `${room.kind === 'channel' ? 'Канал' : 'Группа'} · ${room.subtitle}`;
  els.roomAvatar.textContent = room.initials;
  els.roomAvatar.className = `room-avatar room-avatar-large ${room.color}`;
  els.pinnedText.textContent = room.pinned;
  els.pinnedNote.hidden = false;
  els.messageSearchInput.value = '';
  const canPost = room.kind !== 'channel' || !room.created_by || room.created_by === state.user?.id;
  els.messageInput.disabled = !canPost;
  els.messageInput.placeholder = canPost ? 'Напишите что-нибудь хорошее…' : 'Публиковать может только автор канала';
  els.recordButton.disabled = !canPost;
  $('#sendMessageButton').disabled = !canPost || !els.messageInput.value.trim();
  if (state.backend && !state.call) await ensureCallChannel(room.id);
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
  const { data, error } = await state.backend.from('messages').select('id,room_id,user_id,body,kind,media_url,created_at').eq('room_id', roomId).order('created_at', { ascending: true }).limit(100);
  if (error) {
    showToast('Не удалось загрузить сообщения. Проверьте схему и правила Supabase.');
    console.error(error);
    state.messages = [];
    renderMessages();
    return;
  }
  state.messages = data || [];
  await Promise.all(state.messages.filter((message) => message.kind === 'voice' && message.media_url).map(async (message) => {
    const { data: signed, error: signedError } = await state.backend.storage.from('voice-messages').createSignedUrl(message.media_url, 3600);
    if (!signedError) message.playback_url = signed.signedUrl;
  }));
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
      const content = message.kind === 'voice'
        ? (message.playback_url || message.media_url
          ? `<div class="message-kind-label">🎙 Голосовое сообщение</div><audio class="message-audio" controls preload="metadata" src="${esc(message.playback_url || message.media_url)}"></audio>`
          : '<div class="message-kind-label">🎙 Голосовое недоступно</div>')
        : `<div class="message-bubble">${esc(message.body)}</div>`;
      return `<article class="message-row ${mine ? 'mine' : ''}">
        <span class="message-avatar ${color}">${esc(initials)}</span>
        <div class="message-content"><div class="message-meta"><strong>${esc(author)}</strong><time>${formatTime(message.created_at)}</time></div>
        ${content}</div>
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
  const room = getRoom();
  if (room.kind === 'channel' && room.created_by && room.created_by !== state.user?.id) {
    showToast('Публиковать в этом канале может только его автор.');
    return;
  }
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
    data.messages[state.activeRoom].push({ id: `local-${Date.now()}`, user_id: state.user.id, author: state.user.displayName, body, kind: 'text', created_at: new Date().toISOString() });
    saveDemoData(data);
    state.messages = data.messages[state.activeRoom];
    renderMessages();
  }
  els.messageInput.value = '';
  resizeComposer();
  els.messageInput.focus();
}

function makeId() {
  return window.crypto?.randomUUID?.() || `room-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function openCreateRoom() {
  state.createType = 'group';
  document.querySelectorAll('[data-create-type]').forEach((button) => {
    const active = button.dataset.createType === state.createType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#createRoomTitle').textContent = 'Создать группу';
  $('#createRoomHint').textContent = state.mode === 'live'
    ? 'Группа появится в общем списке чатов у вошедших участников.'
    : 'В демо-режиме группа сохраняется только в этом браузере.';
  els.createRoomBackdrop.hidden = false;
  els.createRoomName.focus();
}

function closeCreateRoom() { els.createRoomBackdrop.hidden = true; }

async function createRoom(event) {
  event.preventDefault();
  const title = els.createRoomName.value.trim().slice(0, 48);
  const subtitle = els.createRoomDescription.value.trim().slice(0, 120);
  if (!title) return;
  const id = makeId();
  const roomData = { id, title, subtitle: subtitle || (state.createType === 'channel' ? 'Канал Листа' : 'Групповой чат'), kind: state.createType };
  if (state.backend && state.mode === 'live') {
    const { error } = await state.backend.from('rooms').insert({
      id, title, subtitle: roomData.subtitle, kind: state.createType, created_by: state.user.id,
    });
    if (error) {
      console.error(error);
      showToast('Не удалось создать чат. Проверьте обновлённую схему Supabase.');
      return;
    }
  } else {
    const data = readDemoData();
    data.rooms ||= [];
    data.rooms.push({ ...roomData, created_by: state.user.id });
    saveDemoData(data);
  }
  closeCreateRoom();
  els.createRoomForm.reset();
  await loadRooms();
  updateRoomList();
  await selectRoom(id);
  showToast(state.createType === 'channel' ? 'Канал создан.' : 'Группа создана.');
}

function setCreateType(type) {
  state.createType = type === 'channel' ? 'channel' : 'group';
  document.querySelectorAll('[data-create-type]').forEach((button) => {
    const active = button.dataset.createType === state.createType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#createRoomTitle').textContent = state.createType === 'channel' ? 'Создать канал' : 'Создать группу';
  $('#createRoomHint').textContent = state.createType === 'channel'
    ? 'В канале публикует только его автор; остальные участники могут читать и слушать.'
    : (state.mode === 'live' ? 'Группа появится в общем списке чатов у вошедших участников.' : 'В демо-режиме группа сохраняется только в этом браузере.');
}

function setRecordingUI(recording, elapsed = 0) {
  const button = els.recordButton;
  button.classList.toggle('recording', recording);
  button.setAttribute('aria-label', recording ? 'Остановить запись голосового' : 'Записать голосовое сообщение');
  button.title = recording ? `Остановить запись · ${formatDuration(elapsed)}` : 'Записать голосовое';
  button.innerHTML = recording
    ? '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>'
    : '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M9 22h6"/></svg>';
}

async function toggleRecording() {
  if (state.recorder?.state === 'recording') {
    state.recorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showToast('Запись голоса недоступна в этом браузере.');
    return;
  }
  if (state.pendingVoice) {
    showToast('Сначала отправьте или отмените готовое голосовое.');
    return;
  }
  try {
    state.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const types = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
    const mimeType = types.find((type) => MediaRecorder.isTypeSupported?.(type));
    state.recorder = new MediaRecorder(state.recordingStream, mimeType ? { mimeType } : undefined);
    state.recorder.chunks = [];
    state.recorder.ondataavailable = (event) => { if (event.data.size) state.recorder?.chunks.push(event.data); };
    state.recorder.onstop = () => {
      clearInterval(state.recordingTimer);
      state.recordingTimer = null;
      state.recordingStream?.getTracks().forEach((track) => track.stop());
      state.recordingStream = null;
      const blob = new Blob(state.recorder?.chunks || [], { type: state.recorder?.mimeType || 'audio/webm' });
      state.recorder = null;
      setRecordingUI(false);
      if (!blob.size) { showToast('Запись не получилась. Попробуйте ещё раз.'); return; }
      state.pendingVoice = { blob, url: URL.createObjectURL(blob) };
      els.voicePreviewAudio.src = state.pendingVoice.url;
      els.voicePreview.hidden = false;
      els.recordButton.disabled = true;
      $('#voicePreviewLabel').textContent = 'Голосовое готово к отправке';
    };
    state.recorder.start(250);
    const startedAt = Date.now();
    setRecordingUI(true);
    state.recordingTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRecordingUI(true, elapsed);
      $('#voicePreviewLabel').textContent = `Идёт запись · ${formatDuration(elapsed)} · нажмите ■ для завершения`;
      if (elapsed >= 90) state.recorder?.stop();
    }, 500);
  } catch (error) {
    console.error(error);
    state.recordingStream?.getTracks().forEach((track) => track.stop());
    state.recordingStream = null;
    showToast('Разрешите доступ к микрофону, чтобы записать голосовое.');
    setRecordingUI(false);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function cancelVoicePreview() {
  if (state.pendingVoice?.url) URL.revokeObjectURL(state.pendingVoice.url);
  state.pendingVoice = null;
  els.voicePreviewAudio.removeAttribute('src');
  els.voicePreviewAudio.load();
  els.voicePreview.hidden = true;
  els.recordButton.disabled = false;
}

async function sendVoiceMessage() {
  if (!state.pendingVoice || !state.user) return;
  const room = getRoom();
  if (room.kind === 'channel' && room.created_by && room.created_by !== state.user.id) {
    showToast('Публиковать в этом канале может только его автор.');
    return;
  }
  els.sendVoiceButton.disabled = true;
  try {
    let mediaUrl = '';
    let createdAt = new Date().toISOString();
    if (state.backend && state.mode === 'live') {
      const extension = state.pendingVoice.blob.type.includes('ogg') ? 'ogg' : state.pendingVoice.blob.type.includes('mp4') ? 'm4a' : 'webm';
      const path = `${state.user.id}/${makeId()}.${extension}`;
      const { error: uploadError } = await state.backend.storage.from('voice-messages').upload(path, state.pendingVoice.blob, {
        contentType: (state.pendingVoice.blob.type || 'audio/webm').split(';')[0], upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error } = await state.backend.from('messages').insert({
        room_id: state.activeRoom, user_id: state.user.id, body: 'Голосовое сообщение', kind: 'voice', media_url: path,
      });
      if (error) throw error;
      await loadLiveMessages();
    } else {
      mediaUrl = await blobToDataUrl(state.pendingVoice.blob);
      const data = readDemoData();
      data.messages ||= {};
      data.messages[state.activeRoom] ||= getDemoMessages(state.activeRoom).slice();
      data.messages[state.activeRoom].push({
        id: `local-${Date.now()}`, user_id: state.user.id, author: state.user.displayName,
        body: 'Голосовое сообщение', kind: 'voice', media_url: mediaUrl, created_at: createdAt,
      });
      saveDemoData(data);
      state.messages = data.messages[state.activeRoom];
      renderMessages();
    }
    cancelVoicePreview();
    showToast('Голосовое отправлено.');
  } catch (error) {
    console.error(error);
    showToast(state.mode === 'live' ? 'Не удалось загрузить голосовое. Проверьте Storage и права Supabase.' : 'Не удалось сохранить запись в этом браузере.');
  } finally {
    els.sendVoiceButton.disabled = false;
  }
}

function formatDuration(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

async function ensureCallChannel(roomId) {
  if (!state.backend || state.call) return false;
  if (state.callChannel && state.callRoomId === roomId) return state.callChannelReady;
  if (state.callChannel) await state.backend.removeChannel(state.callChannel);
  state.callRoomId = roomId;
  state.callChannel = state.backend.channel(`calls:${roomId}`, { config: { private: true, broadcast: { ack: true, self: false } } })
    .on('broadcast', { event: 'signal' }, ({ payload }) => handleCallSignal(payload));
  state.callChannelReady = new Promise((resolve) => {
    let done = false;
    state.callChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && !done) { done = true; resolve(true); }
      if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !done) {
        done = true;
        resolve(false);
        showToast('Не удалось подключить звонки. Проверьте Realtime в Supabase.');
      }
    });
  });
  const ready = await state.callChannelReady;
  if (!ready) {
    await state.backend.removeChannel(state.callChannel);
    state.callChannel = null;
    state.callRoomId = null;
    state.callChannelReady = null;
  }
  return ready;
}

async function sendCallSignal(type, extra = {}, to = null) {
  if (!state.call || !state.callChannel) return;
  const payload = { type, callId: state.call.id, from: state.user.id, to, ...extra };
  const { error } = await state.callChannel.send({ type: 'broadcast', event: 'signal', payload });
  if (error) console.error('Не удалось отправить сигнал звонка:', error);
}

function showCallScreen({ incoming = false } = {}) {
  const call = state.call;
  if (!call) return;
  els.callScreen.hidden = false;
  els.callTitle.textContent = call.remoteName || (incoming ? 'Входящий звонок' : getRoom(call.roomId).title);
  els.callAvatar.textContent = displayInitial(call.remoteName || getRoom(call.roomId).title);
  els.callVideoStage.hidden = call.mode !== 'video';
  els.incomingActions.hidden = !incoming;
  els.callControls.hidden = incoming;
  $('#toggleCameraButton').hidden = call.mode !== 'video';
  els.callStatus.textContent = incoming
    ? `${call.mode === 'video' ? 'Видеозвонок' : 'Голосовой звонок'} · входящий`
    : `Вызов участникам чата «${getRoom(call.roomId).title}»…`;
}

async function startCall(mode) {
  if (!state.backend || state.mode !== 'live') {
    showToast('Звонки доступны после настройки Supabase Realtime. Голосовые можно записывать и в демо.');
    return;
  }
  if (state.call) { showToast('Сначала завершите текущий звонок.'); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    showToast('Для звонков откройте сайт по HTTPS в браузере с поддержкой WebRTC.');
    return;
  }
  if (!await ensureCallChannel(state.activeRoom)) return;
  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
    state.call = { id: makeId(), mode, role: 'caller', phase: 'ringing', roomId: state.activeRoom, peerId: null, remoteName: '' };
    state.queuedCandidates = [];
    showCallScreen();
    if (mode === 'video') els.localVideo.srcObject = state.localStream;
    else els.remoteAudio.srcObject = null;
    await sendCallSignal('invite', { displayName: state.user.displayName, mode, roomId: state.activeRoom });
  } catch (error) {
    console.error(error);
    state.localStream?.getTracks().forEach((track) => track.stop());
    state.localStream = null;
    showToast('Не удалось получить доступ к микрофону или камере.');
    if (state.call) await finishCall(false);
  }
}

async function handleCallSignal(payload) {
  if (!payload || payload.from === state.user?.id || (payload.to && payload.to !== state.user?.id)) return;
  if (payload.type === 'invite') {
    if (state.call || payload.roomId !== state.activeRoom) return;
    state.call = { id: payload.callId, mode: payload.mode === 'video' ? 'video' : 'audio', role: 'callee', phase: 'ringing', roomId: payload.roomId, peerId: payload.from, remoteName: payload.displayName || 'Участник' };
    state.queuedCandidates = [];
    showCallScreen({ incoming: true });
    return;
  }
  if (!state.call || payload.callId !== state.call.id) return;
  if (payload.type === 'accept' && state.call.role === 'caller') {
    if (state.call.peerId && state.call.peerId !== payload.from) {
      await sendCallSignal('busy', {}, payload.from);
      return;
    }
    state.call.peerId = payload.from;
    state.call.remoteName = payload.displayName || 'Участник';
    els.callTitle.textContent = state.call.remoteName;
    await sendCallSignal('accepted', {}, null);
    await createPeerConnection();
    const offer = await state.peerConnection.createOffer();
    await state.peerConnection.setLocalDescription(offer);
    await sendCallSignal('offer', { description: state.peerConnection.localDescription }, payload.from);
    return;
  }
  if (payload.type === 'offer' && state.call.role === 'callee') {
    await state.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.description));
    await flushCallCandidates();
    const answer = await state.peerConnection.createAnswer();
    await state.peerConnection.setLocalDescription(answer);
    await sendCallSignal('answer', { description: state.peerConnection.localDescription }, state.call.peerId);
    return;
  }
  if (payload.type === 'answer' && state.call.role === 'caller') {
    await state.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.description));
    await flushCallCandidates();
    return;
  }
  if (payload.type === 'candidate') {
    const candidate = new RTCIceCandidate(payload.candidate);
    if (state.peerConnection?.remoteDescription) await state.peerConnection.addIceCandidate(candidate);
    else state.queuedCandidates.push(candidate);
    return;
  }
  if (payload.type === 'busy' || payload.type === 'reject') {
    await finishCall(false);
    showToast(payload.type === 'busy' ? 'Участник уже разговаривает.' : 'Вызов отклонён.');
    return;
  }
  if (payload.type === 'accepted' && state.call.role === 'callee' && payload.from !== state.call.peerId) {
    await finishCall(false);
    showToast('К звонку уже подключился другой участник.');
    return;
  }
  if (payload.type === 'hangup') {
    await finishCall(false);
    showToast('Звонок завершён.');
  }
}

async function acceptCall() {
  if (!state.call || state.call.role !== 'callee') return;
  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: state.call.mode === 'video' });
    if (state.call.mode === 'video') els.localVideo.srcObject = state.localStream;
    els.incomingActions.hidden = true;
    els.callControls.hidden = false;
    els.callStatus.textContent = 'Подключаемся…';
    await createPeerConnection();
    await sendCallSignal('accept', { displayName: state.user.displayName }, state.call.peerId);
  } catch (error) {
    console.error(error);
    await sendCallSignal('reject', {}, state.call.peerId);
    await finishCall(false);
    showToast('Не удалось подключить микрофон или камеру.');
  }
}

async function createPeerConnection() {
  if (!state.call || state.peerConnection) return;
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  state.peerConnection = pc;
  state.localStream?.getTracks().forEach((track) => pc.addTrack(track, state.localStream));
  pc.onicecandidate = (event) => {
    if (event.candidate && state.call?.peerId) sendCallSignal('candidate', { candidate: event.candidate }, state.call.peerId);
  };
  pc.ontrack = (event) => {
    state.remoteStream = event.streams[0];
    els.remoteAudio.srcObject = state.remoteStream;
    els.remoteVideo.srcObject = state.remoteStream;
    els.callStatus.textContent = 'На связи';
    startCallTimer();
    els.remoteAudio.play().catch(() => {});
    els.remoteVideo.play().catch(() => {});
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      els.callStatus.textContent = 'На связи';
      startCallTimer();
    } else if (pc.connectionState === 'failed') {
      els.callStatus.textContent = 'Не удалось соединиться';
    }
  };
}

async function flushCallCandidates() {
  if (!state.peerConnection?.remoteDescription) return;
  const candidates = state.queuedCandidates.splice(0);
  for (const candidate of candidates) await state.peerConnection.addIceCandidate(candidate);
}

function startCallTimer() {
  if (state.callStartedAt) return;
  state.callStartedAt = Date.now();
  state.callTimer = setInterval(() => {
    if (state.call) els.callStatus.textContent = `На связи · ${formatDuration(Math.floor((Date.now() - state.callStartedAt) / 1000))}`;
  }, 1000);
}

async function finishCall(sendSignal = true) {
  const call = state.call;
  if (sendSignal && call) await sendCallSignal('hangup', {}, call.peerId);
  clearInterval(state.callTimer);
  state.callTimer = null;
  state.callStartedAt = null;
  state.peerConnection?.close();
  state.peerConnection = null;
  state.localStream?.getTracks().forEach((track) => track.stop());
  state.localStream = null;
  state.remoteStream = null;
  state.queuedCandidates = [];
  els.localVideo.srcObject = null;
  els.remoteVideo.srcObject = null;
  els.remoteAudio.srcObject = null;
  state.call = null;
  els.callScreen.hidden = true;
}

function toggleCallTrack(kind) {
  const tracks = kind === 'video' ? state.localStream?.getVideoTracks() : state.localStream?.getAudioTracks();
  if (!tracks?.length) return;
  const enabled = !tracks[0].enabled;
  tracks.forEach((track) => { track.enabled = enabled; });
  const button = kind === 'video' ? $('#toggleCameraButton') : $('#toggleMicButton');
  button.classList.toggle('off', !enabled);
  button.setAttribute('aria-label', `${enabled ? 'Выключить' : 'Включить'} ${kind === 'video' ? 'камеру' : 'микрофон'}`);
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
  $('#createRoomButton').addEventListener('click', openCreateRoom);
  els.createRoomForm.addEventListener('submit', createRoom);
  $('#createRoomClose').addEventListener('click', closeCreateRoom);
  els.createRoomBackdrop.addEventListener('click', (event) => { if (event.target === els.createRoomBackdrop) closeCreateRoom(); });
  document.querySelectorAll('[data-create-type]').forEach((button) => button.addEventListener('click', () => setCreateType(button.dataset.createType)));
  document.querySelectorAll('[data-room-filter]').forEach((button) => button.addEventListener('click', () => {
    state.roomFilter = button.dataset.roomFilter;
    document.querySelectorAll('[data-room-filter]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    updateRoomList();
  }));
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
  els.recordButton.addEventListener('click', toggleRecording);
  els.sendVoiceButton.addEventListener('click', sendVoiceMessage);
  $('#cancelVoiceButton').addEventListener('click', cancelVoicePreview);
  $('#voiceCallButton').addEventListener('click', () => startCall('audio'));
  $('#videoCallButton').addEventListener('click', () => startCall('video'));
  $('#acceptCallButton').addEventListener('click', acceptCall);
  $('#rejectCallButton').addEventListener('click', async () => {
    if (state.call) await sendCallSignal('reject', {}, state.call.peerId);
    await finishCall(false);
  });
  $('#endCallButton').addEventListener('click', () => finishCall(true));
  $('#toggleMicButton').addEventListener('click', () => toggleCallTrack('audio'));
  $('#toggleCameraButton').addEventListener('click', () => toggleCallTrack('video'));
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
    if (event.key === 'Escape') { closeModal(); closeCreateRoom(); els.sidebar.classList.remove('open'); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.roomSearch.focus(); }
  });
}

bindEvents();
start();
