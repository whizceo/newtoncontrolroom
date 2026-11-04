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
#crm .wait{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:13px 18px;border:1px solid rgba(228,43,12,.45);border-radius:16px;
  background:linear-gradient(155deg,rgba(228,43,12,.26),rgba(228,43,12,.05) 60%,rgba(255,255,255,.01));box-shadow:0 0 46px -14px rgba(228,43,12,.6),inset 0 1px 0 rgba(255,190,160,.25)}
#crm .wait b::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--sig);box-shadow:0 0 10px var(--sig);margin-right:10px;vertical-align:1px;animation:crmblink 1.6s ease-in-out infinite}
@keyframes crmblink{50%{opacity:.25}}
#crm .wait b{font-weight:500;margin-right:6px}
#crm .wait button{font:12px var(--sans);color:var(--ink);background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:999px;padding:5px 12px;cursor:pointer}
#crm .wait button.late{border-color:var(--sig)}
#crm .wait button:hover{border-color:var(--ink)}
#crm .tb{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
#crm .tb.glass{padding:10px 12px;border-radius:16px}
#crm .tb input[type=search]{flex:1;min-width:220px}
#crm .btn{font:12px var(--sans);color:var(--ink2);background:rgba(255,255,255,.04);border:1px solid var(--line2);border-radius:999px;padding:6px 14px;cursor:pointer;text-decoration:none;display:inline-block;white-space:nowrap}
#crm .btn:hover{border-color:var(--ink2);color:var(--ink)}
#crm .btn.pri{background:linear-gradient(160deg,#ff6a3d,var(--sig));border-color:var(--sig);color:#fff;box-shadow:0 0 18px -4px rgba(228,43,12,.75),inset 0 1px 0 rgba(255,255,255,.3)}
#crm .btn.sm{padding:3px 10px;font-size:11px}
#crm .btn:disabled{opacity:.35;cursor:default}
#crm .seg{display:inline-flex;border:1px solid var(--line2);border-radius:999px;overflow:hidden}
#crm .seg button{font:12px var(--sans);color:var(--ink2);background:none;border:0;padding:6px 14px;cursor:pointer}
#crm .seg button.on{background:linear-gradient(160deg,#ff6a3d,var(--sig));color:#fff;box-shadow:0 0 18px -2px rgba(228,43,12,.7),inset 0 1px 0 rgba(255,255,255,.3)}
#crm input,#crm select,#crm textarea{font:12.5px var(--sans);color:var(--ink);background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:10px;padding:7px 10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
#crm input:focus,#crm select:focus,#crm textarea:focus{outline:none;border-color:var(--sig);box-shadow:0 0 0 3px rgba(228,43,12,.15),0 0 18px -4px rgba(228,43,12,.6)}
#crm textarea{width:100%;min-height:70px;resize:vertical}
#crm .hint{color:var(--mute);font-size:12px}
#crm .row{display:grid;grid-template-columns:1.4fr 1.2fr .8fr .5fr 1fr .7fr;gap:10px;padding:10px 8px;border-bottom:1px solid var(--line);cursor:pointer;align-items:center;font-size:13px;border-radius:10px;transition:background .2s,box-shadow .2s,transform .2s}
#crm .row:hover{background:linear-gradient(90deg,rgba(228,43,12,.12),rgba(255,255,255,.02) 55%);box-shadow:inset 2px 0 0 var(--sig),0 10px 26px -18px rgba(228,43,12,.8);transform:translateX(2px)}
#crm .who{display:flex;gap:11px;align-items:center;min-width:0}#crm .who>div{min-width:0}
#crm .orb{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:500 10px var(--mono);letter-spacing:.02em;color:#fff;
  background:radial-gradient(circle at 32% 28%,#ffb08a,#e42b0c 52%,#4a0f05);box-shadow:0 0 16px -3px rgba(228,43,12,.75),inset 0 1px 1px rgba(255,255,255,.45)}
#crm .orb.Property{background:radial-gradient(circle at 32% 28%,#ffe0b8,#ff8a3d 52%,#4d2306);box-shadow:0 0 16px -3px rgba(255,138,61,.7),inset 0 1px 1px rgba(255,255,255,.45)}
#crm .orb.Business{background:radial-gradient(circle at 32% 28%,#d9d2cc,#6d6560 55%,#1d1a18);box-shadow:0 0 14px -4px rgba(255,255,255,.3),inset 0 1px 1px rgba(255,255,255,.45)}
#crm .fit{display:flex;align-items:center;gap:8px;font-feature-settings:'tnum'}
#crm .fit svg{width:26px;height:26px;transform:rotate(-90deg);overflow:visible}
#crm .fit .tr{stroke:rgba(255,255,255,.08)}#crm .fit .arc{stroke:var(--sig);filter:drop-shadow(0 0 3px rgba(228,43,12,.9))}
#crm .pill{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11.5px;border:1px solid rgba(228,43,12,.45);background:rgba(228,43,12,.1);box-shadow:0 0 14px -6px rgba(228,43,12,.8)}
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
#crm .kb{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 12px}
#crm .kcol{flex:0 0 232px;padding:12px;min-height:360px;display:flex;flex-direction:column}
#crm .kcol.has{border-color:rgba(228,43,12,.32);box-shadow:inset 0 1px 0 rgba(255,190,160,.12),0 0 40px -18px rgba(228,43,12,.55),0 28px 60px -32px rgba(0,0,0,.95)}
#crm .kcol.over{border-color:var(--sig);box-shadow:0 0 0 1px var(--sig),0 0 40px -10px rgba(228,43,12,.7)}
#crm .kcol h4{font:10px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin-bottom:2px;display:flex;justify-content:space-between;gap:6px;align-items:baseline}
#crm .kcol h4 em{font-style:normal;color:var(--sig);margin-right:7px}
#crm .kcol h4 b{color:var(--ink);font-weight:400;font-size:15px;font-family:var(--sans)}
#crm .kcol.has h4 b{text-shadow:0 0 12px rgba(228,43,12,.9)}
#crm .kbar{height:2px;border-radius:2px;background:rgba(255,255,255,.06);margin:8px 0 7px;overflow:hidden}
#crm .kbar i{display:block;height:100%;background:linear-gradient(90deg,var(--sig),#ffb08a);box-shadow:0 0 10px var(--sig)}
#crm .kcol .cv{font:10px var(--mono);color:#ffb79f;margin-bottom:10px;height:13px}
#crm .kempty{flex:1;display:grid;place-items:center;align-content:center;gap:10px;color:var(--dim);font:9.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;min-height:200px}
#crm .kempty i{width:44px;height:16px;border-radius:50%;border:1px solid rgba(255,150,110,.22);box-shadow:0 0 18px -6px rgba(228,43,12,.5),inset 0 0 10px rgba(228,43,12,.12)}
#crm .card{--tc:var(--sig);position:relative;background:linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px 11px 9px 13px;margin-bottom:8px;cursor:grab;font-size:12.5px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 28px -18px rgba(0,0,0,.9);transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s,border-color .25s}
#crm .card::before{content:'';position:absolute;left:0;top:12px;bottom:12px;width:2px;border-radius:2px;background:var(--tc);box-shadow:0 0 10px var(--tc)}
#crm .card.Property{--tc:#ff8a3d}#crm .card.Business{--tc:#b9b1ab}
#crm .card:hover{transform:translateY(-3px);border-color:rgba(255,150,110,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1px rgba(228,43,12,.12),0 20px 36px -16px rgba(228,43,12,.5)}
#crm .card.lost{opacity:.45}
#crm .card .who{gap:9px}#crm .card .orb{width:26px;height:26px;font-size:9px}
#crm .card b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#crm .card small{color:var(--mute);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#crm .card .meta{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font:10px var(--mono);color:var(--mute)}
#crm .card .val{color:#ffd2c0;font-size:11px;text-shadow:0 0 10px rgba(228,43,12,.9)}
#crm .gold{display:flex;flex-direction:column;gap:8px;max-height:330px;overflow:auto}
#crm .gr{display:grid;grid-template-columns:minmax(0,1fr) auto 92px;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;cursor:pointer;background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.01));border:1px solid var(--line);transition:transform .15s,border-color .15s,box-shadow .15s}
#crm .gr:hover{transform:translateX(3px);border-color:rgba(255,150,110,.45);box-shadow:0 0 22px -8px rgba(228,43,12,.7)}
#crm .gr.top{border-color:rgba(255,195,138,.55);background:linear-gradient(160deg,rgba(255,195,138,.14),rgba(228,43,12,.05));box-shadow:0 0 26px -10px rgba(255,195,138,.8)}
#crm .gr .who b,#crm .gr .who small{display:block}#crm .gr .who small{color:var(--mute);font-size:11.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#crm .gr .who>div{min-width:0}#crm .gr .gv{text-align:right}#crm .gr .gv b{font:500 15px var(--sans);color:#ffd9b8;text-shadow:0 0 14px rgba(255,120,80,.6)}
#crm .gr .gv i{display:block;height:3px;margin:6px 0 0 auto;border-radius:3px;background:linear-gradient(90deg,#e42b0c,#ffc38a);box-shadow:0 0 8px rgba(255,120,80,.7)}
#crm .track{height:250px}#crm .track svg{width:100%;height:100%;display:block;overflow:visible}
#crm .track .flow{animation:crmflow 2.2s linear infinite}@keyframes crmflow{to{stroke-dashoffset:-32}}
#crm .track text.sn{font:9px var(--mono);letter-spacing:.06em;fill:var(--mute);text-transform:uppercase}
#crm .track text.sn.on{fill:#ffb79f}
#crm .grp{font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:16px 0 6px;display:flex;justify-content:space-between}
#crm .grp:first-child{margin-top:0}
#crm .chips{display:flex;gap:6px;flex-wrap:wrap}
#crm .chips button{font:11px var(--mono);color:var(--ink2);background:none;border:1px solid var(--line2);border-radius:999px;padding:4px 11px;cursor:pointer}
#crm .chips button.on{border-color:var(--sig);color:var(--ink);background:rgba(228,43,12,.12)}
#crm .shade{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:49;backdrop-filter:blur(2px)}
#crm .drawer{position:fixed;top:0;right:0;bottom:0;width:min(600px,100vw);background:radial-gradient(600px 300px at 100% 0,rgba(228,43,12,.12),transparent 60%),#0d0c0c;border-left:1px solid var(--line2);z-index:50;overflow-y:auto;padding:22px 24px 40px;box-shadow:-30px 0 60px rgba(0,0,0,.5);animation:crmin .18s ease-out}
@keyframes crmin{from{transform:translateX(30px);opacity:0}}
#crm .drawer h2{font-weight:500;font-size:21px;margin-bottom:2px}
#crm .drawer h5{font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:20px 0 8px}
#crm .box{border:1px solid var(--line2);border-radius:12px;padding:12px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
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
@media(max-width:900px){#crm .track{height:auto;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}#crm .track::-webkit-scrollbar{display:none}#crm .track svg{width:960px;height:240px}
  #crm .gr{grid-template-columns:minmax(0,1fr) auto}#crm .gr .pill{display:none}}
@media(max-width:760px){#crm .row{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}#crm .row>:nth-child(n+2){display:none}#crm .row>:nth-child(5){display:block}#crm .fg{grid-template-columns:1fr}#crm .fg label.w{grid-column:auto}}`;

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
      ${val ? panel({span: 12, title: 'The value on the table', sub: 'One building per open owner · height = county-appraised market value · tap a building to open the owner', body: `<div class="hero"><div><div class="kl">Property value in play</div><div class="hv">${money(val)}</div><div class="ks">Real county-appraised market value of the properties behind your ${valued} valued ${valued === 1 ? 'owner' : 'owners'}. ${open.length - valued ? `${open.length - valued} still pending a county match.` : ''}</div>${(t => t ? `<div class="hl">Tallest: ${esc(name(t.contacts))} · ${money(+t.value_estimate)}<br>Average: ${money(val / valued)} per owner</div>` : '')(open.slice().sort((a, b) => (+b.value_estimate || 0) - (+a.value_estimate || 0))[0])}</div><div><div class="city">${city(open)}</div><div class="swh">← swipe to see every building →</div></div></div>`}) : ''}
      ${panel({span: 12, title: 'Where every owner stands', sub: 'One pillar per stage · height = owners at that stage · glow = property value', body: `<div class="track">${track(stages[pipe], by)}</div><div class="swh">← swipe through the stages →</div>`})}
      <div class="s12"><div class="tb glass"><div class="seg"><button data-p="seller" class="${pipe === 'seller' ? 'on' : ''}">Sellers</button><button data-p="buyer" class="${pipe === 'buyer' ? 'on' : ''}">Buyers</button></div>
        <input type="search" id="crm-kq" placeholder="Filter cards by name or business" value="${esc(kbq)}"><span class="hint">Drag a card to move it · tap to open</span></div>
      <div class="kb">${stages[pipe].map((s, i) => { const list = by[s.name] || [], sv = sum(list.map(d => ({v: +d.value_estimate || 0})), 'v'), n = list.filter(d => !d.lost_reason).length;
        return `<div class="glass kcol ${n ? 'has' : ''}" data-stage="${esc(s.name)}"><h4><span><em>${String(i + 1).padStart(2, '0')}</em>${esc(s.name)}</span><b>${list.length}</b></h4>
        <div class="kbar"><i style="width:${open.length ? 100 * n / open.length : 0}%"></i></div><div class="cv">${sv ? money(sv) : ''}</div>
        ${list.length ? '' : '<div class="kempty"><i></i>No one here yet</div>'}${list.sort((a, b) => !!a.lost_reason - !!b.lost_reason || new Date(b.updated_at) - new Date(a.updated_at)).map(card).join('')}</div>` }).join('')}</div></div></div>`;
    v.querySelectorAll('.glass').forEach((e, i) => e.style.animationDelay = i * 30 + 'ms');
    const cy = v.querySelector('.city'); if (cy) cy.scrollLeft = (cy.scrollWidth - cy.clientWidth) / 2;  // phone: start on the tallest building
    v.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pipe = b.dataset.p; pipeline() });
    v.querySelectorAll('.wait [data-c], .city [data-c]').forEach(b => b.onclick = () => open(b.dataset.c));
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
        col.querySelector('.kempty')?.remove(); col.appendChild(card);  // move now, confirm after save
        if (!fail((await sb.from('deals').update({stage: col.dataset.stage}).eq('id', id)).error)) flash('Moved to ' + col.dataset.stage);
        pipeline();
      };
    });
  }
  const card = d => { const c = d.contacts || {}, idle = hrs(d.updated_at);
    return `<div class="card ${esc(c.owner_type || '')} ${d.lost_reason ? 'lost' : ''}" draggable="true" data-deal="${d.id}" data-c="${c.id}" data-s="${esc((name(c) + ' ' + (c.company || '')).toLowerCase())}">
      <div class="who">${orb(c)}<div><b>${esc(name(c))}</b><small>${esc(c.company || '')}</small></div></div>
      <div style="margin-top:7px">${c.owner_type ? `<span class="tag">${esc(c.owner_type)}</span>` : ''}${d.lost_reason ? '<span class="tag cold">lost</span>' : ''}</div>
      <div class="meta"><span>${d.next_action_at ? '→ ' + when(d.next_action_at) : `<span class="${!d.lost_reason && idle > STALE_D * 24 ? 'late' : ''}">${wait(idle)} here</span>`}</span><span class="val">${d.value_estimate ? money(+d.value_estimate) : ''}</span></div></div>` };
  const orb = c => `<span class="orb ${esc(c.owner_type || '')}">${esc(name(c).split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]).filter((x, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase() || '·')}</span>`;
  const fit = f => f == null ? '<span class="hint">—</span>' : `<span class="fit"><svg viewBox="0 0 26 26"><circle class="tr" cx="13" cy="13" r="10" fill="none" stroke-width="2.5"/><circle class="arc" cx="13" cy="13" r="10" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${(62.83 * Math.min(100, f) / 100).toFixed(1)} 62.83"/></svg>${f}</span>`;

  /* value skyline: one lit building per open deal, height = county-appraised value, tallest in the middle; no value = wireframe lot */
  function city(deals) {
    const id = 'ct' + Math.random().toString(36).slice(2, 7), G = 300, ds = deals.slice().sort((a, b) => (+b.value_estimate || 0) - (+a.value_estimate || 0));
    const order = []; ds.forEach((d, i) => i % 2 ? order.push(d) : order.unshift(d));  // tallest centre, smaller to the sides
    const n = order.length, maxV = Math.max(1, ...ds.map(d => +d.value_estimate || 0)), step = n > 1 ? Math.min(118, 840 / (n - 1)) : 0, x0 = 500 - step * (n - 1) / 2;
    const short = c => { const w = name(c).split(/\s+/); return w.length > 1 ? w[0] + ' ' + w[w.length - 1][0] + '.' : w[0] || '' };
    const bld = order.map((d, i) => ({d, x: x0 + i * step, y: G + (i % 2 ? 16 : 0), v: +d.value_estimate || 0})).sort((a, b) => a.y - b.y);
    return `<svg viewBox="0 0 1000 380" preserveAspectRatio="xMidYMid meet"><defs>${glowF(id + 'g', 6)}
      <linearGradient id="${id}L" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff6a3d"/><stop offset="1" stop-color="#4a0e04"/></linearGradient>
      <linearGradient id="${id}R" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b8260a"/><stop offset="1" stop-color="#1e0602"/></linearGradient>
      <linearGradient id="${id}T" x1="0" x2="1"><stop offset="0" stop-color="#ffd9b8"/><stop offset="1" stop-color="#ff8a5c"/></linearGradient>
      <radialGradient id="${id}F"><stop offset="0" stop-color="#e42b0c" stop-opacity=".45"/><stop offset="1" stop-color="#e42b0c" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="500" cy="${G + 18}" rx="500" ry="58" fill="url(#${id}F)"/>
      ${Array.from({length: 13}, (_, k) => `<line x1="${k * 84 - 4}" y1="${G - 30}" x2="${k * 84 - 60}" y2="${G + 70}" stroke="rgba(255,255,255,.035)"/>`).join('')}
      ${bld.map((b, i) => { const c = b.d.contacts || {}, h = b.v ? 26 + 196 * b.v / maxV : 10, top = b.v === maxV && b.v, roof = b.y - h - 23;
        return `<g class="b" data-c="${c.id}" data-tip="${esc(name(c))}<br>${b.v ? money(b.v) + ' county-appraised' : 'value pending a county match'}<br>${esc(b.d.stage)}">
        ${isoBox(b.x, b.y, 64, 64, 4, {l: 'rgba(255,255,255,.04)', r: 'rgba(255,255,255,.02)', t: 'rgba(228,43,12,.14)', s: 'rgba(255,150,110,.25)'})}
        <g class="grow" style="animation-delay:${i * 70}ms">${b.v ? isoBox(b.x, b.y - 4, 44, 44, h, {l: `url(#${id}L)`, r: `url(#${id}R)`, t: top ? '#ffc38a' : `url(#${id}T)`, s: 'rgba(255,190,160,.55)', win: i + 1})
          : isoBox(b.x, b.y - 4, 44, 44, h, {l: 'rgba(255,255,255,.03)', r: 'rgba(255,255,255,.015)', t: 'rgba(255,255,255,.05)', s: 'rgba(255,255,255,.3)', dash: 1})}</g>
        ${top ? `<circle cx="${b.x}" cy="${roof + 2}" r="4" fill="#fff" filter="url(#${id}g)" class="rise3"/><circle cx="${b.x}" cy="${roof + 2}" r="6" fill="none" stroke="#ffc38a" class="pulse"/>` : ''}
        <text x="${b.x}" y="${roof - 12}" text-anchor="middle" class="cv rise3" style="${top ? 'font-size:16px;fill:#fff' : ''}">${b.v ? money(b.v) : '—'}</text>
        <text x="${b.x}" y="${b.y + 52}" text-anchor="middle" class="cn">${esc(short(c))}</text>
        <text x="${b.x}" y="${b.y + 64}" text-anchor="middle" class="cs">${b.v ? esc(c.owner_type || '') : 'pending'}</text></g>` }).join('')}</svg>`;
  }

  /* value pyramid: everyone on file at the base, each tier up = closer to a sale, gold on top */
  function zig(lv) {
    const id = 'zg' + Math.random().toString(36).slice(2, 7), bx = 220, by = 250, W = [210, 150, 100, 56], H = 34;
    const col = [['rgba(255,255,255,.07)', 'rgba(255,255,255,.03)', 'rgba(255,255,255,.12)'], ['#6b1a0b', '#3a0d05', '#a8300f'], ['#b8260a', '#5a1206', '#ff6a3d'], [`url(#${id}L)`, '#7a3a10', '#ffc38a']];
    return `<svg viewBox="0 0 640 340" preserveAspectRatio="xMidYMid meet"><defs>${glowF(id + 'g', 6)}
      <linearGradient id="${id}L" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffc38a"/><stop offset="1" stop-color="#b8560f"/></linearGradient>
      <radialGradient id="${id}F"><stop offset="0" stop-color="#e42b0c" stop-opacity=".35"/><stop offset="1" stop-color="#e42b0c" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${bx}" cy="${by + 8}" rx="230" ry="80" fill="url(#${id}F)"/>
      ${lv.map((l, k) => `<g class="rise3" style="animation-delay:${k * 120}ms" data-tip="${l.l}<br>${fmt(l.v)} ${l.s}">${isoBox(bx, by, W[k], W[k], H - 4, {z: k * H, l: col[k][0], r: col[k][1], t: col[k][2], s: k === 3 ? 'rgba(255,220,180,.8)' : 'rgba(255,170,130,.35)'})}</g>`).join('')}
      <circle cx="${bx}" cy="${by - 4 * H + 4}" r="5" fill="#fff" filter="url(#${id}g)"/><circle cx="${bx}" cy="${by - 4 * H + 4}" r="7" fill="none" stroke="#ffc38a" class="pulse"/>
      ${lv.map((l, k) => { const zx = bx + W[k] * .866, zy = by - k * H - H / 2 + 2, ty = 300 - k * 70, prev = lv[k - 1];
        return `<g class="rise3 lab" style="animation-delay:${200 + k * 120}ms"><polyline points="${zx + 4},${zy} ${zx + 26},${zy} 452,${ty - 8} 462,${ty - 8}" fill="none" stroke="${k === 3 ? '#ffc38a' : 'rgba(255,150,110,.4)'}" stroke-dasharray="${k === 3 ? '' : '2 3'}"/>
          <text x="470" y="${ty}" class="big" style="font-size:${k === 3 ? 30 : 24}px${k === 3 ? ';fill:#ffd9b8' : ''}">${fmt(l.v)}</text>
          <text x="470" y="${ty + 16}" class="zl">${l.l.toUpperCase()}</text>${prev ? `<text x="470" y="${ty + 30}" class="zp">${pctf(l.v, prev.v, l.v / (prev.v || 1) < .01 ? 2 : 0)} of the tier below</text>` : `<text x="470" y="${ty + 30}" class="zp">${l.s}</text>`}</g>` }).join('')}</svg>`;
  }

  /* stage track: one glowing pillar per stage, open deals only, height = owners, glow = appraised value */
  function track(list, by) {
    const n = list.length, x0 = 70, x1 = 930, base = 168, id = 'pt' + Math.random().toString(36).slice(2, 7);
    const X = i => n > 1 ? x0 + i * (x1 - x0) / (n - 1) : 500;
    const st = list.map(s => { const o = (by[s.name] || []).filter(d => !d.lost_reason); return {s, c: o.length, v: sum(o.map(d => ({v: +d.value_estimate || 0})), 'v')} });
    const maxC = Math.max(1, ...st.map(x => x.c)), maxV = Math.max(1, ...st.map(x => x.v));
    const words = t => t.split(' ').reduce((l, w) => { const i = l.length - 1; i >= 0 && (l[i] + ' ' + w).length <= 10 ? l[i] += ' ' + w : l.push(w); return l }, []);  // wrap at ~10 chars so neighbours never touch
    return `<svg viewBox="0 0 1000 250" preserveAspectRatio="xMidYMid meet"><defs>${glowF(id + 'g', 5)}${grad(id + 'p', '#ff6a3d', 1, .05)}
      <radialGradient id="${id}r"><stop offset="0" stop-color="#ff7a4d" stop-opacity=".95"/><stop offset=".6" stop-color="#e42b0c" stop-opacity=".35"/><stop offset="1" stop-color="#e42b0c" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}f" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e42b0c" stop-opacity=".16"/><stop offset="1" stop-color="#e42b0c" stop-opacity="0"/></linearGradient></defs>
      <path d="M${x0 - 34} ${base - 16}L${x1 + 34} ${base - 16}L${x1 + 64} ${base + 22}L${x0 - 64} ${base + 22}Z" fill="url(#${id}f)" stroke="rgba(255,150,110,.16)"/>
      ${Array.from({length: 9}, (_, k) => `<line x1="${x0 - 34 + k * (x1 - x0 + 68) / 8}" y1="${base - 16}" x2="${x0 - 64 + k * (x1 - x0 + 128) / 8}" y2="${base + 22}" stroke="rgba(255,255,255,.04)"/>`).join('')}
      <line x1="${X(0)}" y1="${base}" x2="${X(n - 1)}" y2="${base}" stroke="rgba(255,120,80,.45)" stroke-width="1.2" stroke-dasharray="3 5" class="flow"/>
      ${st.map((x, i) => { const cx = X(i), h = x.c ? 22 + 92 * x.c / maxC : 0, hot = x.v / maxV;
        return `<g data-tip="${esc(x.s.name)}<br>${x.c} ${x.c === 1 ? 'owner' : 'owners'}${x.v ? ' · ' + money(x.v) : ''}">
          <ellipse cx="${cx}" cy="${base}" rx="34" ry="11" fill="${x.c ? `url(#${id}r)` : 'rgba(255,255,255,.035)'}" stroke="${x.c ? 'rgba(255,150,110,.75)' : 'rgba(255,255,255,.1)'}"/>
          ${x.c ? `<ellipse cx="${cx}" cy="${base}" rx="20" ry="6.5" fill="none" stroke="#ff8a5c" class="pulse"/>
          <rect x="${cx - 5}" y="${base - h}" width="10" height="${h}" rx="5" fill="url(#${id}p)" filter="url(#${id}g)" class="grow" opacity="${.65 + .35 * hot}"/>
          <rect x="${cx - 1.2}" y="${base - h}" width="2.4" height="${h}" fill="#ffd7c4" class="grow"/>
          <circle cx="${cx}" cy="${base - h}" r="3.6" fill="#fff" filter="url(#${id}g)" class="rise3"/>
          <text x="${cx}" y="${base - h - 30}" text-anchor="middle" class="fv rise3">${x.c}</text>
          <text x="${cx}" y="${base - h - 14}" text-anchor="middle" class="fc rise3">${x.v ? money(x.v) : ''}</text>`
          : `<text x="${cx}" y="${base - 18}" text-anchor="middle" style="fill:var(--dim)">0</text>`}
          ${words(x.s.name).map((w, k) => `<text x="${cx}" y="${base + 38 + k * 11}" text-anchor="middle" class="sn ${x.c ? 'on' : ''}">${esc(w)}</text>`).join('')}
          <rect x="${cx - 44}" y="20" width="88" height="${base + 50}" fill="transparent"/></g>` }).join('')}</svg>`;
  }

  /* ---------- Contacts ---------- */
  async function contacts() {
    const v = V(), sel = (id, opts, cur, all) => `<select id="${id}"><option value="">${all}</option>${opts.map(([val, lab]) => `<option value="${esc(val)}" ${cur === val ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
    v.innerHTML = `<div class="g"><div class="s12 kpis k4" id="crm-ck">${kpi('Owners in the CRM', '…', '')}${kpi('Replied', '…', '')}${kpi('Positive', '…', '')}${kpi('In the pipeline', '…', '')}</div>
      ${panel({span: 7, title: 'From everyone to the ones that matter', sub: 'Each tier up = owners who moved closer to a sale', body: '<div class="zig" id="crm-zig"></div>'})}
      ${panel({span: 5, title: 'The owners worth your time', sub: 'Every open deal, biggest property value first', body: '<div class="gold" id="crm-gold"><div class="hint">Loading…</div></div>'})}
      <div class="s12"><div class="tb glass"><input type="search" id="crm-q" placeholder="Search name, business, email, city" value="${esc(q.text)}">
        ${sel('crm-show', [['waiting', 'Waiting on you'], ['replied', 'Replied'], ['pipeline', 'In pipeline'], ['cold', 'Not interested'], ['bbs', 'BizBuySell buyers (from GHL)'], ['ghlr', 'Replied in GHL']], q.show, 'Everyone')}
        ${sel('crm-t', ['Both', 'Business', 'Property'].map(x => [x, x]), q.type, 'All types')}
        ${sel('crm-ci', ['C1', 'C2', 'C3', 'C4'].map(x => [x, x]), q.circle, 'All circles')}
        ${sel('crm-s', stages.seller.map(s => [s.name, s.name]), q.stage, 'Any stage')}
        ${sel('crm-o', [['fit', 'Best fit first'], ['name', 'Name A–Z'], ['new', 'Newest first']], q.sort === 'reply' ? '' : q.sort, 'Latest reply first')}
        <button class="btn" id="crm-csv">Export</button><button class="btn pri" id="crm-new">+ Contact</button></div>
      <div class="glass panel" id="crm-list"><div class="hint">Loading…</div></div></div></div>`;
    let t;
    v.querySelector('#crm-q').oninput = e => { clearTimeout(t); t = setTimeout(() => { q.text = e.target.value; q.page = 0; list() }, 250) };
    [['#crm-t', 'type'], ['#crm-ci', 'circle'], ['#crm-s', 'stage'], ['#crm-show', 'show'], ['#crm-o', 'sort']].forEach(([s, k]) => v.querySelector(s).onchange = e => { q[k] = e.target.value || (k === 'sort' ? 'reply' : ''); q.page = 0; list() });
    v.querySelector('#crm-csv').onclick = exportCsv;
    v.querySelector('#crm-new').onclick = newContact;
    v.querySelectorAll('.glass').forEach((e, i) => e.style.animationDelay = i * 35 + 'ms');
    list(); stats();
  }
  async function stats() {  // real counts straight from the CRM, no estimates
    const n = r => r.then(x => x.count ?? 0), all = sb.from('contacts').select('id', {count: 'exact', head: true}).neq('list', 'GHL');  // GHL imports are not List 1 owners
    const [tot, rep, pos, pip] = await Promise.all([n(all), n(sb.from('contacts').select('id', {count: 'exact', head: true}).not('last_inbound_at', 'is', null)),
      n(sb.from('contacts').select('id', {count: 'exact', head: true}).contains('tags', ['positive'])), n(sb.from('deals').select('id', {count: 'exact', head: true}).is('lost_reason', null).eq('pipeline', 'seller'))]);
    const box = document.getElementById('crm-ck'); if (!box) return;
    box.innerHTML = kpi('Owners in the CRM', fmt(tot), 'owners on file') + kpi('Replied', fmt(rep), pctf(rep, tot) + ' wrote back') +
      kpi('Positive', fmt(pos), pctf(pos, rep, 0) + ' of replies', {accent: pos}) + kpi('In the pipeline', fmt(pip), 'open owner deals');
    const z = document.getElementById('crm-zig');
    const lv = [{l: 'Owners on file', v: tot, s: 'every owner in the CRM'}, {l: 'Replied', v: rep, s: 'wrote back'}, {l: 'Positive', v: pos, s: 'want to talk'}, {l: 'In the pipeline', v: pip, s: 'open deals'}];
    if (z) z.innerHTML = zig(lv) + `<div class="zigl">${lv.slice().reverse().map((l, k) => `<div class="${k ? '' : 'top'}"><b>${fmt(l.v)}</b><span>${l.l}</span><em>${l.s}</em></div>`).join('')}</div>`;  // phone: numbers as tiles under the pyramid
    const {data} = await sb.from('deals').select('id,stage,value_estimate,contacts(id,full_name,first_name,last_name,email,company,owner_type)').is('lost_reason', null).eq('pipeline', 'seller');
    const g = document.getElementById('crm-gold'); if (!g) return;
    const ds = (data || []).sort((a, b) => (+b.value_estimate || 0) - (+a.value_estimate || 0)), mx = Math.max(1, ...ds.map(d => +d.value_estimate || 0));
    g.innerHTML = ds.length ? ds.map((d, i) => { const c = d.contacts || {}, v = +d.value_estimate || 0;
      return `<div class="gr ${i ? '' : 'top'}" data-c="${c.id}"><div class="who">${orb(c)}<div><b>${esc(name(c))}</b><small>${esc(c.company || c.owner_type || '')}</small></div></div><span class="pill">${esc(d.stage)}</span><div class="gv"><b>${v ? money(v) : '—'}</b><i style="width:${100 * v / mx}%"></i></div></div>` }).join('')
      : '<div class="hint">No open deals yet</div>';
    g.querySelectorAll('[data-c]').forEach(r => r.onclick = () => open(r.dataset.c));
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
    if (q.show === 'bbs') r = r.contains('tags', ['bizbuysell']);
    if (q.show === 'ghlr') r = r.contains('tags', ['ghl_replied']);
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
      data.map(c => `<div class="row" data-c="${c.id}"><div class="who">${orb(c)}<div>${esc(name(c))}<small>${esc(c.email)}</small></div></div><div>${esc(c.company || '')}<small>${esc(c.city || '')}</small></div><div>${esc(c.owner_type || '')} ${c.circle ? `<span class="tag">${esc(c.circle)}</span>` : ''}</div><div>${fit(c.fit_score)}</div><div>${(st => st ? `<span class="pill">${esc(st)}</span>` : '—')((c.deals?.find(d => d.pipeline === 'seller') || c.deals?.[0])?.stage)}<small style="margin-top:4px">${tags(c)}</small></div><div class="${c.last_inbound_at ? '' : 'hint'}">${c.last_inbound_at ? wait(hrs(c.last_inbound_at)) + ' ago' : '—'}</div></div>`).join('')
      : empty('No owners match these filters')) +
      `<div class="tb" style="margin:14px 0 0;justify-content:space-between"><span class="hint">${fmt(count)} contacts${count > PAGE ? ` · page ${q.page + 1} of ${Math.ceil(count / PAGE)}` : ''}</span><span><button class="btn" data-pg="-1" ${q.page ? '' : 'disabled'}>← Prev</button> <button class="btn" data-pg="1" ${(q.page + 1) * PAGE >= count ? 'disabled' : ''}>Next →</button></span></div>`;
    box.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { q.page += +b.dataset.pg; list(); document.getElementById('main')?.scrollTo(0, 0) });
    bindRows(box);
  }

  async function exportCsv() {
    const cols = ['full_name', 'email', 'phone', 'company', 'owner_type', 'circle', 'fit_score', 'street', 'city', 'zip', 'website', 'last_inbound_at'];
    const data = [];
    for (let i = 0; ; i += 1000) { const {data: d, error} = await (await query(cols.join(','))).r.range(i, i + 999); if (fail(error)) return; data.push(...d); if (d.length < 1000) break }
    const cell = x => { const s = Array.isArray(x) ? x.join(' ') : String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s };
    const rows = [cols.concat('stage').join(',')].concat(data.map(c => cols.map(k => cell(c[k])).concat(cell((c.deals?.find(d => d.pipeline === 'seller') || c.deals?.[0])?.stage)).join(',')));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], {type: 'text/csv'}));
    a.download = `newton-contacts-${dayKey(Date.now())}.csv`; a.click(); URL.revokeObjectURL(a.href);
    flash(`Exported ${data.length} contacts`);
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
    const deal = (deals || []).find(x => x.pipeline === 'seller') || (deals || []).find(x => x.pipeline === 'buyer'), tags = c.tags || [], cold = tags.includes('not_interested');
    const waiting = c.last_inbound_at && (!c.last_outbound_at || c.last_outbound_at < c.last_inbound_at);
    const kv = (k, val, href) => val || val === 0 ? `<span>${k}</span><div>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(val)}</a>` : esc(val)}</div>` : '';
    const site = c.website && (/^https?:/.test(c.website) ? c.website : 'https://' + c.website);
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start;gap:12px"><div><h2>${esc(name(c))}</h2><div class="hint">${esc(c.title || '')}${c.title && c.company ? ' · ' : ''}${esc(c.company || '')}${c.city ? ' · ' + esc(c.city) : ''}</div>
        <div style="margin-top:7px">${tags.map(t => `<span class="tag ${t === 'positive' ? 'hot' : t === 'not_interested' ? 'cold' : ''}">${esc(t.replace(/_/g, ' '))}</span>`).join('')}${waiting ? `<span class="tag hot">waiting ${wait(hrs(c.last_inbound_at))}</span>` : ''}</div></div><button class="btn" data-x>Close</button></div>
      <div class="tb" style="margin:16px 0 0"><a class="btn pri" href="mailto:${esc(c.email)}">Email</a>${c.phone ? `<a class="btn" href="tel:${esc(c.phone)}">Call ${esc(c.phone)}</a>` : ''}${waiting ? '<button class="btn" data-replied>✓ Replied</button>' : ''}
        <button class="btn" data-held>Call held</button><button class="btn" data-noshow>No-show</button><button class="btn" data-cold>${cold ? 'Mark interested again' : 'Not interested'}</button></div>
      <div data-extra></div>
      <h5>Deal</h5><div class="box">${deal ? `<form class="fg" data-deal action="javascript:void 0">
          <label>Stage<select name="stage">${(stages[deal.pipeline] || stages.seller).map(s => `<option ${s.name === deal.stage ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
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
    const deal0 = stage => deal ? sb.from('deals').update({stage: deal.pipeline === 'buyer' ? ({'Discovery Call Held': 'Showing / Buyer Meeting'}[stage] || deal.stage) : stage}).eq('id', deal.id) : sb.from('deals').insert({contact_id: id, pipeline: 'seller', stage});
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
