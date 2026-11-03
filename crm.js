/* NEWTON CRM pages — Today · Pipeline · Contacts · Tasks · Activity. Talks to Supabase with Issac's login.
   The anon key below is public by design: row-level security lets only crm_users read or write. */
const CRM_CFG = {
  url: 'https://veuferyylpblpcoogzly.supabase.co',      // https://<ref>.supabase.co   ← set at deploy (scripts/issac/crm/deploy.py)
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZldWZlcnl5bHBibHBjb29nemx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MjczNzIsImV4cCI6MjEwOTMwMzM3Mn0.EctXlOzAtMQCxXGVbpazfbFT5_Wbnhj4qSN0g5bM-o0',     // anon public key
  book: '',
};

const CRM = (() => {
  let sb = null, pipe = 'seller', stages = {}, kbq = '', actType = '';
  let q = {text: '', type: '', circle: '', stage: '', show: '', sort: 'reply', page: 0};
  const PAGE = 50, LATE_H = 2, STALE_D = 7;
  const name = c => c ? c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email : '';
  const hrs = iso => iso ? (Date.now() - new Date(iso)) / 36e5 : null;
  const wait = h => h == null ? '—' : h < 1 ? Math.max(1, Math.round(h * 60)) + 'm' : h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd';
  const when = iso => new Date(iso).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
  const dayKey = d => new Date(d).toLocaleDateString('en-CA');
  const isToday = iso => iso && dayKey(iso) === dayKey(Date.now());
  const localInput = iso => { if (!iso) return ''; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) };
  const toIso = v => v ? new Date(v).toISOString() : null;
  const prob = (p, s) => ((stages[p] || []).find(x => x.name === s) || {}).prob || 0;
  const pos = (p, s) => ((stages[p] || []).find(x => x.name === s) || {}).pos || 0;
  const V = () => document.getElementById('crm-v');
  const ACT = {email_in: 'Reply', email_out: 'Sent', note: 'Note', call: 'Call', booking: 'Booking', stage_change: 'Stage', alert: 'Alert', no_show: 'No-show', bounce: 'Bounce'};

  const css = `
#crm .wait{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px;border:1px solid var(--sig);border-radius:14px;background:rgba(228,43,12,.1)}
#crm .wait b{font-weight:500;margin-right:6px}
#crm .wait button{font:12px var(--sans);color:var(--ink);background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:999px;padding:5px 12px;cursor:pointer}
#crm .wait button.late{border-color:var(--sig)}
#crm .wait button:hover{border-color:var(--ink)}
#crm .tb{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
#crm .tb input[type=search]{flex:1;min-width:220px}
#crm .btn{font:12px var(--sans);color:var(--ink2);background:rgba(255,255,255,.04);border:1px solid var(--line2);border-radius:999px;padding:6px 14px;cursor:pointer;text-decoration:none;display:inline-block;white-space:nowrap}
#crm .btn:hover{border-color:var(--ink2);color:var(--ink)}
#crm .btn.pri{background:var(--sig);border-color:var(--sig);color:#fff}
#crm .btn.sm{padding:3px 10px;font-size:11px}
#crm .btn:disabled{opacity:.35;cursor:default}
#crm .seg{display:inline-flex;border:1px solid var(--line2);border-radius:999px;overflow:hidden}
#crm .seg button{font:12px var(--sans);color:var(--ink2);background:none;border:0;padding:6px 14px;cursor:pointer}
#crm .seg button.on{background:var(--sig);color:#fff}
#crm input,#crm select,#crm textarea{font:12.5px var(--sans);color:var(--ink);background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:10px;padding:7px 10px}
#crm input:focus,#crm select:focus,#crm textarea:focus{outline:none;border-color:var(--sig)}
#crm textarea{width:100%;min-height:70px;resize:vertical}
#crm .hint{color:var(--mute);font-size:12px}
#crm .row{display:grid;grid-template-columns:1.4fr 1.2fr .8fr .5fr 1fr .7fr;gap:10px;padding:10px 8px;border-bottom:1px solid var(--line);cursor:pointer;align-items:center;font-size:13px}
#crm .row:hover{background:rgba(255,255,255,.035)}
#crm .row.h{color:var(--mute);font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;cursor:default}
#crm .row.h:hover{background:none}
#crm .row small{display:block;color:var(--mute);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#crm .row>div{min-width:0}
#crm .late{color:var(--err);font-weight:600}
#crm .ok{color:var(--ok)}
#crm .tag{display:inline-block;font:9.5px var(--mono);padding:1px 7px;border-radius:999px;border:1px solid var(--line2);color:var(--ink2);margin:0 4px 2px 0}
#crm .tag.hot{border-color:var(--sig);color:var(--amber)}
#crm .tag.cold{color:var(--dim)}
#crm .chk{width:16px;height:16px;accent-color:var(--sig);cursor:pointer}
#crm .kb{display:flex;gap:10px;overflow-x:auto;padding-bottom:10px}
#crm .kcol{flex:0 0 220px;background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:14px;padding:10px;min-height:340px;transition:border-color .15s}
#crm .kcol.over{border-color:var(--sig);background:rgba(228,43,12,.06)}
#crm .kcol h4{font:10px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin-bottom:2px;display:flex;justify-content:space-between;gap:6px}
#crm .kcol h4 b{color:var(--ink);font-weight:500}
#crm .kcol .cv{font:10px var(--mono);color:var(--dim);margin-bottom:9px;height:13px}
#crm .card{background:rgba(0,0,0,.4);border:1px solid var(--line2);border-radius:10px;padding:9px 10px;margin-bottom:7px;cursor:grab;font-size:12.5px}
#crm .card:hover{border-color:var(--ink2)}
#crm .card.lost{opacity:.45}
#crm .card b{display:block;font-weight:500}
#crm .card small{color:var(--mute);display:block}
#crm .card .meta{display:flex;justify-content:space-between;margin-top:6px;font:10px var(--mono);color:var(--mute)}
#crm .grp{font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:16px 0 6px;display:flex;justify-content:space-between}
#crm .grp:first-child{margin-top:0}
#crm .chips{display:flex;gap:6px;flex-wrap:wrap}
#crm .chips button{font:11px var(--mono);color:var(--ink2);background:none;border:1px solid var(--line2);border-radius:999px;padding:4px 11px;cursor:pointer}
#crm .chips button.on{border-color:var(--sig);color:var(--ink);background:rgba(228,43,12,.12)}
#crm .shade{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:49;backdrop-filter:blur(2px)}
#crm .drawer{position:fixed;top:0;right:0;bottom:0;width:min(600px,100vw);background:#0d0c0c;border-left:1px solid var(--line2);z-index:50;overflow-y:auto;padding:22px 24px 40px;box-shadow:-30px 0 60px rgba(0,0,0,.5);animation:crmin .18s ease-out}
@keyframes crmin{from{transform:translateX(30px);opacity:0}}
#crm .drawer h2{font-weight:500;font-size:21px;margin-bottom:2px}
#crm .drawer h5{font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:20px 0 8px}
#crm .box{border:1px solid var(--line2);border-radius:12px;padding:12px;background:rgba(255,255,255,.02)}
#crm .fg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#crm .fg label{font:9.5px var(--mono);color:var(--mute);text-transform:uppercase;letter-spacing:.06em;display:flex;flex-direction:column;gap:4px}
#crm .fg label.w{grid-column:span 2}
#crm .dkv{display:grid;grid-template-columns:130px 1fr;gap:5px 10px;font-size:12.5px}#crm .dkv span{color:var(--mute)}
#crm .dkv a{color:var(--ink)}
#crm .act{border-left:2px solid var(--line2);padding:4px 0 12px 12px;margin-left:4px}
#crm .act.email_in{border-color:var(--sig)}#crm .act.booking{border-color:var(--ok)}#crm .act.stage_change{border-color:var(--amber)}#crm .act.no_show,#crm .act.bounce{border-color:var(--err)}
#crm .act i{font:9.5px var(--mono);color:var(--mute);font-style:normal}
#crm .act p{white-space:pre-wrap;font-size:12.5px;color:var(--ink2);margin-top:3px;overflow-wrap:anywhere}
#crm .act p.clip{max-height:160px;overflow:hidden;cursor:pointer;-webkit-mask-image:linear-gradient(#000 70%,transparent)}
#crm .login{max-width:380px;margin:60px auto;text-align:center}
#crm .login input{width:100%;margin:10px 0 0}
#crm .flash{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#1a1817;border:1px solid var(--line2);border-radius:999px;padding:8px 18px;font-size:12.5px;z-index:60}
@media(max-width:760px){#crm .row{grid-template-columns:1fr 1fr}#crm .row>:nth-child(n+3){display:none}#crm .fg{grid-template-columns:1fr}#crm .fg label.w{grid-column:auto}}`;

  /* ---------- shell ---------- */
  function page(v) {
    return {html: `<style>${css}</style><div id="crm" data-v="${v}"><div id="crm-v"><div class="hint">Loading…</div></div></div>`, draw};
  }

  async function draw() {
    const root = document.getElementById('crm');
    if (!root || root.dataset.drawn) return;   // resize re-calls draw: keep the page (and an open contact) as is
    root.dataset.drawn = 1;
    if (!await ready()) return;
    VIEWS[root.dataset.v]();
  }

  async function ready() {
    const v = V();
    if (!CRM_CFG.url || !CRM_CFG.anon) { v.innerHTML = empty('CRM not connected yet'); return false }
    if (!sb) sb = window.supabase.createClient(CRM_CFG.url, CRM_CFG.anon);
    let {data: {session}} = await sb.auth.getSession();
    if (!session && typeof D !== 'undefined' && D && D.crm_login) {
      const {data, error} = await sb.auth.signInWithPassword(D.crm_login);  // the site password already let him in
      if (!error) session = data.session;
    }
    if (!session) { login(v); return false }
    if (!Object.keys(stages).length) {
      const {data, error} = await sb.from('stages').select('*').order('pos');
      if (error || !data.length) { v.innerHTML = empty('This login has no access to the CRM', session.user.email); return false }
      data.forEach(s => (stages[s.pipeline] ||= []).push(s));
    }
    return true;
  }

  // Fallback only: normally the site password signs him in (D.crm_login).
  function login(v) {
    v.innerHTML = `<form class="glass panel login" action="javascript:void 0"><h3>Sign in to your CRM</h3><p class="hint">Once per device. You stay signed in.</p>
      <input type="email" id="crm-em" placeholder="Email" autocomplete="username"><input type="password" id="crm-pw" placeholder="Password" autocomplete="current-password">
      <button class="btn pri" style="margin-top:12px">Sign in</button><div class="hint" id="crm-msg" style="margin-top:8px"></div></form>`;
    v.querySelector('form').onsubmit = async e => {
      e.preventDefault();  // an async handler returns a Promise, which does not stop the native submit + reload
      const {error} = await sb.auth.signInWithPassword({email: v.querySelector('#crm-em').value.trim(), password: v.querySelector('#crm-pw').value});
      if (error) v.querySelector('#crm-msg').textContent = error.message; else { stages = {}; if (await ready()) VIEWS[document.getElementById('crm').dataset.v]() }
    };
  }

  const refresh = () => { const r = document.getElementById('crm'); if (r) VIEWS[r.dataset.v]() };
  const flash = m => { document.querySelector('#crm .flash')?.remove(); const f = document.createElement('div'); f.className = 'flash'; f.textContent = m; document.getElementById('crm')?.appendChild(f); setTimeout(() => f.remove(), 2200) };
  const fail = error => { if (error) { flash(error.message); return true } return false };
  const bindRows = root => root.querySelectorAll('[data-c]').forEach(r => r.addEventListener('click', e => {
    if (r.dataset.c && !e.target.closest('input,button,a,select')) open(r.dataset.c);
  }));
  const taskRow = k => `<div class="row" style="grid-template-columns:22px 1fr auto 22px" data-c="${k.contact_id || ''}">
    <input type="checkbox" class="chk" data-done="${k.id}" ${k.done ? 'checked' : ''}><div style="${k.done ? 'text-decoration:line-through;color:var(--mute)' : ''}">${esc(k.title)}<small>${esc(name(k.contacts))}${k.contacts?.company ? ' · ' + esc(k.contacts.company) : ''}</small></div>
    <div class="${!k.done && k.due_at && hrs(k.due_at) > 0 ? 'late' : 'hint'}">${k.due_at ? (isToday(k.due_at) ? 'Today ' + new Date(k.due_at).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'}) : when(k.due_at)) : ''}</div>
    <button class="btn sm" data-del="${k.id}" title="Delete" style="padding:2px 7px">×</button></div>`;
  const bindTasks = (root, after) => {
    root.querySelectorAll('[data-done]').forEach(cb => cb.onclick = async () => { if (!fail((await sb.from('tasks').update({done: cb.checked}).eq('id', cb.dataset.done)).error)) after() });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!fail((await sb.from('tasks').delete().eq('id', b.dataset.del)).error)) after() });
  };
  // Issac answers from his own Gmail, so the CRM is told by hand: it stops the "waiting" clock
  const markReplied = id => sb.from('activities').insert({contact_id: id, type: 'email_out', body: 'Replied (marked in CRM)', source: 'crm'});

  /* ---------- Today ---------- */
  async function today() {
    const v = V(), now = new Date().toISOString(), wk = new Date(Date.now() - 7 * 864e5).toISOString();
    const [w, t, r, c] = await Promise.all([
      sb.from('v_waiting').select('*'),
      sb.from('tasks').select('*, contacts(id,full_name,first_name,email,company)').eq('done', false).order('due_at', {nullsFirst: false}),
      sb.from('activities').select('at,body,subject,contacts(id,full_name,first_name,email,company)').eq('type', 'email_in').order('at', {ascending: false}).limit(12),
      sb.from('deals').select('id,stage,next_action,next_action_at,contacts(id,full_name,first_name,email,company,phone)').gte('next_action_at', now).order('next_action_at').limit(10),
    ]);
    const waiting = w.data || [], late = waiting.filter(x => x.hours_waiting > LATE_H).length;
    const tasks = t.data || [], due = tasks.filter(k => k.due_at && (hrs(k.due_at) > 0 || isToday(k.due_at)));
    const replies = r.data || [], wkReplies = replies.filter(a => a.at >= wk).length, calls = c.data || [];
    v.innerHTML = `<div class="g">
      <div class="s12 kpis k4">${kpi('Waiting on you', waiting.length, late ? `${late} over ${LATE_H} hours` : 'all answered in time', {accent: late})}${kpi('Due today', due.length, `${tasks.length} open tasks in total`)}${kpi('Coming up', calls.length, 'calls and next steps scheduled')}${kpi('Replies this week', wkReplies, 'owners who wrote back')}</div>
      ${panel({span: 7, title: 'Waiting on your reply', sub: `Oldest first. Red = over ${LATE_H} hours. Tap ✓ once you have answered.`, body: waiting.length ? `<div class="row h" style="grid-template-columns:1.3fr 1.2fr .7fr 1fr auto"><div>Owner</div><div>Business</div><div>Waiting</div><div>Stage</div><div></div></div>` + waiting.map(x =>
        `<div class="row" style="grid-template-columns:1.3fr 1.2fr .7fr 1fr auto" data-c="${x.id}"><div>${esc(name(x))}<small>${esc(x.owner_type || '')}</small></div><div>${esc(x.company || '')}</div><div class="${x.hours_waiting > LATE_H ? 'late' : ''}">${wait(x.hours_waiting)}</div><div>${esc(x.stage || '—')}</div><div><button class="btn sm" data-replied="${x.id}" title="I have replied">✓ Replied</button></div></div>`).join('') : empty('Nobody is waiting on you')})}
      <div class="s5 col">
        ${panel({title: 'Due today', sub: 'Overdue first', body: due.length ? due.map(taskRow).join('') : empty('Nothing due today')})}
        ${panel({title: 'Coming up', sub: 'Next steps with a date', body: calls.length ? calls.map(d => `<div class="row" style="grid-template-columns:1fr auto" data-c="${d.contacts.id}"><div>${esc(name(d.contacts))}<small>${esc(d.next_action || d.stage)}</small></div><div class="hint">${when(d.next_action_at)}</div></div>`).join('') : empty('Nothing scheduled', 'Set a next step on any contact')})}
      </div>
      ${panel({span: 12, title: 'Latest replies', sub: 'What owners wrote back, newest first', body: replies.length ? replies.map(a =>
        `<div class="row" style="grid-template-columns:1fr 1fr 3fr .7fr" data-c="${a.contacts?.id || ''}"><div>${esc(name(a.contacts))}</div><div>${esc(a.contacts?.company || '')}</div><div class="hint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((a.body || a.subject || '').replace(/\s+/g, ' ').slice(0, 180))}</div><div class="hint">${wait(hrs(a.at))} ago</div></div>`).join('') : empty('No replies yet')})}
    </div>`;
    v.querySelectorAll('[data-replied]').forEach(b => b.onclick = async () => { if (!fail((await markReplied(b.dataset.replied)).error)) { flash('Marked as replied'); today() } });
    bindTasks(v, today);
    bindRows(v);
  }

  /* ---------- Pipeline (kanban, drag = stage change) ---------- */
  async function pipeline() {
    const v = V();
    const [{data, error}, {data: waitingRows}] = await Promise.all([
      sb.from('deals').select('id,stage,updated_at,value_estimate,next_action,next_action_at,lost_reason,contacts(id,full_name,first_name,email,company,owner_type,circle)').eq('pipeline', pipe),
      sb.from('v_waiting').select('*'),
    ]);
    if (error) { v.innerHTML = empty(error.message); return }
    const deals = data || [], open = deals.filter(d => !d.lost_reason), by = {};
    deals.forEach(d => (by[d.stage] ||= []).push(d));
    const val = sum(open.map(d => ({v: +d.value_estimate || 0})), 'v'), valued = open.filter(d => +d.value_estimate > 0).length;
    const live = new Set(open.map(d => d.contacts && d.contacts.id)), waiting = (waitingRows || []).filter(x => live.has(x.id));  // open deals only: lost / listed elsewhere never shows
    const booked = open.filter(d => pos(pipe, d.stage) >= 2).length, last = stages[pipe].slice(-2).map(s => s.name), won = open.filter(d => last.includes(d.stage)).length;
    const stale = open.filter(d => hrs(d.updated_at) > STALE_D * 24).length;
    v.innerHTML = `<div class="g">
      <div class="s12 kpis k4">${kpi(pipe === 'seller' ? 'Owners in pipeline' : 'Buyers in pipeline', open.length, `${deals.length - open.length} marked lost`)}${kpi('Property value', val ? money(val) : '—', valued ? `county-appraised · ${valued} of ${open.length} owners` : 'no appraised value yet')}${kpi(pipe === 'seller' ? 'Call booked or further' : 'Qualified or further', booked, pctf(booked, open.length, 0) + ' of the pipeline')}${kpi(pipe === 'seller' ? 'Signed / live' : 'Clear to close / closed', won, stale ? `${stale} untouched for ${STALE_D}+ days` : 'nothing stale', {accent: stale})}</div>
      ${waiting.length ? `<div class="s12 wait"><b>${waiting.length} ${waiting.length === 1 ? 'owner is' : 'owners are'} waiting on your reply</b>${waiting.map(x => `<button data-c="${x.id}" class="${x.hours_waiting > LATE_H ? 'late' : ''}">${esc(name(x))} · ${wait(x.hours_waiting)}</button>`).join('')}</div>` : ''}
      <div class="s12"><div class="tb"><div class="seg"><button data-p="seller" class="${pipe === 'seller' ? 'on' : ''}">Sellers</button><button data-p="buyer" class="${pipe === 'buyer' ? 'on' : ''}">Buyers</button></div>
        <input type="search" id="crm-kq" placeholder="Filter cards by name or business" value="${esc(kbq)}"><span class="hint">Drag a card to move it · tap to open</span></div>
      <div class="kb">${stages[pipe].map(s => { const list = by[s.name] || [], sv = sum(list.map(d => ({v: +d.value_estimate || 0})), 'v');
        return `<div class="kcol" data-stage="${esc(s.name)}"><h4><span>${esc(s.name)}</span><b>${list.length}</b></h4><div class="cv">${sv ? money(sv) : ''}</div>
        ${list.sort((a, b) => !!a.lost_reason - !!b.lost_reason || new Date(b.updated_at) - new Date(a.updated_at)).map(card).join('')}</div>` }).join('')}</div></div></div>`;
    v.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pipe = b.dataset.p; pipeline() });
    v.querySelectorAll('.wait [data-c]').forEach(b => b.onclick = () => open(b.dataset.c));
    const filter = () => v.querySelectorAll('.card').forEach(c => c.style.display = !kbq || c.dataset.s.includes(kbq.toLowerCase()) ? '' : 'none');
    v.querySelector('#crm-kq').oninput = e => { kbq = e.target.value; filter() };
    filter();
    v.querySelectorAll('.card').forEach(c => {
      c.ondragstart = e => { e.dataTransfer.setData('text/plain', c.dataset.deal); e.dataTransfer.setData('from', c.closest('.kcol').dataset.stage) };
      c.onclick = () => open(c.dataset.c);
    });
    v.querySelectorAll('.kcol').forEach(col => {
      col.ondragover = e => { e.preventDefault(); col.classList.add('over') };
      col.ondragleave = () => col.classList.remove('over');
      col.ondrop = async e => {
        e.preventDefault(); col.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain'), card = v.querySelector(`.card[data-deal="${id}"]`);
        if (!card || card.closest('.kcol') === col) return;
        col.appendChild(card);  // move now, confirm after save
        if (!fail((await sb.from('deals').update({stage: col.dataset.stage}).eq('id', id)).error)) flash('Moved to ' + col.dataset.stage);
        pipeline();
      };
    });
  }
  const card = d => { const c = d.contacts || {}, idle = hrs(d.updated_at);
    return `<div class="card ${d.lost_reason ? 'lost' : ''}" draggable="true" data-deal="${d.id}" data-c="${c.id}" data-s="${esc((name(c) + ' ' + (c.company || '')).toLowerCase())}">
      <b>${esc(name(c))}</b><small>${esc(c.company || '')}</small>
      <div style="margin-top:5px">${c.owner_type ? `<span class="tag">${esc(c.owner_type)}</span>` : ''}${d.lost_reason ? '<span class="tag cold">lost</span>' : ''}</div>
      <div class="meta"><span>${d.next_action_at ? '→ ' + when(d.next_action_at) : `<span class="${!d.lost_reason && idle > STALE_D * 24 ? 'late' : ''}">${wait(idle)} here</span>`}</span><span>${d.value_estimate ? money(+d.value_estimate) : ''}</span></div></div>` };

  /* ---------- Contacts ---------- */
  async function contacts() {
    const v = V(), sel = (id, opts, cur, all) => `<select id="${id}"><option value="">${all}</option>${opts.map(([val, lab]) => `<option value="${esc(val)}" ${cur === val ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
    v.innerHTML = `<div class="tb"><input type="search" id="crm-q" placeholder="Search name, business, email, city" value="${esc(q.text)}">
        ${sel('crm-show', [['waiting', 'Waiting on you'], ['replied', 'Replied'], ['pipeline', 'In pipeline'], ['cold', 'Not interested']], q.show, 'Everyone')}
        ${sel('crm-t', ['Both', 'Business', 'Property'].map(x => [x, x]), q.type, 'All types')}
        ${sel('crm-ci', ['C1', 'C2', 'C3', 'C4'].map(x => [x, x]), q.circle, 'All circles')}
        ${sel('crm-s', stages.seller.map(s => [s.name, s.name]), q.stage, 'Any stage')}
        ${sel('crm-o', [['fit', 'Best fit first'], ['name', 'Name A–Z'], ['new', 'Newest first']], q.sort === 'reply' ? '' : q.sort, 'Latest reply first')}
        <button class="btn" id="crm-csv">Export</button><button class="btn pri" id="crm-new">+ Contact</button></div>
      <div class="glass panel" id="crm-list"><div class="hint">Loading…</div></div>`;
    let t;
    v.querySelector('#crm-q').oninput = e => { clearTimeout(t); t = setTimeout(() => { q.text = e.target.value; q.page = 0; list() }, 250) };
    [['#crm-t', 'type'], ['#crm-ci', 'circle'], ['#crm-s', 'stage'], ['#crm-show', 'show'], ['#crm-o', 'sort']].forEach(([s, k]) => v.querySelector(s).onchange = e => { q[k] = e.target.value || (k === 'sort' ? 'reply' : ''); q.page = 0; list() });
    v.querySelector('#crm-csv').onclick = exportCsv;
    v.querySelector('#crm-new').onclick = newContact;
    list();
  }

  async function query(cols, count) {
    const inner = q.stage || q.show === 'pipeline';
    let r = sb.from('contacts').select(`${cols},deals${inner ? '!inner' : ''}(stage,pipeline)`, count ? {count: 'exact'} : undefined);
    if (q.text) { const s = q.text.replace(/[%,()*]/g, ' ').trim(); if (s) r = r.or(`full_name.ilike.*${s}*,company.ilike.*${s}*,email.ilike.*${s}*,city.ilike.*${s}*`) }
    if (q.type) r = r.eq('owner_type', q.type);
    if (q.circle) r = r.eq('circle', q.circle);
    if (q.stage) r = r.eq('deals.stage', q.stage);
    if (q.show === 'replied') r = r.not('last_inbound_at', 'is', null);
    if (q.show === 'cold') r = r.contains('tags', ['not_interested']);
    if (q.show === 'waiting') { const {data} = await sb.from('v_waiting').select('id'); r = r.in('id', (data || []).map(x => x.id).concat(['00000000-0000-0000-0000-000000000000'])) }
    const o = {reply: ['last_inbound_at', false], fit: ['fit_score', false], name: ['full_name', true], new: ['created_at', false]}[q.sort] || ['last_inbound_at', false];
    return {r: r.order(o[0], {ascending: o[1], nullsFirst: false}).order('fit_score', {ascending: false, nullsFirst: false})};  // wrapped: an awaited builder would run
  }

  async function list() {
    const box = document.getElementById('crm-list'); if (!box) return;
    const {data, count, error} = await (await query('id,email,full_name,first_name,last_name,company,owner_type,circle,fit_score,city,last_inbound_at,tags', true)).r.range(q.page * PAGE, q.page * PAGE + PAGE - 1);
    if (error) { box.innerHTML = empty(error.message); return }
    const tags = c => (c.tags || []).filter(x => x !== 'positive').map(x => `<span class="tag ${x === 'not_interested' ? 'cold' : ''}">${esc(x.replace(/_/g, ' '))}</span>`).join('') + ((c.tags || []).includes('positive') ? '<span class="tag hot">positive</span>' : '');
    box.innerHTML = (data.length ? `<div class="row h"><div>Owner</div><div>Business</div><div>Type</div><div>Fit</div><div>Stage</div><div>Last reply</div></div>` +
      data.map(c => `<div class="row" data-c="${c.id}"><div>${esc(name(c))}<small>${esc(c.email)}</small></div><div>${esc(c.company || '')}<small>${esc(c.city || '')}</small></div><div>${esc(c.owner_type || '')} ${c.circle ? `<span class="tag">${esc(c.circle)}</span>` : ''}</div><div>${c.fit_score ?? '—'}</div><div>${esc(c.deals?.find(d => d.pipeline === 'seller')?.stage || '—')}<small>${tags(c)}</small></div><div class="${c.last_inbound_at ? '' : 'hint'}">${c.last_inbound_at ? wait(hrs(c.last_inbound_at)) + ' ago' : '—'}</div></div>`).join('')
      : empty('No owners match these filters')) +
      `<div class="tb" style="margin:14px 0 0;justify-content:space-between"><span class="hint">${fmt(count)} owners${count > PAGE ? ` · page ${q.page + 1} of ${Math.ceil(count / PAGE)}` : ''}</span><span><button class="btn" data-pg="-1" ${q.page ? '' : 'disabled'}>← Prev</button> <button class="btn" data-pg="1" ${(q.page + 1) * PAGE >= count ? 'disabled' : ''}>Next →</button></span></div>`;
    box.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { q.page += +b.dataset.pg; list(); document.getElementById('main')?.scrollTo(0, 0) });
    bindRows(box);
  }

  async function exportCsv() {
    const cols = ['full_name', 'email', 'phone', 'company', 'owner_type', 'circle', 'fit_score', 'street', 'city', 'zip', 'website', 'last_inbound_at'];
    const {data, error} = await (await query(cols.join(','))).r.range(0, 4999);
    if (fail(error)) return;
    const cell = x => { const s = Array.isArray(x) ? x.join(' ') : String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s };
    const rows = [cols.concat('stage').join(',')].concat(data.map(c => cols.map(k => cell(c[k])).concat(cell(c.deals?.find(d => d.pipeline === 'seller')?.stage)).join(',')));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], {type: 'text/csv'}));
    a.download = `newton-contacts-${dayKey(Date.now())}.csv`; a.click(); URL.revokeObjectURL(a.href);
    flash(`Exported ${data.length} owners`);
  }

  function newContact() {
    const {d, close} = shell();
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start"><h2>New contact</h2><button class="btn" data-x>Close</button></div>
      <form class="fg" style="margin-top:16px" action="javascript:void 0">
        <label class="w">Email *<input name="email" type="email" required></label>
        <label>First name<input name="first_name"></label><label>Last name<input name="last_name"></label>
        <label>Business<input name="company"></label><label>Phone<input name="phone"></label>
        <label>Owner type<select name="owner_type"><option value="">—</option><option>Both</option><option>Business</option><option>Property</option></select></label><label>City<input name="city"></label>
        <label class="w">Notes<textarea name="owner_notes"></textarea></label>
        <label class="w" style="flex-direction:row;align-items:center;gap:8px;text-transform:none;font:12.5px var(--sans);color:var(--ink2)"><input type="checkbox" name="deal" class="chk" checked> Add to the seller pipeline as Interested</label>
        <div class="w"><button class="btn pri">Save contact</button></div></form>`;
    d.querySelector('[data-x]').onclick = close;
    d.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)), deal = f.deal; delete f.deal;
      Object.keys(f).forEach(k => { f[k] = f[k].trim() || null });
      f.full_name = [f.first_name, f.last_name].filter(Boolean).join(' ') || null; f.list = 'manual';
      const {data, error} = await sb.from('contacts').insert(f).select('id').single();
      if (fail(error)) return;
      if (deal) await sb.from('deals').insert({contact_id: data.id, pipeline: 'seller', stage: 'Interested'});
      flash('Contact saved'); refresh(); open(data.id);
    };
  }

  /* ---------- Tasks ---------- */
  async function tasks() {
    const v = V();
    const [{data: open, error}, {data: done}] = await Promise.all([
      sb.from('tasks').select('*, contacts(id,full_name,first_name,email,company)').eq('done', false).order('due_at', {nullsFirst: false}),
      sb.from('tasks').select('*, contacts(id,full_name,first_name,email,company)').eq('done', true).order('created_at', {ascending: false}).limit(15),
    ]);
    if (error) { v.innerHTML = empty(error.message); return }
    const g = {overdue: [], today: [], later: [], none: []};
    open.forEach(k => g[!k.due_at ? 'none' : isToday(k.due_at) ? 'today' : hrs(k.due_at) > 0 ? 'overdue' : 'later'].push(k));
    const sect = (t, list, cls = '') => list.length ? `<div class="grp"><span class="${cls}">${t}</span><span>${list.length}</span></div>${list.map(taskRow).join('')}` : '';
    v.innerHTML = `<div class="g">
      <div class="s12 kpis k4">${kpi('Overdue', g.overdue.length, 'past their date', {accent: g.overdue.length})}${kpi('Today', g.today.length, 'due before tonight')}${kpi('Coming up', g.later.length, 'with a date ahead')}${kpi('Done', (done || []).length, 'recently closed')}</div>
      ${panel({span: 8, title: 'Open tasks', sub: 'Tick to close · tap a row to open the owner', body: open.length ? sect('Overdue', g.overdue, 'late') + sect('Today', g.today) + sect('Coming up', g.later) + sect('No date', g.none) : empty('No open tasks', 'Add one on the right or from any contact')})}
      <div class="s4 col">
        ${panel({title: 'New task', sub: 'Calls, valuations, follow-ups', body: `<form class="fg" style="grid-template-columns:1fr" action="javascript:void 0"><label>Task<input name="title" required placeholder="e.g. Send the valuation to David"></label><label>Due<input name="due" type="datetime-local"></label><button class="btn pri">Add task</button></form>`})}
        ${panel({title: 'Recently done', body: (done || []).length ? done.map(taskRow).join('') : empty('Nothing closed yet')})}
      </div></div>`;
    v.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target);
      if (!fail((await sb.from('tasks').insert({title: f.get('title').trim(), due_at: toIso(f.get('due'))})).error)) { flash('Task added'); tasks() }
    };
    bindTasks(v, tasks);
    bindRows(v);
  }

  /* ---------- Activity ---------- */
  async function activity() {
    const v = V(), types = [['', 'Everything'], ['email_in', 'Replies'], ['email_out', 'Sent'], ['stage_change', 'Stage moves'], ['note,call', 'Notes & calls'], ['booking', 'Bookings'], ['no_show,bounce', 'No-shows & bounces']];
    let r = sb.from('activities').select('id,type,subject,body,at,source,contacts(id,full_name,first_name,email,company)').order('at', {ascending: false}).limit(120);
    if (actType) r = r.in('type', actType.split(','));
    const {data, error} = await r;
    if (error) { v.innerHTML = empty(error.message); return }
    const byDay = {}; data.forEach(a => (byDay[dayKey(a.at)] ||= []).push(a));
    v.innerHTML = `<div class="tb chips">${types.map(([k, l]) => `<button data-t="${k}" class="${k === actType ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="glass panel">${data.length ? Object.entries(byDay).map(([day, list]) => `<div class="grp"><span>${isToday(day + 'T12:00') ? 'Today' : new Date(day + 'T12:00').toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'})}</span><span>${list.length}</span></div>` +
        list.map(a => `<div class="row" style="grid-template-columns:90px 1.1fr 1fr 3fr 70px" data-c="${a.contacts?.id || ''}"><div><span class="tag ${a.type === 'email_in' ? 'hot' : ''}">${ACT[a.type] || a.type}</span></div><div>${esc(name(a.contacts))}</div><div class="hint">${esc(a.contacts?.company || '')}</div><div class="hint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((a.subject && a.type !== 'stage_change' ? a.subject + ' — ' : '') + (a.body || '').replace(/\s+/g, ' ').slice(0, 200))}</div><div class="hint">${new Date(a.at).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</div></div>`).join('')).join('') : empty('Nothing here yet')}</div>`;
    v.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { actType = b.dataset.t; activity() });
    bindRows(v);
  }

  /* ---------- Contact page (drawer) ---------- */
  function shell() {
    document.querySelectorAll('#crm .drawer,#crm .shade').forEach(x => x.remove());
    const root = document.getElementById('crm'), s = document.createElement('div'), d = document.createElement('div');
    s.className = 'shade'; d.className = 'drawer'; root.append(s, d);
    const close = () => { s.remove(); d.remove(); document.removeEventListener('keydown', esc_) };
    const esc_ = e => { if (e.key === 'Escape' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) close() };
    s.onclick = close; document.addEventListener('keydown', esc_);
    return {d, close};
  }

  async function open(id) {
    const [{data: c, error}, {data: acts}, {data: files}, {data: deals}, {data: tk}] = await Promise.all([
      sb.from('contacts').select('*').eq('id', id).single(),
      sb.from('activities').select('*').eq('contact_id', id).order('at', {ascending: false}),
      sb.from('files').select('*').eq('contact_id', id),
      sb.from('deals').select('*').eq('contact_id', id),
      sb.from('tasks').select('*').eq('contact_id', id).eq('done', false).order('due_at', {nullsFirst: false}),
    ]);
    if (fail(error)) return;
    const prevScroll = document.querySelector('#crm .drawer')?.scrollTop || 0;
    const {d, close} = shell();
    const deal = (deals || []).find(x => x.pipeline === 'seller'), tags = c.tags || [], cold = tags.includes('not_interested');
    const waiting = c.last_inbound_at && (!c.last_outbound_at || c.last_outbound_at < c.last_inbound_at);
    const kv = (k, val, href) => val || val === 0 ? `<span>${k}</span><div>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(val)}</a>` : esc(val)}</div>` : '';
    const site = c.website && (/^https?:/.test(c.website) ? c.website : 'https://' + c.website);
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><div><h2>${esc(name(c))}</h2><div class="hint">${esc(c.title || '')}${c.title && c.company ? ' · ' : ''}${esc(c.company || '')}${c.city ? ' · ' + esc(c.city) : ''}</div>
        <div style="margin-top:7px">${tags.map(t => `<span class="tag ${t === 'positive' ? 'hot' : t === 'not_interested' ? 'cold' : ''}">${esc(t.replace(/_/g, ' '))}</span>`).join('')}${waiting ? `<span class="tag hot">waiting ${wait(hrs(c.last_inbound_at))}</span>` : ''}</div></div><button class="btn" data-x>Close</button></div>
      <div class="tb" style="margin:16px 0 0"><a class="btn pri" href="mailto:${esc(c.email)}">Email</a>${c.phone ? `<a class="btn" href="tel:${esc(c.phone)}">Call ${esc(c.phone)}</a>` : ''}${waiting ? '<button class="btn" data-replied>✓ Replied</button>' : ''}
        <button class="btn" data-held>Call held</button><button class="btn" data-noshow>No-show</button><button class="btn" data-cold>${cold ? 'Mark interested again' : 'Not interested'}</button></div>
      <div data-extra></div>
      <h5>Deal</h5><div class="box">${deal ? `<form class="fg" data-deal action="javascript:void 0">
          <label>Stage<select name="stage">${stages.seller.map(s => `<option ${s.name === deal.stage ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
          <label>Value estimate ($)<input name="value_estimate" type="number" min="0" step="1000" value="${deal.value_estimate ?? ''}"></label>
          <label>Next step<input name="next_action" value="${esc(deal.next_action || '')}" placeholder="e.g. Discovery call"></label>
          <label>When<input name="next_action_at" type="datetime-local" value="${localInput(deal.next_action_at)}"></label>
          <label class="w">Lost reason (leave empty while it is alive)<input name="lost_reason" value="${esc(deal.lost_reason || '')}"></label>
          <div class="w" style="display:flex;gap:8px;align-items:center"><button class="btn pri">Save deal</button><span class="hint">In this stage ${wait(hrs(deal.updated_at))}</span></div></form>`
        : `<div class="tb" style="margin:0"><span class="hint">Not in the pipeline yet.</span><button class="btn pri" data-add>Add to seller pipeline</button></div>`}</div>
      <h5>Open tasks</h5><div data-tasks>${(tk || []).length ? tk.map(k => taskRow({...k, contacts: null})).join('') : '<div class="hint">None</div>'}</div>
      <form class="tb" data-newtask style="margin-top:8px" action="javascript:void 0"><input name="title" placeholder="New task (e.g. send valuation)" style="flex:1;min-width:180px" required><input name="due" type="datetime-local"><button class="btn">Add task</button></form>
      <h5>Notes</h5><textarea data-notes placeholder="What matters about this owner">${esc(c.owner_notes || '')}</textarea><div class="tb" style="margin-top:6px"><button class="btn" data-save>Save notes</button><span class="hint" data-saved></span></div>
      <h5>Log to timeline</h5><textarea data-new placeholder="Call notes, what they said, next step"></textarea>
      <div class="tb" style="margin-top:6px"><button class="btn" data-log="note">Add note</button><button class="btn" data-log="call">Log call</button></div>
      <h5>Business + property</h5><div class="dkv">${kv('Email', c.email, 'mailto:' + c.email)}${kv('Phone', c.phone)}${kv('Owner type', c.owner_type)}${kv('Legal name', c.company_legal)}${kv('Address', [c.street, c.city, c.zip].filter(Boolean).join(', '))}${kv('Website', c.website, site)}${kv('In business', c.years_in_business && c.years_in_business + ' years')}${kv('Owned', c.years_owned && c.years_owned + ' years')}${kv('Circle · fit', [c.circle, c.fit_score].filter(x => x != null).join(' · '))}${kv('Campaign', c.campaign)}${kv('Offer', c.offer)}${kv('Last reply', c.last_inbound_at && when(c.last_inbound_at))}${kv('Last email to them', c.last_outbound_at && when(c.last_outbound_at))}</div>
      ${(files || []).length ? `<h5>Files</h5>${files.map(f => `<div><a class="btn sm" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title || f.kind)}</a></div>`).join('')}` : ''}
      <h5>Timeline · ${(acts || []).length}</h5>${(acts || []).map(a => `<div class="act ${a.type}"><i>${ACT[a.type] || a.type} · ${when(a.at)}${a.source && a.source !== 'crm' ? ' · ' + a.source : ''}</i>${a.subject ? `<p><b>${esc(a.subject)}</b></p>` : ''}${a.body ? `<p class="${a.body.length > 600 ? 'clip' : ''}">${esc(a.body)}</p>` : ''}</div>`).join('') || '<div class="hint">Nothing yet</div>'}`;
    d.scrollTop = prevScroll;

    const reopen = () => { refresh(); return open(id) };
    const deal0 = stage => deal ? sb.from('deals').update({stage}).eq('id', deal.id) : sb.from('deals').insert({contact_id: id, pipeline: 'seller', stage});
    d.querySelector('[data-x]').onclick = close;
    d.querySelectorAll('.clip').forEach(p => p.onclick = () => p.classList.remove('clip'));
    d.querySelector('[data-replied]')?.addEventListener('click', async () => { if (!fail((await markReplied(id)).error)) { flash('Marked as replied'); reopen() } });
    d.querySelector('[data-add]')?.addEventListener('click', async () => { if (!fail((await deal0('Interested')).error)) reopen() });
    d.querySelector('[data-deal]')?.addEventListener('submit', async e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      const {error} = await sb.from('deals').update({stage: f.stage, value_estimate: f.value_estimate === '' ? null : +f.value_estimate, next_action: f.next_action.trim() || null, next_action_at: toIso(f.next_action_at), lost_reason: f.lost_reason.trim() || null}).eq('id', deal.id);
      if (!fail(error)) { flash('Deal saved'); reopen() }
    });
    d.querySelector('[data-held]').onclick = async () => { if (!fail((await deal0('Discovery Call Held')).error)) { flash('Call held'); reopen() } };
    d.querySelector('[data-cold]').onclick = async () => {
      const next = cold ? tags.filter(t => t !== 'not_interested') : tags.concat('not_interested');
      if (!fail((await sb.from('contacts').update({tags: next}).eq('id', id)).error)) reopen();
    };
    d.querySelector('[data-noshow]').onclick = async () => {
      // replaces the old No-Show workflow: logs it, sets a task, hands Issac the rebook email (sent from his Gmail)
      await sb.from('activities').insert({contact_id: id, type: 'no_show', body: 'Missed the call', source: 'crm'});
      await sb.from('tasks').insert({contact_id: id, title: 'No-show: send the rebook email', due_at: new Date().toISOString()});
      const first = c.first_name ? c.first_name[0] + c.first_name.slice(1).toLowerCase() : 'there';
      const txt = `Hi ${first},\n\nSorry we missed each other today. Things come up, no problem at all.\n\n${CRM_CFG.book ? `Here is my calendar to pick a new time that suits you: ${CRM_CFG.book}` : 'What day and time work better for you this week?'}\n\nIssac`;
      await reopen();
      document.querySelector('#crm .drawer [data-extra]').innerHTML = `<h5>Rebook email (copy into Gmail)</h5><textarea readonly style="min-height:150px">${esc(txt)}</textarea>
        <div class="tb" style="margin-top:6px"><a class="btn pri" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Rebooking our call')}&body=${encodeURIComponent(txt)}">Open in email</a></div>`;
    };
    d.querySelector('[data-save]').onclick = async () => {
      const {error} = await sb.from('contacts').update({owner_notes: d.querySelector('[data-notes]').value}).eq('id', id);
      d.querySelector('[data-saved]').textContent = error ? error.message : 'Saved';
    };
    d.querySelectorAll('[data-log]').forEach(b => b.onclick = async () => {
      const body = d.querySelector('[data-new]').value.trim(); if (!body) return;
      if (!fail((await sb.from('activities').insert({contact_id: id, type: b.dataset.log, body, source: 'crm'})).error)) reopen();
    });
    d.querySelector('[data-newtask]').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target);
      if (!fail((await sb.from('tasks').insert({contact_id: id, title: f.get('title').trim(), due_at: toIso(f.get('due'))})).error)) { flash('Task added'); reopen() }
    };
    bindTasks(d.querySelector('[data-tasks]'), reopen);
  }

  const VIEWS = {today, pipeline, contacts, tasks, activity};
  return {page};
})();
