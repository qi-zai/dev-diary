/* 户主电话簿 · 静态版（数据只存本机 localStorage，名单由使用者自己导入） */
(function () {
'use strict';

var LS = { db: 'huzhu.phonebook.v1', ui: 'huzhu.phonebook.ui.v1', flag: 'huzhu.phonebook.flag.v1' };
var PY = (window.__PY__ || '').split('/');
var PYS = window.__PYS__ || {};      // 24 个只在“姓氏位置”读法不同的字

var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

/* ================= 本地存储 ================= */
function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function write(k, v) {
  try { localStorage.setItem(k, v); return true; }
  catch (e) { toast('保存失败：' + (e && e.name === 'QuotaExceededError' ? '本机存储空间不足' : '浏览器禁用了本地存储') + '，本次改动刷新后会丢失'); return false; }
}

var ui = JSON.parse(read(LS.ui) || '{}');
var flags = JSON.parse(read(LS.flag) || '{}');
ui.theme = ui.theme === 'dark' ? 'dark' : 'light';
delete ui.showOff;                    // 老版本存过这个开关，现在弃用号一直显示，按键直接丢掉

var DB = { v: 1, people: [] };
var K = {};                 // id -> 拼音键

function load() {
  var raw = read(LS.db);
  if (raw) {
    try {
      var d = JSON.parse(raw);
      if (d && Array.isArray(d.people)) { DB = { v: 1, people: d.people.filter(function (p) { return p && p.n && Array.isArray(p.nums); }) }; uniqueIds(); keysAll(); return; }
    } catch (e) {}
  }
  DB = { v: 1, people: [] };
  keysAll();
  save();
}
function save() { DB.updatedAt = Date.now(); write(LS.db, JSON.stringify(DB)); }
function saveUI() { write(LS.ui, JSON.stringify(ui)); }
function setFlag(k, v) { flags[k] = v; write(LS.flag, JSON.stringify(flags)); }

/* ================= 拼音（内置单字表，新增和改名同样能排序） ================= */
function han(s) { return String(s).replace(/[^\u4e00-\u9fa5]/g, ''); }
function syls(name) {
  return han(name).split('').map(function (ch, i) {
    return (i === 0 && PYS[ch] ? PYS[ch] : PY[ch.charCodeAt(0) - 0x4e00]) || '';
  }).filter(Boolean);
}
function keysOf(p) {
  var s = syls(p.n);
  return { a: s.join(''), j: s.map(function (x) { return x.charAt(0); }).join(''), s: s.join(' ') };
}
function keysAll() { K = {}; DB.people.forEach(function (p) { K[p.id] = keysOf(p); }); }
function ka(p) { return K[p.id] || (K[p.id] = keysOf(p)); }

/* ================= 号码 ================= */
function digits(s) { return String(s || '').replace(/[^\d]/g, ''); }
function ok11(d) { return /^1[3-9]\d{9}$/.test(d); }
function fmt(d) { d = String(d); return ok11(d) ? d.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3') : d; }
function actives(p) { return p.nums.filter(function (x) { return !x.off; }); }
/* 主号是一个标记，不是数组位置：设为主号只挪标签，行序不动 */
function priOf(p) {
  for (var i = 0; i < p.nums.length; i++) if (p.nums[i].pri) return i;
  return 0;
}
function mainNum(p) {
  var pri = p.nums[priOf(p)];
  if (pri && !pri.off) return pri.d;
  var a = actives(p);
  return (a[0] || p.nums[0] || { d: '' }).d;
}
/* id 只在本机当句柄用。导入 494 条时同一毫秒会生成一大把 id，所以加个自增序号保证不撞。 */
var idSeq = 0;
function newId() { idSeq++; return 'u' + Date.now().toString(36) + idSeq.toString(36) + Math.random().toString(36).slice(2, 5); }

/* 位数不对、不是 1[3-9] 开头的号码，收集出来供顶栏统计行逐个跳转核对 */
function badList() {
  var out = [];
  DB.people.forEach(function (p) {
    for (var i = 0; i < p.nums.length; i++) {
      var x = p.nums[i];
      if (!ok11(x.d)) out.push({ id: p.id, n: p.n, d: x.d, off: !!x.off });
    }
  });
  return out;
}

/* ================= 排序 / 搜索 ================= */
/* 列表只有一种顺序：拼音 A→Z。字母分组和右侧索引条都建立在这个序上，所以不做切换按钮 */
function BY_PY(a, b) { return ka(a).a.localeCompare(ka(b).a) || a.n.localeCompare(b.n, 'zh'); }

/* 弃用号一直显示在列表里（带"已弃用"标记），没有开关：能拨的走 tel:，弃用的只展示 */
function visible(p) { return p.nums.length > 0; }

/* 保存后把这条记录拉到眼前：手机列表很长，不定位的话人就找不到刚加的号码。
   已经在屏幕里就不跳，避免列表乱晃。 */
function revealCard(id) {
  var el = document.querySelector('.card[data-id="' + cssId(id) + '"]');
  if (!el) return false;
  var stick = $('header').offsetHeight, r = el.getBoundingClientRect();
  if (r.top >= stick - 2 && r.bottom <= window.innerHeight) return true;
  window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - stick - 8));
  return true;
}
/* 跳到某个具体号码那一行（问题号码逐个核对用）：行在可视区里就不动，免得来回跳 */
function revealNum(id, d) {
  var el = document.querySelector('.card[data-id="' + cssId(id) + '"] .n[data-d="' + cssId(d) + '"]');
  if (!el) return false;
  var stick = $('header').offsetHeight, r = el.getBoundingClientRect();
  if (r.top >= stick && r.bottom <= window.innerHeight) return true;
  window.scrollTo(0, Math.max(0, flowTop(el) - stick - Math.round(window.innerHeight * 0.28)));
  return true;
}
function cssId(s) {
  s = String(s);
  return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');
}
function matchedNum(p, dig) {
  if (!dig) return null;
  for (var i = 0; i < p.nums.length; i++) {
    var x = p.nums[i];
    if (x.d.indexOf(dig) >= 0) return x.d;
  }
  return null;
}
function match(p, q, letters, dig) {
  if (!visible(p)) return false;
  if (!q) return true;
  if (p.n.toLowerCase().indexOf(q) >= 0) return true;
  var k = ka(p);
  if (letters.length >= 2) {
    if (k.a.indexOf(letters) >= 0 || k.j.indexOf(letters) >= 0) return true;
  } else if (letters.length === 1 && q === letters) {
    // 只输入一个字母：按首字母筛出这一组（如 z → 所有张/赵/周）
    if (k.j.charAt(0) === letters) return true;
  }
  if (dig.length >= 2 && matchedNum(p, dig)) return true;
  return false;
}
function results() {
  var q = ($('#q').value || '').trim().toLowerCase();
  var letters = q.replace(/[^a-z]/g, '');
  var dig = q.replace(/\D/g, '');
  var list = DB.people.filter(function (p) { return match(p, q, letters, dig); }).sort(BY_PY);
  list.meta = { q: q, letters: letters, dig: dig };
  return list;
}

/* ================= 渲染 ================= */
function range(hay, needle) {
  if (!needle) return null;
  var i = hay.toLowerCase().indexOf(needle);
  return i < 0 ? null : [i, i + needle.length];
}
function hi(text, r) {
  if (!r) return esc(text);
  return esc(text.slice(0, r[0])) + '<mark>' + esc(text.slice(r[0], r[1])) + '</mark>' + esc(text.slice(r[1]));
}
function hiNum(d, r) {
  var out = '', open = false, gap = ok11(d);
  for (var i = 0; i < d.length; i++) {
    if (gap && (i === 3 || i === 7)) out += ' ';
    if (r && i === r[0]) { out += '<mark>'; open = true; }
    out += d.charAt(i);
    if (open && i === r[1] - 1) { out += '</mark>'; open = false; }
  }
  return out;
}

var focusId = null;
var focusNums = [];   // 刚保存进去的号码，列表里闪一下，免得找不到
function render(keepFocus) {
  var list = results(), m = list.meta;
  var grouped = !m.q;

  $('#clear').classList.toggle('on', !!m.q);

  var html = '', last = null;
  if (!list.length) {
    if (DB.people.length) {
      html = '<div class="empty"><b>没有匹配的记录</b>姓名、拼音首字母、号码后几位都能搜</div>';
    } else {
      /* 空电话簿：把导入入口直接摆在眼前，不用先去翻设置 */
      html = '<div class="empty"><b>电话簿还是空的</b>名单要自己导进来，导完只存在这台手机里'
        + '<div class="ops"><button class="btn pri" data-act="impfile">导入名单文件</button>'
        + '<button class="btn" data-act="imppaste">粘贴名单</button></div></div>';
    }
  } else {
    for (var i = 0; i < list.length; i++) {
      var p = list[i], k = ka(p), act = actives(p);
      if (grouped) {
        var L = (k.j.charAt(0) || '#').toUpperCase();
        if (L !== last) { last = L; html += '<div class="grp" id="L-' + L + '" data-l="' + L + '">' + L + '</div>'; }
      }
      var offN = p.nums.length - act.length;
      var tags = '';
      if (p.nums.length > 1) tags += '<span class="tag">' + act.length + '/' + p.nums.length + ' 可用</span>';
      if (offN) tags += '<span class="tag off">弃用 ' + offN + '</span>';
      /* 有几个号码列几行，弃用号也一直铺着，行尾用"已弃用"标记区分 */
      var shownNums = p.nums;
      var rows = '';
      for (var j = 0; j < shownNums.length; j++) {
        var x = shownNums[j];
        var mr = m.dig && x.d.indexOf(m.dig) >= 0 ? range(x.d, m.dig) : null;
        var isNew = focusId === p.id && focusNums.indexOf(x.d) >= 0;
        /* 只有一个号码时不标“主号”——就一个号，谁是主号没意义 */
        var isPri = !x.off && p.nums.length > 1 && p.nums.indexOf(x) === priOf(p);
        var badge = x.off ? '<i class="off">已弃用</i>' : (isPri ? '<i class="pri">主号</i>' : '');
        if (!ok11(x.d)) badge += '<i class="warn">' + x.d.length + ' 位</i>';
        var inner = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6.5 3.5h3l1.4 3.6-2 1.4a11.5 11.5 0 0 0 5.6 5.6l1.4-2 3.6 1.4v3c0 1-.9 1.9-2 1.8C11.6 17.7 5.3 11.4 4.7 5.5c-.1-1.1.8-2 1.8-2z"/></svg>'
          + '<b>' + hiNum(x.d, mr) + '</b>' + badge;
        rows += x.off
          ? '<div class="n off' + (isNew ? ' new' : '') + '" data-d="' + esc(x.d) + '">' + inner + '</div>'
          : '<a class="n' + (isNew ? ' new' : '') + '" data-d="' + esc(x.d) + '" href="tel:' + esc(x.d) + '" data-dial="1">' + inner + '</a>';
      }
      html += '<div class="card" data-id="' + esc(p.id) + '">'
        + '<div class="chead"><div class="who"><div class="nm">' + hi(p.n, m.q ? range(p.n, m.q) : null) + tags + '</div>'
        + '<div class="py">' + esc(k.s || '　') + '</div></div>'
        + '<button class="ed" data-ed="1">编辑</button></div>'
        + '<div class="nums">' + rows + '</div></div>';
    }
  }
  $('#list').innerHTML = html;

  $('#shown').textContent = list.length;
  $('#total').textContent = DB.people.length;
  /* 位数不对的号码：统计行给个可点的入口，点一次跳一个，逐个核对 */
  var bads = badList();
  $('#badBox').innerHTML = bads.length
    ? '<button class="btnlike warnn" data-act="bad">' + bads.length + ' 个号码位数不对，点这里查看</button>' : '';

  var has = {};
  list.forEach(function (p) { has[(ka(p).j.charAt(0) || '#').toUpperCase()] = 1; });
  var letters = (grouped && has['#'] ? ['#'] : []).concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  $('#rail').innerHTML = letters.map(function (L) {
    return '<button class="' + (grouped && has[L] ? 'on' : 'off') + '" data-l="' + L + '">' + L + '</button>';
  }).join('');
  $('#rail').classList.toggle('hide', !grouped);

  if (!keepFocus) { focusId = null; focusNums = []; }
}
function setSticky() { document.documentElement.style.setProperty('--stick', $('header').offsetHeight + 'px'); }
function applyTheme() {
  document.documentElement.setAttribute('data-theme', ui.theme);
  var mt = document.querySelector('meta[name=theme-color]');
  if (mt) mt.setAttribute('content', ui.theme === 'dark' ? '#12161d' : '#ffffff');
}

/* ================= 弹层 ================= */
var openSheet = null;
function showSheet(el) {
  if (openSheet && openSheet !== el) openSheet.classList.remove('on');
  openSheet = el; $('#mask').classList.add('on'); el.classList.add('on');
}
function closeSheets() {
  $$('.sheet').forEach(function (s) { s.classList.remove('on'); });
  $('#mask').classList.remove('on'); openSheet = null;
}
var tT;
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(tT); tT = setTimeout(function () { t.classList.remove('on'); }, 2100);
}

/* 确认 / 输入对话框，取消返回 null */
function ask(opt) {
  opt = opt || {};
  return new Promise(function (res) {
    $('#dlgT').textContent = opt.title || '提示';
    if (opt.html) $('#dlgP').innerHTML = opt.html;
    else { $('#dlgP').textContent = opt.text || ''; }
    $('#dlgP').style.display = (opt.html || opt.text) ? '' : 'none';
    var inp = $('#dlgI');
    inp.classList.toggle('hide', !opt.input);
    if (opt.input) { inp.value = opt.value || ''; inp.placeholder = opt.placeholder || ''; inp.type = opt.type || 'text'; }
    $('#dlgOk').textContent = opt.ok || '确定';
    $('#dlgNo').textContent = opt.cancel || '取消';
    $('#dlgNo').classList.toggle('hide', !!opt.hideCancel);
    $('#dlgOk').className = 'btn ' + (opt.danger ? 'dgr' : 'pri');
    $('#dlg').classList.add('on');
    if (opt.input) setTimeout(function () { inp.focus(); }, 80);
    function done(v) { $('#dlg').classList.remove('on'); $('#dlgOk').onclick = $('#dlgNo').onclick = inp.onkeydown = null; res(v); }
    $('#dlgOk').onclick = function () {
      if (!opt.input) return done(true);
      var v = inp.value.trim();
      if (opt.validate && !opt.validate(v)) { toast(opt.validate.msg || '填写有误'); inp.focus(); return; }
      done(v);
    };
    $('#dlgNo').onclick = function () { done(null); };
    inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#dlgOk').click(); } };
  });
}

/* ================= 新增 / 编辑 ================= */
var draft = null;

function openEdit(id) {
  var p = id ? DB.people.filter(function (x) { return x.id === id; })[0] : null;
  draft = p
    ? { id: p.id, n: p.n, nums: p.nums.map(function (x) { return { d: x.d, off: x.off, pri: x.pri }; }) }
    : { id: newId(), n: '', nums: [] };
  $('#editTitle').textContent = p ? '编辑 · ' + p.n : '新增联系人';
  $('#fName').value = draft.n;
  $('#fNew').value = '';
  $('#fDel').classList.toggle('hide', !p);
  drawNums();
  showSheet($('#shEdit'));
  if (!p) setTimeout(function () { $('#fName').focus(); }, 300);
}
function drawNums(flash) {
  if (!draft.nums.length) { $('#fNums').innerHTML = '<div class="hint">还没有号码，下面填好点“＋”。</div>'; return; }
  var pi = priOf({ nums: draft.nums }), html = '';
  draft.nums.forEach(function (x, i) {
    var isPri = i === pi, note = [];
    if (!isPri) note.push('第 ' + (i + 1) + ' 个');
    if (x.off) note.push('已弃用');
    if (!ok11(x.d)) note.push(String(x.d).length + ' 位');
    html += '<div class="numrow' + (x.off ? ' dead' : '') + (i === flash ? ' new' : '') + '">'
      + '<div class="val"><a href="tel:' + esc(x.d) + '" data-stop="1">' + esc(fmt(x.d)) + '</a>'
      + (isPri ? '<i class="prl">主号</i>' : (note.length ? '<i>' + esc(note.join(' · ')) + '</i>' : '')) + '</div>'
      + (isPri ? '' : '<button class="mini" data-num="up' + i + '">主号</button>')
      + '<button class="mini" data-num="off' + i + '">' + (x.off ? '恢复' : '弃用') + '</button>'
      + '<button class="mini warn" data-num="del' + i + '">删除</button>'
      + '</div>';
  });
  $('#fNums').innerHTML = html;
  if (flash != null) {
    var el = $('#fNums').children[flash];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
}
function setPri(i) {
  draft.nums.forEach(function (x, k) { x.pri = k === i ? 1 : 0; });
  drawNums();
}
$('#fNums').addEventListener('click', function (e) {
  if (e.target.closest('[data-stop]')) { e.stopPropagation(); return; }
  var b = e.target.closest('[data-num]'); if (!b) return;
  var i = parseInt(b.dataset.num.replace(/^[a-z]+/, ''), 10);
  var act = b.dataset.num.replace(/[0-9]/g, '');
  if (act === 'off') { draft.nums[i].off = draft.nums[i].off ? 0 : 1; drawNums(); }
  else if (act === 'up') { setPri(i); }
  else if (act === 'del') {
    ask({ title: '删除号码', text: '确定删除 ' + fmt(draft.nums[i].d) + ' ？', ok: '删除', danger: true })
      .then(function (v) { if (v) { var wasPri = i === priOf({ nums: draft.nums }); draft.nums.splice(i, 1); if (wasPri && draft.nums.length) draft.nums[0].pri = 1; drawNums(); } });
  }
});
$('#fNew').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#fAdd').click(); } });
$('#fAdd').addEventListener('click', function () {
  var d = digits($('#fNew').value);
  if (d.length < 5) { toast('号码太短，请检查'); return; }
  if (draft.nums.some(function (x) { return x.d === d; })) { toast('这个号码已经在名单里了'); return; }
  draft.nums.push({ d: d, off: 0, pri: draft.nums.length ? 0 : 1 });
  $('#fNew').value = '';
  drawNums(draft.nums.length - 1);
});
$('#fSave').addEventListener('click', function () {
  var name = $('#fName').value.trim();
  if (!name) { toast('请填写姓名'); $('#fName').focus(); return; }
  if (!draft.nums.length) { toast('至少添加一个号码'); $('#fNew').focus(); return; }
  var same = DB.people.filter(function (p) { return p.n === name && p.id !== draft.id; });
  var go = same.length
    ? ask({ title: '本机已有同名的人', text: '已有一条「' + name + '」' + (same.length > 1 ? '等 ' + same.length + ' 条' : '')
        + '。同一个人建议去那条记录里加号；确实是不同的人就继续保存。', ok: '继续保存', cancel: '取消' })
    : Promise.resolve(true);
  go.then(function (v) {
    if (!v) return;
    var idx = -1;
    DB.people.forEach(function (p, i) { if (p.id === draft.id) idx = i; });
    var had = idx >= 0 ? DB.people[idx].nums.map(function (x) { return x.d; }) : [];
    var nums = draft.nums.map(function (x) { return { d: x.d, off: x.off ? 1 : 0, pri: x.pri ? 1 : 0 }; });
    if (!nums.some(function (x) { return x.pri; })) nums[0].pri = 1;
    var rec = { id: draft.id, n: name, nums: nums };
    if (idx >= 0) DB.people[idx] = rec; else DB.people.push(rec);
    K[rec.id] = keysOf(rec);
    save();
    focusId = rec.id;
    focusNums = rec.nums.map(function (x) { return x.d; }).filter(function (d) { return had.indexOf(d) < 0; });
    closeSheets();
    render();
    if (!revealCard(rec.id)) { $('#q').value = ''; render(); revealCard(rec.id); }
    toast(idx >= 0 ? '已保存' : '已新增 ' + name);
  });
});
$('#fDel').addEventListener('click', function () {
  var p = DB.people.filter(function (x) { return x.id === draft.id; })[0];
  if (!p) { closeSheets(); return; }
  ask({ title: '删除联系人', text: '确定删除「' + p.n + '」和它的 ' + p.nums.length + ' 个号码？', ok: '删除', danger: true })
    .then(function (v) {
      if (!v) return;
      DB.people = DB.people.filter(function (x) { return x.id !== p.id; });
      delete K[p.id];
      save(); closeSheets(); render();
      toast('已删除 ' + p.n);
    });
});

/* ================= 列表交互 ================= */
$('#list').addEventListener('click', function (e) {
  if (e.target.closest('[data-dial]')) return;
  var a = e.target.closest('[data-act]');
  if (a) {
    if (a.dataset.act === 'impfile') importFile('merge');
    else if (a.dataset.act === 'imppaste') openPaste();
    return;
  }
  var card = e.target.closest('.card');
  if (card) openEdit(card.dataset.id);
});
/* 顶栏统计行：点“N 个号码位数不对”就跳过去，再点跳下一个，逐个核对 */
var badIdx = -1;
$('.stat').addEventListener('click', function (e) {
  var a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'bad') jumpBad();
});
function jumpBad() {
  var bs = badList();
  if (!bs.length) { badIdx = -1; toast('已经没有位数异常的号码了'); return; }
  badIdx = (badIdx + 1) % bs.length;
  var t = bs[badIdx];
  if ($('#q').value) $('#q').value = '';                        // 搜索状态下目标可能被筛掉，先回到完整列表
  focusId = t.id; focusNums = [t.d];
  render(true);
  if (!revealNum(t.id, t.d)) {
    focusId = null; focusNums = []; badIdx = -1; render();
    toast('没找到这条记录，可能已经被删掉了');
    return;
  }
  toast('问题号码 ' + (badIdx + 1) + '/' + bs.length + '：' + t.n + '　' + t.d + '（' + t.d.length + ' 位，应为 11 位）');
}
/* 索引条：整条按 Y 坐标判定字母，支持按住上下滑动实时跟随。
   定位不能用 offsetTop / scrollIntoView —— 分组标题是吸顶的，一旦被“钉住”，
   它的 offsetTop 和 rect 都带上了吸顶位移，算出来的目标会越跳越偏。
   所以拿它下面第一张卡片（不吸顶、坐标可信）反推：卡片流内位置 - 吸顶高 - 分组标题高。 */
function railButtons() { return $$('#rail button'); }
function railAt(clientY) {
  var bs = railButtons(); if (!bs.length) return null;
  var top = bs[0].getBoundingClientRect().top;
  var bottom = bs[bs.length - 1].getBoundingClientRect().bottom;
  var slot = (bottom - top) / bs.length;
  var i = Math.floor((clientY - top) / slot);
  return bs[Math.max(0, Math.min(bs.length - 1, i))];
}
function flowTop(el) { return el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop); }
function railJump(btn, live) {
  if (!btn) return;
  railButtons().forEach(function (b) { b.classList.remove('hot'); });
  if (btn.classList.contains('off')) {
    if (live === 'down') toast('没有 ' + btn.dataset.l + ' 开头的联系人');
    return;
  }
  btn.classList.add('hot');
  var grp = document.getElementById('L-' + btn.dataset.l);
  if (!grp) return;
  var stick = $('header').offsetHeight;
  var card = grp.nextElementSibling;
  var y = card ? flowTop(card) - stick - grp.offsetHeight : flowTop(grp) - stick;
  window.scrollTo(0, Math.max(0, y));
}
var railEl = $('#rail'), railDrag = false, railT;
railEl.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  railDrag = true;
  try { railEl.setPointerCapture(e.pointerId); } catch (_) {}
  railJump(railAt(e.clientY), 'down');
  e.preventDefault();
});
railEl.addEventListener('pointermove', function (e) { if (railDrag) { railJump(railAt(e.clientY), 'move'); e.preventDefault(); } });
function railEnd() {
  if (!railDrag) return;
  railDrag = false;
  clearTimeout(railT);
  railT = setTimeout(function () { railButtons().forEach(function (b) { b.classList.remove('hot'); }); }, 500);
}
railEl.addEventListener('pointerup', railEnd);
railEl.addEventListener('pointercancel', railEnd);
railEl.addEventListener('lostpointercapture', railEnd);
var t1;
$('#q').addEventListener('input', function () { clearTimeout(t1); t1 = setTimeout(render, 90); });
$('#clear').addEventListener('click', function () { $('#q').value = ''; $('#q').focus(); render(); });
$('#addBtn').addEventListener('click', function () { openEdit(null); });
/* ＋ 挪进顶栏后搜索框被挤窄，窄屏上占位文案会被截成半句。
   量一下当前字体放不放得下，放不下就用短版（拼音照样能搜，只是不写进提示） */
var PH_LONG = '搜索姓名 / 拼音 / 手机号', PH_SHORT = '搜索姓名 / 手机号';
var phCtx = document.createElement('canvas').getContext('2d');
function fitPlaceholder() {
  var el = $('#q'), st = getComputedStyle(el);
  phCtx.font = st.font;
  var avail = el.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight) - 2;
  el.placeholder = phCtx.measureText(PH_LONG).width <= avail ? PH_LONG : PH_SHORT;
}
fitPlaceholder();
window.addEventListener('resize', fitPlaceholder);
$('#mask').addEventListener('click', closeSheets);
document.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheets(); });
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeSheets(); $('#dlg').classList.remove('on'); }
  if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
});

/* ================= 设置菜单 ================= */
function stats() {
  var s = { people: DB.people.length, nums: 0, off: 0, bad: 0, multi: 0, added: 0 };
  DB.people.forEach(function (p) {
    s.nums += p.nums.length;
    if (p.nums.length > 1) s.multi++;
    if (String(p.id).charAt(0) === 'u') s.added++;
    p.nums.forEach(function (x) { if (x.off) s.off++; if (!ok11(x.d)) s.bad++; });
  });
  return s;
}
function openMenu() {
  var s = stats();
  var install = STATUS.standalone
    ? '<div class="it" data-act="howto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span>已是桌面应用</span><em>看安装说明</em></div>'
    : deferred
    ? '<div class="it" data-act="install"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v11M8 11l4 4 4-4M4 20h16"/></svg><span>立即安装到桌面</span><em>浏览器支持一键安装</em></div>'
    : '<div class="it" data-act="howto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span>怎么安装到桌面</span><em>' + (STATUS.secure ? '走浏览器菜单' : '得先有 HTTPS') + '</em></div>';

  $('#menuBody').innerHTML =
      '<div class="hint" style="margin:0 0 12px"><b>' + s.people + ' 人 · ' + s.nums + ' 个号码</b>'
    + '　数据只存在这台手机里'
    + (s.off ? '，' + s.off + ' 个已弃用' : '')
    + (s.bad ? '，' + s.bad + ' 个号码位数不对' : '') + '</div>'
    + install
    + '<div class="hint" id="stLine" style="margin:-2px 0 12px">' + esc(statusLine()) + '</div>'
    + '<div class="it" data-act="impfile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12V2M8 6l4-4 4 4M4 20h16"/></svg><span>导入名单（JSON 文件）</span><em>' + (s.people ? '合并进本机' : '本机还是空的') + '</em></div>'
    + '<div class="it" data-act="impaste"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/></svg><span>粘贴名单（从 Excel 复制）</span><em>姓名 + 号码</em></div>'
    + '<div class="it" data-act="export"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v11M8 11l4 4 4-4M4 20h16"/></svg><span>导出备份（JSON）</span><em>' + s.people + ' 人</em></div>'
    + '<div class="it" data-act="theme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13A8 8 0 1 1 11 4a6 6 0 0 0 9 9z"/></svg><span>深色模式</span><em>' + (ui.theme === 'dark' ? '开' : '关') + '</em></div>'
    + '<div class="it dgr" data-act="replace"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12V2M8 6l4-4 4 4M4 20h16"/></svg><span>导入名单并替换本机</span><em>丢弃本机改动</em></div>'
    + '<div class="it dgr" data-act="wipe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg><span>清空本机全部数据</span><em>不可恢复</em></div>';
  showSheet($('#shMenu'));
  /* 缓存数量要等 Service Worker 回话，先出面板再就地补这一行 */
  refreshStatus(function () { var el = $('#stLine'); if (el) el.textContent = statusLine(); });
}
$('#openMenu').addEventListener('click', openMenu);
$('#menuBody').addEventListener('click', function (e) {
  var it = e.target.closest('[data-act]'); if (!it) return;
  var a = it.dataset.act;
  if (a === 'theme') { ui.theme = ui.theme === 'dark' ? 'light' : 'dark'; saveUI(); applyTheme(); openMenu(); }
  else if (a === 'install') { doInstall(); }
  else if (a === 'howto') { closeSheets(); showHowTo(); }
  else if (a === 'export') { doExport(); }
  else if (a === 'impfile') { importFile('merge'); }
  else if (a === 'replace') { importFile('replace'); }
  else if (a === 'impaste') { closeSheets(); openPaste(); }
  else if (a === 'wipe') { doWipe(); }
});
$('#file').addEventListener('change', function () {
  var f = this.files && this.files[0];
  this.value = '';
  if (f) readFile(f, pendingMode);
});

/* ================= 导出 / 导入名单 ================= */
function doExport() {
  var n = new Date(), z = function (v) { return (v < 10 ? '0' : '') + v; };
  var name = '户主电话簿备份-' + n.getFullYear() + z(n.getMonth() + 1) + z(n.getDate()) + '-' + z(n.getHours()) + z(n.getMinutes()) + '.json';
  try {
    var blob = new Blob([JSON.stringify({ v: 1, app: 'huzhu-phonebook', exportedAt: Date.now(), people: DB.people }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('已导出：' + name);
  } catch (err) { toast('导出失败：' + err.message); }
}
/* 备份文件里的记录规整成内部结构：号码只留数字，同一人内去重，保证至少有一个主号。
   nums 既接受 [{d,off,pri}]，也接受 ['138...'] 这种裸号码数组。 */
function normPeople(list) {
  var out = [];
  if (!Array.isArray(list)) return out;
  list.forEach(function (p) {
    if (!p || !p.n || !Array.isArray(p.nums)) return;
    var name = String(p.n).trim();
    if (!name) return;
    var nums = [];
    p.nums.forEach(function (x) {
      var raw = (x && x.d !== undefined && x.d !== null) ? x.d : x;
      var d = digits(raw);
      if (!d || nums.some(function (y) { return y.d === d; })) return;
      nums.push({ d: d, off: x && x.off ? 1 : 0, pri: x && x.pri ? 1 : 0 });
    });
    if (!nums.length) return;
    if (!nums.some(function (y) { return y.pri; })) nums[0].pri = 1;
    out.push({ id: p.id || newId(), n: name, nums: nums });
  });
  return out;
}
function countNums(recs) {
  var n = 0;
  recs.forEach(function (p) { n += p.nums.length; });
  return n;
}

/* 纯文本名单：一行一条“姓名 号码”、从 Excel 框选复制的制表符网格、顿号逗号分隔都吃得下。
   规则：非数字段当姓名，紧跟的数字段就是它的号码；连着两个数字段说明号码被空格切开了（138 0000 0000），并回上一条。 */
var LABEL = /^(姓名|名字|户主|电话|电话号|电话号码|手机号|手机号码|号码|联系方式|联系人|手机|名称|序号|编号|name|phone|tel|mobile|number)$/i;
function parsePairs(text) {
  var toks = String(text).replace(/\r/g, '\n').split(/[\s,;、|]+/);
  var out = [], pend = '', prevNum = false, skipped = 0;
  for (var i = 0; i < toks.length; i++) {
    var t = toks[i];
    if (!t) continue;
    if (/^[+\d][\d\-()]*$/.test(t)) {
      var d = digits(t);
      if (!d) continue;
      if (pend) { out.push({ n: pend, d: d }); pend = ''; }
      else if (prevNum && out.length && out[out.length - 1].d.length < 11) out[out.length - 1].d += d;
      else skipped++;
      prevNum = true;
      continue;
    }
    var lab = t.replace(/[^\u4e00-\u9fa5A-Za-z]/g, '');
    if (lab && LABEL.test(lab)) { pend = ''; prevNum = false; continue; }   // 表头之类的标签词不当姓名
    pend = t;
    prevNum = false;
  }
  return { list: out, skipped: skipped };
}
function pairsToPeople(pairs) {
  var seen = {}, out = [];
  pairs.forEach(function (o) {
    if (!o.n || !o.d) return;
    var k = o.n + '@' + o.d;
    if (seen[k]) return;
    seen[k] = 1;
    out.push({ id: newId(), n: o.n, nums: [{ d: o.d, off: 0, pri: 1 }] });
  });
  return out;
}

/* 合并导入按“姓名+号码”判重：完全相同的跳过；同名不同号码各算一条——
   名单里本来就有同名不同人（刘军×2、张斌×2、王国栋×2），自动并到一起会认错人。 */
function mergeIn(recs) {
  var seen = {}, addP = 0, addN = 0, dup = 0;
  DB.people.forEach(function (p) { p.nums.forEach(function (x) { seen[p.n + '@' + x.d] = 1; }); });
  recs.forEach(function (r) {
    var fresh = [];
    r.nums.forEach(function (x) {
      var k = r.n + '@' + x.d;
      if (seen[k]) { dup++; return; }
      seen[k] = 1;
      fresh.push({ d: x.d, off: x.off ? 1 : 0, pri: x.pri ? 1 : 0 });
    });
    if (!fresh.length) return;
    if (!fresh.some(function (x) { return x.pri; })) fresh[0].pri = 1;
    DB.people.push({ id: r.id || newId(), n: r.n, nums: fresh });
    addP++; addN += fresh.length;
  });
  return { people: addP, nums: addN, dup: dup };
}
/* 导入的文件里可能带 id（备份就是），两次导入或手工改过就可能撞号；
   id 只当本机句柄用，撞了会导致“点姓名进错人”，所以统一重排一遍。 */
function uniqueIds() {
  var seen = {};
  DB.people.forEach(function (p) {
    if (!p.id || seen[p.id]) p.id = newId();
    seen[p.id] = 1;
  });
}
function finishImport(recs, mode) {
  var res;
  if (mode === 'replace') {
    DB = { v: 1, people: recs };
    res = { people: recs.length, nums: countNums(recs), dup: 0 };
  } else {
    res = mergeIn(recs);
  }
  uniqueIds();
  keysAll(); save(); closeSheets();
  $('#q').value = '';            // 导完先回到完整列表，别让人以为只导进了一条
  render();
  var s = stats();
  if (!res.people && mode !== 'replace') { toast('没有新内容：这些记录和本机完全一样'); return; }
  toast('已导入 ' + res.people + ' 人 / ' + res.nums + ' 个号码'
    + (mode === 'replace' ? '（本机名单已替换）' : res.dup ? '，' + res.dup + ' 条重复跳过' : ''));
  if (s.bad) setTimeout(function () { toast('有 ' + s.bad + ' 个号码位数不对，点顶部那行可逐个核对'); }, 2400);
}
function badNote(recs) {
  var n = 0;
  recs.forEach(function (p) { p.nums.forEach(function (x) { if (!ok11(x.d)) n++; }); });
  return n;
}
function confirmThen(recs, mode) {
  var nums = countNums(recs), bad = badNote(recs);
  if (!DB.people.length) return finishImport(recs, mode);      // 本机是空的，没什么可确认
  if (mode === 'replace') {
    ask({ title: '导入会替换本机名单', danger: true, ok: '替换导入',
      text: '这份名单有 ' + recs.length + ' 人 / ' + nums + ' 个号码。本机现有 ' + DB.people.length
        + ' 人和所有改动（加号、弃用、改名）会被整体替换，不可恢复。'
        + (bad ? '名单里有 ' + bad + ' 个号码位数不对，导入后会标出来。' : '')
    }).then(function (v) { if (v) finishImport(recs, 'replace'); });
    return;
  }
  ask({ title: '导入名单', ok: '合并进本机',
    text: '这份名单有 ' + recs.length + ' 人 / ' + nums + ' 个号码。同名同号码的重复会自动跳过，其余作为新记录加到本机现有的 '
      + DB.people.length + ' 人里。想整个换一份，就用“导入名单并替换本机”。'
      + (bad ? '其中有 ' + bad + ' 个号码位数不对，导入后会标出来。' : '')
  }).then(function (v) { if (v) finishImport(recs, 'merge'); });
}

var pendingMode = 'merge';
function importFile(mode) { pendingMode = mode; $('#file').click(); }
function readFile(file, mode) {
  var fr = new FileReader();
  fr.onload = function () {
    var txt = String(fr.result || '');
    if (/^\s*[{[]/.test(txt)) {
      var d;
      try { d = JSON.parse(txt); } catch (e) { noData('这个 JSON 文件读不出联系人：格式不对或已损坏。'); return; }
      var recs = normPeople(Array.isArray(d) ? d : d && d.people);
      if (!recs.length) { noData('文件里没有找到“姓名 + 号码”结构的联系人。'); return; }
      confirmThen(recs, mode);
      return;
    }
    /* 也允许直接选 .txt / CSV：按文本名单解析，和“粘贴名单”同一套规则 */
    var p = parsePairs(txt), pr = pairsToPeople(p.list);
    if (!pr.length) { noData('这个文件里没识别出“姓名 + 号码”。TXT 请一行一条写“张三 13800000000”，或改用 JSON 备份。'); return; }
    confirmThen(pr, mode);
  };
  fr.onerror = function () { noData('读取文件失败，换个文件再试。'); };
  fr.readAsText(file);
}
function noData(msg) {
  ask({ title: '导入失败', text: msg, ok: '知道了', hideCancel: true });
}

/* ================= 清空本机数据 ================= */
function doWipe() {
  if (!DB.people.length) { toast('本机已经是空的'); return; }
  ask({ title: '清空本机全部数据', danger: true, ok: '确定清空',
    text: '本机现有 ' + DB.people.length + ' 人 / ' + countNums(DB.people) + ' 个号码，清空后不会自动恢复，只能重新导入名单。'
      + '建议先点“导出备份”存一份。'
  }).then(function (v) {
    if (!v) return;
    DB = { v: 1, people: [] }; K = {}; save(); closeSheets(); render();
    toast('本机数据已清空');
  });
}

/* ================= 粘贴名单 ================= */
function openPaste() {
  $('#pasteTxt').value = '';
  $('#pasteGo').disabled = false;
  pasteHint();
  showSheet($('#shPaste'));
  setTimeout(function () { $('#pasteTxt').focus(); }, 260);
}
function pasteHint() {
  var p = parsePairs($('#pasteTxt').value);
  if (DB.people.length) {
    $('#pasteMode').textContent = '合并进本机（现有 ' + DB.people.length + ' 人）';
  } else {
    $('#pasteMode').textContent = '本机是空的，直接导入';
  }
  if (!p.list.length) {
    $('#pasteHint').innerHTML = '粘贴后自动统计。支持一行一条“张三 13800000000”，也支持从 Excel 直接框选复制的表格（制表符分隔，一行好几个姓名号码都对得上）。';
    return;
  }
  var u = pairsToPeople(p.list);
  $('#pasteHint').innerHTML = '已识别 <b>' + p.list.length + '</b> 条姓名号码（去重后 <b>' + u.length + '</b> 人）'
    + (p.skipped ? '，另有 ' + p.skipped + ' 段号码没配上姓名，已忽略' : '')
    + '。同名不同号码会各算一条，不去合并——名单里本来就有同名不同人。';
}
$('#pasteTxt').addEventListener('input', pasteHint);
$('#pasteGo').addEventListener('click', function () {
  var p = parsePairs($('#pasteTxt').value);
  var recs = pairsToPeople(p.list);
  if (!recs.length) { toast('没识别出“姓名 + 号码”，检查一下格式'); return; }
  confirmThen(recs, 'merge');
});

/* ================= 安装到手机桌面 ================= */
var deferred = null;
function isStandalone() {
  try { if (window.matchMedia('(display-mode: standalone)').matches) return true; } catch (e) {}
  if (navigator.standalone === true) return true;
  return document.referrer.indexOf('android-app://') === 0;
}
function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }

/* 本机能力快照：不猜，直接从浏览器要答案，设置里那行状态就是这个对象的输出 */
var STATUS = { secure: !!window.isSecureContext, swApi: ('serviceWorker' in navigator), swOn: false, files: 0, prompt: false, standalone: false };
/* 数离线缓存里的文件数。全局 caches 各家内核都有，registration.caches 反而不少版本没实现，所以优先前者 */
function cacheCount() {
  var keysP = null;
  try { if (window.caches && typeof caches.keys === 'function') keysP = caches.keys(); } catch (e) { keysP = null; }
  if (!keysP) {
    if (!navigator.serviceWorker.getRegistration) return Promise.resolve(0);
    keysP = navigator.serviceWorker.getRegistration().then(function (r) { return (r && r.caches && r.caches.keys) ? r.caches.keys() : []; });
  }
  return keysP.then(function (ks) {
    ks = (ks || []).filter(function (k) { return k.indexOf('huzhu-phonebook-') === 0; });
    if (!ks.length) return 0;
    var last = ks[ks.length - 1], openP = null;
    try { if (window.caches && caches.open) openP = caches.open(last); } catch (e) { openP = null; }
    if (!openP) return 0;
    return openP.then(function (c) { return c.keys(); }).then(function (list) { return list ? list.length : 0; });
  }).catch(function () { return 0; });
}
function refreshStatus(cb) {
  STATUS.prompt = !!deferred;
  STATUS.standalone = isStandalone();
  if (!STATUS.swApi || !navigator.serviceWorker.getRegistration) { if (cb) cb(STATUS); return Promise.resolve(STATUS); }
  var p = navigator.serviceWorker.getRegistration().then(function (r) {
    STATUS.swOn = !!(r && (r.active || r.installing || r.waiting));
    return cacheCount();
  }).then(function (n) { STATUS.files = n || 0; }).catch(function () {}).then(function () { if (cb) cb(STATUS); return STATUS; });
  return p;
}
function statusLine() {
  var off = !STATUS.swApi ? '浏览器未提供' : (STATUS.swOn ? (STATUS.files ? '已缓存 ' + STATUS.files + ' 个文件' : '已注册，缓存里还没东西') : '未注册');
  var go = STATUS.standalone ? '已作为应用运行' : (STATUS.prompt ? '可一键安装' : '无一键入口，用浏览器菜单添加');
  return '安全上下文：' + (STATUS.secure ? 'HTTPS 可用' : '不可用（当前不是 https）')
    + '　离线：' + off + '　安装：' + go;
}

/* 横幅只在浏览器真给了「一键安装」入口时才出现（deferred 有值）。
   OPPO / 华为这类没实现 beforeinstallprompt 的浏览器从此不再占屏幕底部，想装的人去设置里看教程 */
function showBanner() { $('#banner').classList.add('on'); document.body.classList.add('hasBanner'); }
function hideBanner() { $('#banner').classList.remove('on'); document.body.classList.remove('hasBanner'); }
function refreshBanner() { if (deferred && !flags.bannerNo && !STATUS.standalone) showBanner(); else hideBanner(); }
function showHowTo() {
  var ios = isIOS();
  ask({
    title: '装到手机桌面',
    html: '<ol class="steps">'
      + '<li>用系统浏览器打开本页，微信、QQ 里没有这个菜单</li>'
      + '<li>' + (ios ? '点底部「分享」→「添加到主屏幕」' : '点菜单「⋮」→「添加到主屏幕」或「安装应用」，各家叫法不一样') + '</li>'
      + '<li>桌面出现「电话簿」图标，全屏打开、断网也能用</li>'
      + '</ol>'
      + '<p style="margin:12px 0 0;font-size:12.5px">' + esc(statusLine()) + '</p>',
    ok: deferred ? '直接安装' : '知道了', hideCancel: true
  }).then(function (v) { if (v && deferred) doInstall(); });
}
function doInstall() {
  if (!deferred) { showHowTo(); return; }
  deferred.prompt();
  if (deferred.userChoice) {
    deferred.userChoice.then(function (r) {
      if (r && r.outcome === 'accepted') { hideBanner(); setFlag('bannerNo', 1); toast('已安装，去桌面找“电话簿”'); }
      else { setFlag('bannerNo', 1); hideBanner(); toast('没装也没事，设置里随时能再来'); }
      deferred = null;
      refreshStatus();
    });
  }
}
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferred = e;
  refreshStatus(function () { refreshBanner(); });
});
window.addEventListener('appinstalled', function () {
  hideBanner(); setFlag('installed', 1); deferred = null; toast('已安装到桌面');
  refreshStatus(function () { $('#menuBody').innerHTML && openMenu(); });
});
$('#bannerGo').addEventListener('click', doInstall);
$('#bannerNo').addEventListener('click', function () { setFlag('bannerNo', 1); hideBanner(); });

/* ================= Service Worker ================= */
function registerSW() {
  if (!('serviceWorker' in navigator)) { setFlag('noSW', '浏览器未提供离线接口'); return; }
  if (!/^https?:$/.test(location.protocol)) { setFlag('noSW', '本地文件方式打开，无法启用离线'); return; }
  navigator.serviceWorker.register('sw.js')
    .then(function () { refreshStatus(); })
    .catch(function (err) { setFlag('noSW', err.message); refreshStatus(); });
}

/* ================= 桌面快捷方式入口：?action=add ================= */
var pendingAction = '';
var pendingTries = 0;
try { pendingAction = (new URLSearchParams(location.search).get('action') || '').toLowerCase(); } catch (e) {}
function runPendingAction() {
  if (!pendingAction) return;
  if (($('#dlg').classList.contains('on') || openSheet) && pendingTries++ < 60) { setTimeout(runPendingAction, 500); return; }
  if (pendingTries >= 60) { pendingAction = ''; return; }
  var a = pendingAction; pendingAction = '';
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (a === 'add') { openEdit(null); }
}

/* ================= 启动 ================= */
applyTheme();
load();
render();
setSticky();
window.addEventListener('resize', setSticky);
window.addEventListener('load', setSticky);
registerSW();
/* 安装横幅只在拿到一键安装入口时才出现，而它是异步到达的，所以浏览器回话后再刷一次 */
refreshStatus(function () { refreshBanner(); });
setTimeout(function () { refreshStatus(function () { refreshBanner(); }); }, 2200);
if ('serviceWorker' in navigator && navigator.serviceWorker.addEventListener) {
  try { navigator.serviceWorker.addEventListener('controllerchange', function () { refreshStatus(); }); } catch (e) {}
}
runPendingAction();
})();
