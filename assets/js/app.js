/* N1 Dojo — SPA tĩnh, không cần build. Dữ liệu lấy từ data/*.js, tiến độ lưu localStorage. */
(function () {
  'use strict';

  const VOCAB = window.VOCAB || [], KANJI = window.KANJI || [], GRAMMAR = window.GRAMMAR || [], READING = window.READING || [];
  const STORE = 'n1dojo_v1';
  const DAY = 86400000;
  // Leitner: hộp 0..6 → số ngày tới lần ôn tiếp theo
  const INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  const $app = document.getElementById('app');

  /* ---------- Storage ---------- */
  const DEFAULT = () => ({ srs: {}, grammar: {}, history: [], streak: { last: null, count: 0 }, theme: null });
  let S = load();
  function load() {
    try { return Object.assign(DEFAULT(), JSON.parse(localStorage.getItem(STORE)) || {}); }
    catch (e) { return DEFAULT(); }
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* private mode */ } }

  function touchStreak() {
    const today = new Date().toDateString();
    if (S.streak.last === today) return;
    const yest = new Date(Date.now() - DAY).toDateString();
    S.streak.count = S.streak.last === yest ? S.streak.count + 1 : 1;
    S.streak.last = today;
    save();
  }

  /* ---------- Helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (arr, n, exclude) => shuffle(arr.filter(x => x !== exclude)).slice(0, n);
  const unique = arr => [...new Set(arr)];

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('ja'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  window.__speak = speak;

  const vocabId = v => 'v:' + v.w;
  const kanjiId = k => 'k:' + k.k;
  const card = id => S.srs[id] || { box: 0, due: 0, seen: 0 };
  function grade(id, ok) {
    const c = card(id);
    c.seen = (c.seen || 0) + 1;
    c.box = ok ? Math.min(c.box + 1, INTERVALS.length - 1) : 0;
    c.due = ok ? startOfDay(Date.now() + INTERVALS[c.box] * DAY) : 0;
    S.srs[id] = c;
    touchStreak();
    save();
  }
  function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  const isDue = id => card(id).due <= Date.now();
  const isMastered = id => card(id).box >= 4;

  function nextExam() {
    // JLPT: Chủ nhật đầu tiên của tháng 7 và tháng 12
    const now = new Date();
    const firstSunday = (y, m) => { const d = new Date(y, m, 1); d.setDate(1 + ((7 - d.getDay()) % 7)); return d; };
    const cands = [];
    for (const y of [now.getFullYear(), now.getFullYear() + 1]) cands.push(firstSunday(y, 6), firstSunday(y, 11));
    const today = startOfDay(now.getTime());
    const d = cands.find(c => c.getTime() >= today);
    return { date: d, days: Math.round((d.getTime() - today) / DAY) };
  }

  /* ---------- Router ---------- */
  const routes = { home, vocab: () => flash('vocab'), kanji: () => flash('kanji'), grammar, reading, quiz, progress };
  let cleanup = null;
  function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    const r = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
    (routes[r] || home)();
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.r === (routes[r] ? r : 'home')));
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  /* ---------- Theme ---------- */
  function applyTheme() { if (S.theme) document.documentElement.dataset.theme = S.theme; else delete document.documentElement.dataset.theme; }
  document.getElementById('themeBtn').addEventListener('click', () => {
    const dark = S.theme ? S.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    S.theme = dark ? 'light' : 'dark'; save(); applyTheme();
  });
  applyTheme();

  /* ---------- Home ---------- */
  function home() {
    const ex = nextExam();
    const dueV = VOCAB.filter(v => isDue(vocabId(v))).length;
    const dueK = KANJI.filter(k => isDue(kanjiId(k))).length;
    const gLearned = GRAMMAR.filter(g => S.grammar[g.p]).length;
    const best = S.history.length ? Math.max(...S.history.map(h => Math.round(h.score / h.total * 100))) : null;
    const dateStr = ex.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    $app.innerHTML = `
      <h1>おかえりなさい 👋</h1>
      <p class="sub">Mỗi ngày một chút — ôn đúng lúc sắp quên là cách nhớ lâu nhất.</p>
      <div class="grid">
        <div class="card stat hero"><div class="num">${ex.days}</div><div class="lbl">ngày tới kỳ thi JLPT (${dateStr})</div></div>
        <div class="card stat"><div class="num">${S.streak.count}</div><div class="lbl">ngày học liên tiếp 🔥</div></div>
        <div class="card stat"><div class="num">${dueV + dueK}</div><div class="lbl">thẻ cần ôn hôm nay</div></div>
        <div class="card stat"><div class="num">${best === null ? '—' : best + '%'}</div><div class="lbl">điểm thi thử cao nhất</div></div>
      </div>
      <h2>Bắt đầu học</h2>
      <div class="grid">
        <a class="card" href="#/vocab"><div class="tile-jp">語彙</div><b>Từ vựng</b><div class="sub" style="margin:0">${dueV} thẻ đến hạn · ${VOCAB.length} từ</div></a>
        <a class="card" href="#/kanji"><div class="tile-jp">漢字</div><b>Kanji</b><div class="sub" style="margin:0">${dueK} thẻ đến hạn · ${KANJI.length} chữ</div></a>
        <a class="card" href="#/grammar"><div class="tile-jp">文法</div><b>Ngữ pháp</b><div class="sub" style="margin:0">Đã thuộc ${gLearned}/${GRAMMAR.length} mẫu</div></a>
        <a class="card" href="#/reading"><div class="tile-jp">読解</div><b>Đọc hiểu</b><div class="sub" style="margin:0">${READING.length} bài đọc</div></a>
        <a class="card" href="#/quiz"><div class="tile-jp">模試</div><b>Thi thử</b><div class="sub" style="margin:0">Trắc nghiệm có bấm giờ</div></a>
      </div>`;
  }

  /* ---------- Flashcards ---------- */
  function flash(deck) {
    const isV = deck === 'vocab';
    const all = isV ? VOCAB : KANJI;
    const idOf = isV ? vocabId : kanjiId;
    let mode = 'due', queue = [], i = 0, flipped = false, done = 0, okCount = 0;

    function build() {
      const pool = mode === 'due' ? all.filter(x => isDue(idOf(x))) : all;
      queue = shuffle(pool); i = 0; done = 0; okCount = 0; flipped = false;
      draw();
    }
    function front(x) {
      return isV ? `<div class="big-jp">${esc(x.w)}</div><div class="hint">Bấm để lật thẻ</div>`
                 : `<div class="big-jp" style="font-size:96px">${esc(x.k)}</div><div class="hint">Âm Hán Việt? Nghĩa? Bấm để lật</div>`;
    }
    function back(x) {
      if (isV) return `<div class="reading">${esc(x.r)}</div><div class="big-jp" style="font-size:40px">${esc(x.w)}</div>
        <div class="meaning">${esc(x.m)}</div><div class="example">${esc(x.e)}</div><div class="example-vi">${esc(x.ev)}</div>`;
      return `<div class="big-jp" style="font-size:52px">${esc(x.k)} <span style="font-size:22px;font-family:var(--ui)">${esc(x.hv)}</span></div>
        <div class="meaning">${esc(x.m)}</div>
        <div class="reading">音: ${esc(x.on) || '—'} ・ 訓: ${esc(x.kun) || '—'}</div>
        <div class="example" style="margin-top:10px">${x.ex.map(e => `${esc(e[0])}（${esc(e[1])}）${esc(e[2])}`).join('<br>')}</div>`;
    }
    function draw() {
      const head = `
        <h1>${isV ? 'Từ vựng N1' : 'Kanji N1'}</h1>
        <p class="sub">Lặp lại ngắt quãng (Leitner): nhớ → thẻ lên hộp và giãn lịch ôn; quên → về hộp 0.</p>
        <div class="row" style="justify-content:space-between">
          <div class="seg"><button data-m="due" class="${mode === 'due' ? 'on' : ''}">Đến hạn (${all.filter(x => isDue(idOf(x))).length})</button><button data-m="all" class="${mode === 'all' ? 'on' : ''}">Tất cả (${all.length})</button></div>
          <span class="hint"><span class="kbd">Space</span> lật · <span class="kbd">1</span> quên · <span class="kbd">2</span> nhớ · <span class="kbd">S</span> phát âm</span>
        </div>`;
      if (i >= queue.length) {
        $app.innerHTML = head + `<div class="flash-wrap"><div class="card empty">
          ${queue.length ? `<div class="tile-jp">お疲れ様！</div><p>Xong lượt ôn: nhớ ${okCount}/${done} thẻ.</p>` : `<div class="tile-jp">🎉</div><p>Không còn thẻ đến hạn. Quay lại vào ngày mai hoặc chọn “Tất cả”.</p>`}
          <div class="row" style="justify-content:center"><button class="btn primary" id="again">Ôn lại tất cả</button><a class="btn" href="#/quiz">Làm bài thi thử</a></div></div></div>`;
        bindSeg();
        document.getElementById('again').onclick = () => { mode = 'all'; build(); };
        return;
      }
      const x = queue[i], c = card(idOf(x));
      $app.innerHTML = head + `
        <div class="flash-wrap">
          <div class="row" style="justify-content:space-between;margin-top:16px"><span class="box-badge">Thẻ ${i + 1}/${queue.length} · Hộp ${c.box}</span>
            <button class="btn small" id="say">🔊 Phát âm</button></div>
          <div class="progress-bar" style="margin-top:6px"><div style="width:${i / queue.length * 100}%"></div></div>
          <div class="flash ${flipped ? 'flipped' : ''}" id="fc"><div class="flash-inner">
            <div class="face front">${front(x)}</div><div class="face back">${back(x)}</div></div></div>
          <div class="row" style="justify-content:center">
            <button class="btn bad" id="no">✗ Chưa nhớ</button><button class="btn ok" id="yes">✓ Đã nhớ</button>
          </div>
        </div>`;
      bindSeg();
      document.getElementById('fc').onclick = flip;
      document.getElementById('say').onclick = () => speak(isV ? x.w : (x.ex[0] || [x.k])[0]);
      document.getElementById('no').onclick = () => answer(false);
      document.getElementById('yes').onclick = () => answer(true);
    }
    function flip() { flipped = !flipped; const el = document.getElementById('fc'); if (el) el.classList.toggle('flipped', flipped); }
    function answer(ok) {
      if (i >= queue.length) return;
      grade(idOf(queue[i]), ok); done++; if (ok) okCount++;
      if (!ok && mode === 'all') queue.push(queue[i]); // gặp lại cuối lượt
      i++; flipped = false; draw();
    }
    function bindSeg() { $app.querySelectorAll('.seg button').forEach(b => b.onclick = () => { mode = b.dataset.m; build(); }); }
    function onKey(e) {
      if (e.target.matches('input,textarea,select')) return;
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      else if (e.key === '1') answer(false);
      else if (e.key === '2') answer(true);
      else if (e.key.toLowerCase() === 's' && queue[i]) speak(isV ? queue[i].w : (queue[i].ex[0] || [queue[i].k])[0]);
    }
    document.addEventListener('keydown', onKey);
    cleanup = () => document.removeEventListener('keydown', onKey);
    build();
  }

  /* ---------- Grammar ---------- */
  function grammar() {
    let filter = '', only = 'all';
    $app.innerHTML = `
      <h1>Ngữ pháp N1</h1>
      <p class="sub">Bấm vào từng mẫu để xem cấu trúc và ví dụ. Đánh dấu “Đã thuộc” để theo dõi tiến độ.</p>
      <div class="row" style="margin-bottom:14px">
        <input type="search" id="gq" placeholder="Tìm mẫu ngữ pháp hoặc nghĩa… (vd: をもって, bất chấp)" style="flex:1;min-width:200px">
        <div class="seg"><button data-f="all" class="on">Tất cả</button><button data-f="todo">Chưa thuộc</button><button data-f="done">Đã thuộc</button></div>
      </div>
      <div class="list" id="glist"></div>`;
    const list = document.getElementById('glist');
    function draw() {
      const q = filter.trim().toLowerCase();
      const items = GRAMMAR.filter(g => (!q || (g.p + g.m + g.e).toLowerCase().includes(q)) &&
        (only === 'all' || (only === 'done') === !!S.grammar[g.p]));
      list.innerHTML = items.length ? items.map(g => `
        <details class="gitem">
          <summary><span class="pat">${esc(g.p)}</span><span class="gm">${esc(g.m)}</span>${S.grammar[g.p] ? '<span class="tag ok">Đã thuộc</span>' : ''}</summary>
          <div class="body">
            <div><span class="tag">Cấu trúc</span> <span class="jp">${esc(g.s)}</span></div>
            <p class="example" style="margin:10px 0 2px">${esc(g.e)} <button class="btn small" data-say="${esc(g.e)}">🔊</button></p>
            <div class="example-vi">${esc(g.ev)}</div>
            <div class="row" style="margin-top:12px"><button class="btn small ${S.grammar[g.p] ? '' : 'primary'}" data-learn="${esc(g.p)}">${S.grammar[g.p] ? 'Bỏ đánh dấu' : '✓ Đã thuộc'}</button></div>
          </div>
        </details>`).join('') : '<div class="empty">Không tìm thấy mẫu nào.</div>';
    }
    list.addEventListener('click', e => {
      const say = e.target.closest('[data-say]'); if (say) return speak(say.dataset.say);
      const l = e.target.closest('[data-learn]');
      if (l) {
        const p = l.dataset.learn; S.grammar[p] = !S.grammar[p]; if (S.grammar[p]) touchStreak(); save();
        const openIdx = [...list.querySelectorAll('details')].findIndex(d => d.open);
        draw(); const d = list.querySelectorAll('details')[openIdx]; if (d && only === 'all') d.open = true;
      }
    });
    document.getElementById('gq').addEventListener('input', e => { filter = e.target.value; draw(); });
    $app.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
      only = b.dataset.f; $app.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); draw();
    });
    draw();
  }

  /* ---------- Reading ---------- */
  function reading() {
    const idx = parseInt((location.hash.split('/')[2] || ''), 10);
    if (isNaN(idx) || !READING[idx]) {
      $app.innerHTML = `<h1>Đọc hiểu</h1><p class="sub">Đọc kỹ đoạn văn rồi trả lời câu hỏi. Mẹo N1: đọc câu hỏi trước, tìm câu chủ đề ở đoạn cuối.</p>
        <div class="grid">${READING.map((r, k) => `<a class="card" href="#/reading/${k}"><span class="tag">${esc(r.level)}</span>
          <div class="tile-jp" style="font-size:22px;margin-top:6px">${esc(r.title)}</div><div class="sub" style="margin:0">${r.qs.length} câu hỏi</div></a>`).join('')}</div>`;
      return;
    }
    const r = READING[idx];
    $app.innerHTML = `<a href="#/reading">← Danh sách bài</a><h1 class="jp" style="margin-top:8px">${esc(r.title)}</h1>
      <div class="passage">${esc(r.text)}</div>
      <div id="qs">${r.qs.map((q, qi) => `<div class="card" style="margin-top:14px"><b>問${qi + 1}</b> <span class="jp">${esc(q.q)}</span>
        <div class="opts" style="margin-top:10px">${q.o.map((o, oi) => `<button class="opt jp" data-q="${qi}" data-o="${oi}">${oi + 1}. ${esc(o)}</button>`).join('')}</div>
        <div class="feedback" id="fb${qi}" hidden></div></div>`).join('')}</div>`;
    $app.querySelector('#qs').addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b) return;
      const qi = +b.dataset.q, oi = +b.dataset.o, q = r.qs[qi];
      $app.querySelectorAll(`.opt[data-q="${qi}"]`).forEach(x => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('correct'); });
      if (oi !== q.a) b.classList.add('wrong');
      const fb = document.getElementById('fb' + qi);
      fb.hidden = false; fb.innerHTML = `${oi === q.a ? '✅ Chính xác!' : '❌ Chưa đúng.'} <span class="jp">${esc(q.x)}</span>`;
      touchStreak();
    });
  }

  /* ---------- Quiz ---------- */
  const QTYPES = {
    vmean: { name: 'Từ vựng → Nghĩa', make: () => { const v = pick(VOCAB); return mc(v.w, v.m, unique(sample(VOCAB, 6, v).map(x => x.m)), vocabId(v), `${v.w}（${v.r}）: ${v.m}`); } },
    vread: { name: 'Cách đọc từ (読み方)', make: () => { const v = pick(VOCAB); return mc(v.w, v.r, unique(sample(VOCAB, 6, v).map(x => x.r)), vocabId(v), `${v.w} đọc là ${v.r} — ${v.m}`); } },
    kmean: { name: 'Kanji → Hán Việt', make: () => { const k = pick(KANJI); return mc(k.k, `${k.hv} — ${k.m}`, unique(sample(KANJI, 6, k).map(x => `${x.hv} — ${x.m}`)), kanjiId(k), `${k.k} (${k.hv}): ${k.ex.map(e => e[0] + '・' + e[1]).join(', ')}`); } },
    gram: { name: 'Ngữ pháp (điền vào chỗ trống)', make: () => { const g = pick(GRAMMAR); return mc(g.q, g.a, unique(sample(GRAMMAR, 6, g).map(x => x.a)), null, `${g.p}: ${g.m} — ${g.e}`); } }
  };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mc(q, a, distract, id, explain) {
    const opts = shuffle([a, ...distract.filter(d => d !== a).slice(0, 3)]);
    return { q, a, opts, id, explain };
  }

  function quiz() {
    let types = ['vmean', 'vread', 'kmean', 'gram'], n = 10, timed = true;
    function setup() {
      $app.innerHTML = `<h1>Thi thử</h1><p class="sub">Trắc nghiệm ngẫu nhiên. Câu từ vựng/kanji làm sai sẽ được đưa về hộp 0 để ôn lại.</p>
        <div class="card">
          <b>Dạng câu hỏi</b>
          <div class="list" style="margin:10px 0 16px">${Object.entries(QTYPES).map(([k, t]) => `<label class="row"><input type="checkbox" value="${k}" ${types.includes(k) ? 'checked' : ''}> ${t.name}</label>`).join('')}</div>
          <div class="row" style="margin-bottom:16px"><b>Số câu</b>
            <div class="seg" id="nseg">${[10, 20, 30].map(x => `<button data-n="${x}" class="${x === n ? 'on' : ''}">${x}</button>`).join('')}</div>
            <label class="row" style="margin-left:12px"><input type="checkbox" id="timed" ${timed ? 'checked' : ''}> Bấm giờ (36 giây/câu)</label>
          </div>
          <button class="btn primary" id="start">Bắt đầu ▶</button>
        </div>
        ${S.history.length ? `<h2>Lịch sử gần đây</h2><div class="card"><table><tr><th>Ngày</th><th>Dạng</th><th>Điểm</th></tr>
          ${S.history.slice(-5).reverse().map(h => `<tr><td>${new Date(h.at).toLocaleString('vi-VN')}</td><td>${esc(h.types)}</td><td><b>${h.score}/${h.total}</b></td></tr>`).join('')}</table></div>` : ''}`;
      $app.querySelectorAll('#nseg button').forEach(b => b.onclick = () => { n = +b.dataset.n; setup(); });
      $app.querySelectorAll('input[type=checkbox][value]').forEach(c => c.onchange = () => { types = [...$app.querySelectorAll('input[type=checkbox][value]:checked')].map(x => x.value); });
      document.getElementById('timed').onchange = e => timed = e.target.checked;
      document.getElementById('start').onclick = () => { if (!types.length) return alert('Hãy chọn ít nhất 1 dạng câu hỏi.'); run(); };
    }
    function run() {
      const qs = Array.from({ length: n }, () => QTYPES[pick(types)].make());
      let i = 0, score = 0, answered = false, left = n * 36, timer = null;
      const wrong = [];
      if (timed) {
        timer = setInterval(() => {
          left--; const t = document.getElementById('tm');
          if (t) { t.textContent = fmt(left); t.classList.toggle('warn', left <= 60); }
          if (left <= 0) finish();
        }, 1000);
      }
      cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
      function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
      function draw() {
        const q = qs[i]; answered = false;
        $app.innerHTML = `<div class="row" style="justify-content:space-between"><span class="box-badge">Câu ${i + 1}/${n} · Đúng ${score}</span>
          ${timed ? `<span class="timer" id="tm">⏱ ${fmt(left)}</span>` : ''}</div>
          <div class="progress-bar" style="margin:6px 0 16px"><div style="width:${i / n * 100}%"></div></div>
          <div class="card"><div class="q-text">${esc(q.q)}</div>
          <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}"><span class="kbd">${k + 1}</span> <span class="jp">${esc(o)}</span></button>`).join('')}</div>
          <div class="feedback" id="fb" hidden></div>
          <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn primary" id="next" hidden>${i + 1 < n ? 'Câu tiếp →' : 'Xem kết quả'}</button></div></div>`;
        $app.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(+b.dataset.k));
        document.getElementById('next').onclick = next;
      }
      function choose(k) {
        if (answered) return; answered = true;
        const q = qs[i], ok = q.opts[k] === q.a;
        if (ok) score++; else wrong.push(q);
        if (q.id) grade(q.id, ok);
        $app.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; if (q.opts[j] === q.a) b.classList.add('correct'); else if (j === k) b.classList.add('wrong'); });
        const fb = document.getElementById('fb'); fb.hidden = false;
        fb.innerHTML = `${ok ? '✅ Chính xác!' : '❌ Sai rồi.'} <span class="jp">${esc(q.explain)}</span>`;
        document.getElementById('next').hidden = false; document.getElementById('next').focus();
      }
      function next() { i++; if (i >= n) finish(); else draw(); }
      function onKey(e) {
        if (/^[1-4]$/.test(e.key) && !answered) choose(+e.key - 1);
        else if (e.key === 'Enter' && answered) { e.preventDefault(); next(); }
      }
      document.addEventListener('keydown', onKey);
      function finish() {
        cleanup(); cleanup = null;
        const pct = Math.round(score / n * 100);
        S.history.push({ at: Date.now(), score, total: n, types: types.map(t => QTYPES[t].name.split(' ')[0]).join(', ') });
        S.history = S.history.slice(-100); touchStreak(); save();
        $app.innerHTML = `<div class="card" style="text-align:center"><div class="tile-jp">${pct >= 80 ? '合格圏！' : pct >= 60 ? 'もう少し！' : '頑張ろう！'}</div>
          <div class="stat"><div class="num">${score}/${n}</div><div class="lbl">${pct}% — ${pct >= 80 ? 'Rất tốt, giữ phong độ!' : pct >= 60 ? 'Khá, ôn thêm phần sai nhé.' : 'Cần ôn lại flashcard trước khi thi tiếp.'}</div></div>
          <div class="row" style="justify-content:center;margin-top:14px"><button class="btn primary" id="retry">Làm lại</button><a class="btn" href="#/vocab">Ôn flashcard</a></div></div>
          ${wrong.length ? `<h2>Câu làm sai (${wrong.length})</h2><div class="list">${wrong.map(q => `<div class="card"><div class="jp"><b>${esc(q.q)}</b></div>
            <div>Đáp án: <b class="jp" style="color:var(--ok)">${esc(q.a)}</b></div><div class="example-vi jp">${esc(q.explain)}</div></div>`).join('')}</div>` : ''}`;
        document.getElementById('retry').onclick = setup;
      }
      draw();
    }
    setup();
  }

  /* ---------- Progress ---------- */
  function progress() {
    const boxes = INTERVALS.map(() => 0);
    [...VOCAB.map(vocabId), ...KANJI.map(kanjiId)].forEach(id => boxes[card(id).box]++);
    const max = Math.max(...boxes, 1);
    const mV = VOCAB.filter(v => isMastered(vocabId(v))).length, mK = KANJI.filter(k => isMastered(kanjiId(k))).length;
    const gL = GRAMMAR.filter(g => S.grammar[g.p]).length;
    const avg = S.history.length ? Math.round(S.history.reduce((s, h) => s + h.score / h.total, 0) / S.history.length * 100) : null;
    $app.innerHTML = `<h1>Tiến độ</h1><p class="sub">“Thuộc” = thẻ đã lên hộp 4 trở lên (ôn cách ≥ 7 ngày).</p>
      <div class="grid">
        <div class="card stat"><div class="num">${mV}/${VOCAB.length}</div><div class="lbl">từ vựng đã thuộc</div><div class="progress-bar"><div style="width:${mV / Math.max(VOCAB.length, 1) * 100}%"></div></div></div>
        <div class="card stat"><div class="num">${mK}/${KANJI.length}</div><div class="lbl">kanji đã thuộc</div><div class="progress-bar"><div style="width:${mK / Math.max(KANJI.length, 1) * 100}%"></div></div></div>
        <div class="card stat"><div class="num">${gL}/${GRAMMAR.length}</div><div class="lbl">mẫu ngữ pháp đã thuộc</div><div class="progress-bar"><div style="width:${gL / Math.max(GRAMMAR.length, 1) * 100}%"></div></div></div>
        <div class="card stat"><div class="num">${avg === null ? '—' : avg + '%'}</div><div class="lbl">điểm thi thử trung bình (${S.history.length} lượt)</div></div>
      </div>
      <h2>Phân bố thẻ theo hộp Leitner</h2>
      <div class="card"><div class="bars">${boxes.map((b, k) => `<div class="b"><span>${b}</span><span class="fill" style="height:${b / max * 100}%"></span><span>Hộp ${k}</span></div>`).join('')}</div>
        <p class="hint" style="text-align:left">Hộp 0 = mới/quên · Hộp 6 = ôn lại sau 30 ngày</p></div>
      <h2>Sao lưu dữ liệu</h2>
      <div class="card"><p style="margin-top:0">Tiến độ chỉ nằm trong trình duyệt này. Xuất file để chuyển sang máy khác.</p>
        <div class="row"><button class="btn" id="exp">⬇ Xuất JSON</button><label class="btn">⬆ Nhập JSON<input type="file" id="imp" accept=".json,application/json" hidden></label>
        <button class="btn bad" id="rst">Xoá toàn bộ tiến độ</button></div></div>`;
    document.getElementById('exp').onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `n1dojo-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    };
    document.getElementById('imp').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => { S = Object.assign(DEFAULT(), JSON.parse(t)); save(); applyTheme(); alert('Đã nhập dữ liệu.'); progress(); })
        .catch(() => alert('File không hợp lệ.'));
    };
    document.getElementById('rst').onclick = () => { if (confirm('Xoá toàn bộ tiến độ? Không thể hoàn tác.')) { S = DEFAULT(); save(); applyTheme(); progress(); } };
  }

  render();
})();
