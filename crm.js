/* NEWTON CRM tab — Today · Pipeline · Contacts. Talks to Supabase with Issac's login.
   The anon key below is public by design: row-level security lets only crm_users read or write. */
const CRM_CFG = {
  url: 'https://veuferyylpblpcoogzly.supabase.co',      // https://<ref>.supabase.co   ← set at deploy (scripts/issac/crm/deploy.py)
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZldWZlcnl5bHBibHBjb29nemx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MjczNzIsImV4cCI6MjEwOTMwMzM3Mn0.EctXlOzAtMQCxXGVbpazfbFT5_Wbnhj4qSN0g5bM-o0',     // anon public key
  book: '',
};

const CRM = (() => {
  let sb = null, view = 'today', pipe = 'seller', stages = {}, q = {text: '', type: '', circle: '', stage: '', page: 0};
  const PAGE = 50;
  const $c = s => document.querySelector('#crm ' + s);
  const name = c => c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email;
  const hrs = iso => iso ? (Date.now() - new Date(iso)) / 36e5 : null;
  const wait = h => h == null ? '—' : h < 1 ? Math.round(h * 60) + 'm' : h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd';
  const when = iso => new Date(iso).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

  const css = `
#crm .tabs{display:flex;gap:6px;margin-bottom:14px}
#crm .tabs button,#crm .btn{font:12px var(--sans);color:var(--ink2);background:rgba(255,255,255,.04);border:1px solid var(--line2);border-radius:999px;padding:6px 14px;cursor:pointer}
#crm .tabs button.on,#crm .btn.pri{background:var(--sig);border-color:var(--sig);color:#fff}
#crm .btn:hover{border-color:var(--ink2)}
#crm input,#crm select,#crm textarea{font:12.5px var(--sans);color:var(--ink);background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:10px;padding:7px 10px}
#crm textarea{width:100%;min-height:70px;resize:vertical}
#crm .bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
#crm .bar input[type=search]{flex:1;min-width:200px}
#crm .row{display:grid;grid-template-columns:1.4fr 1.2fr .7fr .5fr 1fr .6fr;gap:10px;padding:9px 6px;border-bottom:1px solid var(--line);cursor:pointer;align-items:center}
#crm .row:hover{background:rgba(255,255,255,.03)}
#crm .row.h{color:var(--mute);font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;cursor:default}
#crm .row small{display:block;color:var(--mute)}
#crm .late{color:var(--err);font-weight:600}
#crm .tag{display:inline-block;font:9.5px var(--mono);padding:1px 7px;border-radius:999px;border:1px solid var(--line2);color:var(--ink2);margin-right:4px}
#crm .kb{display:flex;gap:10px;overflow-x:auto;padding-bottom:10px}
#crm .col{flex:0 0 210px;background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:14px;padding:10px;min-height:300px}
#crm .col.over{border-color:var(--sig)}
#crm .col h4{font:10px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin-bottom:8px;display:flex;justify-content:space-between}
#crm .card{background:rgba(0,0,0,.35);border:1px solid var(--line2);border-radius:10px;padding:8px 10px;margin-bottom:7px;cursor:grab}
#crm .card b{display:block;font-weight:500}#crm .card small{color:var(--mute)}
#crm .drawer{position:fixed;top:0;right:0;bottom:0;width:min(560px,100vw);background:#0d0c0c;border-left:1px solid var(--line2);z-index:50;overflow-y:auto;padding:22px 24px;box-shadow:-30px 0 60px rgba(0,0,0,.5)}
#crm .drawer h2{font-weight:500;font-size:20px;margin-bottom:2px}
#crm .drawer h5{font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin:18px 0 8px}
#crm .kv{display:grid;grid-template-columns:130px 1fr;gap:4px 10px;font-size:12.5px}#crm .kv span{color:var(--mute)}
#crm .act{border-left:2px solid var(--line2);padding:4px 0 10px 12px;margin-left:4px}
#crm .act.email_in{border-color:var(--sig)}#crm .act.booking{border-color:var(--ok)}
#crm .act i{font:9.5px var(--mono);color:var(--mute);font-style:normal}
#crm .act p{white-space:pre-wrap;font-size:12.5px;color:var(--ink2);margin-top:3px}
#crm .login{max-width:380px;margin:60px auto;text-align:center}
#crm .login input{width:100%;margin:14px 0 10px}
#crm .note{color:var(--mute);font-size:12px;margin-top:8px}
@media(max-width:760px){#crm .row{grid-template-columns:1fr 1fr}#crm .row>:nth-child(n+3){display:none}}`;

  function html() {
    return `<style>${css}</style><div id="crm"><div id="crm-body"><div class="note">Loading CRM…</div></div></div>`;
  }

  async function draw() {
    const body = document.getElementById('crm-body');
    if (!CRM_CFG.url || !CRM_CFG.anon) { body.innerHTML = empty('CRM backend not connected yet', 'scripts/issac/crm/deploy.py'); return }
    if (!sb) sb = window.supabase.createClient(CRM_CFG.url, CRM_CFG.anon);
    const {data: {session}} = await sb.auth.getSession();
    if (!session && typeof D !== 'undefined' && D && D.crm_login) {
      const {error} = await sb.auth.signInWithPassword(D.crm_login);  // the site password already let him in
      if (!error) return draw();
    }
    if (!session) return login(body);
    if (!Object.keys(stages).length) {
      const {data, error} = await sb.from('stages').select('*').order('pos');
      if (error || !data.length) { body.innerHTML = empty('This login has no access to the CRM', session.user.email); return }
      data.forEach(s => (stages[s.pipeline] ||= []).push(s));
    }
    body.innerHTML = `<div class="tabs">${['today', 'pipeline', 'contacts'].map(v => `<button data-v="${v}" class="${v === view ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}
      <span style="flex:1"></span><button data-out>Sign out</button></div><div id="crm-v"></div>`;
    body.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; draw() });
    body.querySelector('[data-out]').onclick = async () => { await sb.auth.signOut(); stages = {}; draw() };
    ({today, pipeline, contacts})[view]();
  }

  // Email + password (set by us at deploy). Supabase's built-in mailer only reaches project members, so no magic link.
  // The session is kept in this browser: Issac signs in once.
  function login(body) {
    body.innerHTML = `<form class="glass panel login" action="javascript:void 0"><h3>Sign in to your CRM</h3><p class="note">Once per device. You stay signed in.</p>
      <input type="email" id="crm-em" placeholder="Email" autocomplete="username"><input type="password" id="crm-pw" placeholder="Password" autocomplete="current-password" style="width:100%;margin:0 0 10px">
      <button class="btn pri" id="crm-go">Sign in</button><div class="note" id="crm-msg"></div></form>`;
    body.querySelector('form').onsubmit = async e => {
      e.preventDefault();  // an async handler returns a Promise, which does not stop the native submit + reload
      const {error} = await sb.auth.signInWithPassword({email: body.querySelector('#crm-em').value.trim(), password: body.querySelector('#crm-pw').value});
      if (error) body.querySelector('#crm-msg').textContent = error.message; else draw();
    };
  }

  /* ---------- Today ---------- */
  async function today() {
    const v = document.getElementById('crm-v');
    const [w, t, r] = await Promise.all([
      sb.from('v_waiting').select('*'),
      sb.from('tasks').select('*, contacts(id,full_name,email,company)').eq('done', false).order('due_at'),
      sb.from('activities').select('at,body,subject,contacts(id,full_name,first_name,email,company)').eq('type', 'email_in').order('at', {ascending: false}).limit(15),
    ]);
    const waiting = w.data || [], late = waiting.filter(x => x.hours_waiting > 2).length;
    v.innerHTML = `<div class="g">
      <div class="s12 kpis">${kpi('Waiting on you', waiting.length, 'owners who wrote last', {accent: late})}${kpi('Over 2 hours', late, 'reply first')}${kpi('Open tasks', (t.data || []).length, 'calls, rebooks, follow-ups')}</div>
      ${panel({span: 7, title: 'Waiting on your reply', sub: 'Oldest first. Red = over 2 hours.', body: waiting.length ? `<div class="row h"><div>Owner</div><div>Business</div><div>Type</div><div>Waiting</div><div>Stage</div><div></div></div>` + waiting.map(x =>
        `<div class="row" data-c="${x.id}"><div>${esc(name(x))}</div><div>${esc(x.company || '')}</div><div>${esc(x.owner_type || '')}</div><div class="${x.hours_waiting > 2 ? 'late' : ''}">${wait(x.hours_waiting)}</div><div>${esc(x.stage || '—')}</div><div></div></div>`).join('') : empty('Nobody is waiting on you')})}
      ${panel({span: 5, title: 'Tasks', sub: 'Open, by due date', body: (t.data || []).length ? (t.data).map(k =>
        `<div class="row" style="grid-template-columns:auto 1fr auto" data-c="${k.contact_id || ''}"><input type="checkbox" data-done="${k.id}"><div>${esc(k.title)}<small>${esc(k.contacts ? name(k.contacts) : '')}</small></div><div class="${k.due_at && hrs(k.due_at) > 0 ? 'late' : ''}">${k.due_at ? when(k.due_at) : ''}</div></div>`).join('') : empty('No open tasks')})}
      ${panel({span: 12, title: 'Latest replies', sub: 'Everything owners wrote back, newest first', body: (r.data || []).map(a =>
        `<div class="row" style="grid-template-columns:1fr 1.2fr 3fr .8fr" data-c="${a.contacts?.id}"><div>${esc(a.contacts ? name(a.contacts) : '')}</div><div>${esc(a.contacts?.company || '')}</div><div>${esc((a.body || '').slice(0, 140))}</div><div>${when(a.at)}</div></div>`).join('') || empty('No replies yet')})}
    </div>`;
    v.querySelectorAll('[data-done]').forEach(cb => cb.onclick = async e => { e.stopPropagation(); await sb.from('tasks').update({done: true}).eq('id', cb.dataset.done); today() });
    bindRows(v);
  }

  /* ---------- Pipeline (kanban, drag = stage change) ---------- */
  async function pipeline() {
    const v = document.getElementById('crm-v');
    const {data} = await sb.from('deals').select('id,stage,updated_at,value_estimate,next_action_at,contacts(id,full_name,first_name,email,company,owner_type)').eq('pipeline', pipe);
    const by = {}; (data || []).forEach(d => (by[d.stage] ||= []).push(d));
    v.innerHTML = `<div class="bar"><select id="crm-pipe"><option value="seller">Seller pipeline</option><option value="buyer" ${pipe === 'buyer' ? 'selected' : ''}>Buyer pipeline</option></select>
      <span class="note">Drag a card to move it. Every move is logged on the contact.</span></div>
      <div class="kb">${stages[pipe].map(s => `<div class="col" data-stage="${esc(s.name)}"><h4><span>${esc(s.name)}</span><span>${(by[s.name] || []).length}</span></h4>
        ${(by[s.name] || []).map(d => `<div class="card" draggable="true" data-deal="${d.id}" data-c="${d.contacts.id}"><b>${esc(name(d.contacts))}</b><small>${esc(d.contacts.company || '')} · ${esc(d.contacts.owner_type || '')}</small><br><small>${d.next_action_at ? 'Call ' + when(d.next_action_at) : 'in stage ' + wait(hrs(d.updated_at))}</small></div>`).join('')}</div>`).join('')}</div>`;
    v.querySelector('#crm-pipe').onchange = e => { pipe = e.target.value; pipeline() };
    v.querySelectorAll('.card').forEach(c => {
      c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.deal);
      c.onclick = () => open(c.dataset.c);
    });
    v.querySelectorAll('.col').forEach(col => {
      col.ondragover = e => { e.preventDefault(); col.classList.add('over') };
      col.ondragleave = () => col.classList.remove('over');
      col.ondrop = async e => {
        e.preventDefault(); col.classList.remove('over');
        const {error} = await sb.from('deals').update({stage: col.dataset.stage}).eq('id', e.dataTransfer.getData('text/plain'));
        if (error) alertBox(error.message); pipeline();
      };
    });
  }

  /* ---------- Contacts ---------- */
  async function contacts() {
    const v = document.getElementById('crm-v');
    const circles = ['C1', 'C2', 'C3', 'C4'];
    v.innerHTML = `<div class="bar"><input type="search" id="crm-q" placeholder="Search name, business, email" value="${esc(q.text)}">
      <select id="crm-t"><option value="">All types</option>${['Both', 'Business', 'Property'].map(x => `<option ${q.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <select id="crm-ci"><option value="">All circles</option>${circles.map(x => `<option ${q.circle === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <select id="crm-s"><option value="">Any stage</option><option value="__any" ${q.stage === '__any' ? 'selected' : ''}>In pipeline</option>${stages.seller.map(s => `<option ${q.stage === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="glass panel" id="crm-list"><div class="note">Loading…</div></div>`;
    let t;
    v.querySelector('#crm-q').oninput = e => { clearTimeout(t); t = setTimeout(() => { q.text = e.target.value; q.page = 0; list() }, 250) };
    [['#crm-t', 'type'], ['#crm-ci', 'circle'], ['#crm-s', 'stage']].forEach(([s, k]) => v.querySelector(s).onchange = e => { q[k] = e.target.value; q.page = 0; list() });
    list();
  }

  async function list() {
    const box = document.getElementById('crm-list');
    const join = q.stage ? 'deals!inner(stage,pipeline)' : 'deals(stage,pipeline)';
    let r = sb.from('contacts').select(`id,email,full_name,first_name,company,owner_type,circle,fit_score,city,last_inbound_at,tags,${join}`, {count: 'exact'});
    if (q.text) { const s = q.text.replace(/[%,()]/g, ' ').trim(); r = r.or(`full_name.ilike.%${s}%,company.ilike.%${s}%,email.ilike.%${s}%`) }
    if (q.type) r = r.eq('owner_type', q.type);
    if (q.circle) r = r.eq('circle', q.circle);
    if (q.stage && q.stage !== '__any') r = r.eq('deals.stage', q.stage);
    const {data, count, error} = await r.order('last_inbound_at', {ascending: false, nullsFirst: false}).order('fit_score', {ascending: false, nullsFirst: false}).range(q.page * PAGE, q.page * PAGE + PAGE - 1);
    if (error) { box.innerHTML = empty(error.message); return }
    box.innerHTML = `<div class="row h"><div>Owner</div><div>Business</div><div>Type</div><div>Fit</div><div>Stage</div><div>Last reply</div></div>` +
      data.map(c => `<div class="row" data-c="${c.id}"><div>${esc(name(c))}<small>${esc(c.email)}</small></div><div>${esc(c.company || '')}<small>${esc(c.city || '')}</small></div><div>${esc(c.owner_type || '')} <span class="tag">${esc(c.circle || '')}</span></div><div>${c.fit_score ?? '—'}</div><div>${esc(c.deals?.[0]?.stage || '—')}</div><div>${c.last_inbound_at ? wait(hrs(c.last_inbound_at)) + ' ago' : '—'}</div></div>`).join('') +
      `<div class="bar" style="margin-top:12px;justify-content:space-between"><span class="note">${fmt(count)} owners</span><span><button class="btn" data-pg="-1" ${q.page ? '' : 'disabled'}>← Prev</button> <button class="btn" data-pg="1" ${(q.page + 1) * PAGE >= count ? 'disabled' : ''}>Next →</button></span></div>`;
    box.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { q.page += +b.dataset.pg; list() });
    bindRows(box);
  }

  const bindRows = root => root.querySelectorAll('.row[data-c]').forEach(r => r.onclick = e => { if (r.dataset.c && e.target.tagName !== 'INPUT') open(r.dataset.c) });

  /* ---------- Contact page (drawer) ---------- */
  async function open(id) {
    document.querySelector('#crm .drawer')?.remove();
    const [{data: c}, {data: acts}, {data: files}, {data: deals}] = await Promise.all([
      sb.from('contacts').select('*').eq('id', id).single(),
      sb.from('activities').select('*').eq('contact_id', id).order('at', {ascending: false}),
      sb.from('files').select('*').eq('contact_id', id),
      sb.from('deals').select('*').eq('contact_id', id),
    ]);
    const deal = (deals || []).find(d => d.pipeline === 'seller');
    const kv = (k, val) => val || val === 0 ? `<span>${k}</span><div>${esc(val)}</div>` : '';
    const d = document.createElement('div'); d.className = 'drawer';
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start"><div><h2>${esc(name(c))}</h2><div class="note">${esc(c.title || '')}${c.title ? ' · ' : ''}${esc(c.company || '')}</div>
        <div style="margin-top:6px">${(c.tags || []).map(t => `<span class="tag">${esc(t.replace(/_/g, ' '))}</span>`).join('')}</div></div><button class="btn" data-x>Close</button></div>
      <h5>Stage</h5><div class="bar">${deal ? `<select data-stage>${stages.seller.map(s => `<option ${s.name === deal.stage ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : `<button class="btn pri" data-add>Add to seller pipeline</button>`}
        <button class="btn" data-held>Call held</button><button class="btn" data-noshow>No-show</button><a class="btn" href="mailto:${esc(c.email)}">Email</a>${c.phone ? `<a class="btn" href="tel:${esc(c.phone)}">Call ${esc(c.phone)}</a>` : ''}</div>
      <h5>Business + property</h5><div class="kv">${kv('Email', c.email)}${kv('Phone', c.phone)}${kv('Owner type', c.owner_type)}${kv('Legal name', c.company_legal)}${kv('Address', [c.street, c.city, c.zip].filter(Boolean).join(', '))}${kv('Website', c.website)}${kv('In business', c.years_in_business && c.years_in_business + ' years')}${kv('Owned', c.years_owned && c.years_owned + ' years')}${kv('Circle · fit', [c.circle, c.fit_score].filter(Boolean).join(' · '))}${kv('Campaign', c.campaign)}${kv('Offer', c.offer)}</div>
      ${(files || []).length ? `<h5>Files</h5>${files.map(f => `<div><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title || f.kind)}</a></div>`).join('')}` : ''}
      <h5>Notes</h5><textarea data-notes>${esc(c.owner_notes || '')}</textarea><div class="bar" style="margin-top:6px"><button class="btn" data-save>Save notes</button><span class="note" data-saved></span></div>
      <h5>Add to timeline</h5><textarea data-new placeholder="Call notes, what they said, next step"></textarea>
      <div class="bar" style="margin-top:6px"><button class="btn" data-log="note">Add note</button><button class="btn" data-log="call">Log call</button>
        <input type="datetime-local" data-due><input data-task placeholder="Task (e.g. send valuation)"><button class="btn" data-addtask>Add task</button></div>
      <div data-extra></div>
      <h5>Timeline</h5>${(acts || []).map(a => `<div class="act ${a.type}"><i>${a.type.replace('_', ' ')} · ${when(a.at)}${a.source ? ' · ' + a.source : ''}</i>${a.subject ? `<p><b>${esc(a.subject)}</b></p>` : ''}${a.body ? `<p>${esc(a.body)}</p>` : ''}</div>`).join('') || '<div class="note">Nothing yet</div>'}`;
    document.getElementById('crm').appendChild(d);

    const reopen = () => open(id);
    d.querySelector('[data-x]').onclick = () => d.remove();
    d.querySelector('[data-stage]')?.addEventListener('change', async e => { await sb.from('deals').update({stage: e.target.value}).eq('id', deal.id); reopen() });
    d.querySelector('[data-add]')?.addEventListener('click', async () => { await sb.from('deals').insert({contact_id: id, pipeline: 'seller', stage: 'Interested'}); reopen() });
    d.querySelector('[data-held]').onclick = async () => {
      if (deal) await sb.from('deals').update({stage: 'Discovery Call Held'}).eq('id', deal.id);
      else await sb.from('deals').insert({contact_id: id, pipeline: 'seller', stage: 'Discovery Call Held'});
      reopen();
    };
    d.querySelector('[data-noshow]').onclick = async () => {
      // replaces the GHL No-Show workflow: logs it, sets a task, hands Issac the rebook email (sent from his Gmail)
      await sb.from('activities').insert({contact_id: id, type: 'no_show', body: 'Missed the call', source: 'crm'});
      await sb.from('tasks').insert({contact_id: id, title: 'No-show: send the rebook email', due_at: new Date().toISOString()});
      const first = c.first_name ? c.first_name[0] + c.first_name.slice(1).toLowerCase() : 'there';
      const txt = `Hi ${first},\n\nSorry we missed each other today. Things come up, no problem at all.\n\n${CRM_CFG.book ? `Here is my calendar to pick a new time that suits you: ${CRM_CFG.book}` : 'What day and time work better for you this week?'}\n\nIssac`;
      await reopen();
      document.querySelector('#crm .drawer [data-extra]').innerHTML = `<h5>Rebook email (copy into Gmail)</h5><textarea readonly style="min-height:150px">${esc(txt)}</textarea>
        <div class="bar" style="margin-top:6px"><a class="btn pri" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Rebooking our call')}&body=${encodeURIComponent(txt)}">Open in email</a></div>`;
    };
    d.querySelector('[data-save]').onclick = async () => {
      const {error} = await sb.from('contacts').update({owner_notes: d.querySelector('[data-notes]').value}).eq('id', id);
      d.querySelector('[data-saved]').textContent = error ? error.message : 'Saved';
    };
    d.querySelectorAll('[data-log]').forEach(b => b.onclick = async () => {
      const body = d.querySelector('[data-new]').value.trim(); if (!body) return;
      await sb.from('activities').insert({contact_id: id, type: b.dataset.log, body, source: 'crm'}); reopen();
    });
    d.querySelector('[data-addtask]').onclick = async () => {
      const title = d.querySelector('[data-task]').value.trim(), due = d.querySelector('[data-due]').value; if (!title) return;
      await sb.from('tasks').insert({contact_id: id, title, due_at: due ? new Date(due).toISOString() : null}); reopen();
    };
  }

  const alertBox = m => { const b = document.getElementById('crm-v'); b.insertAdjacentHTML('afterbegin', `<div class="note late">${esc(m)}</div>`) };

  return {html, draw};
})();

function pCrm() { return {html: CRM.html(), draw: CRM.draw} }
