/* NEWTON CRM — Team page. Issac's follow-up agents as staff in a 3D office.
   Overview of the whole team + click a person (3D or card) to zoom into their own performance.
   Read-only: nothing here switches an agent on or sends an email. Real data only (agents + followups + live CRM). */
const TEAM = (() => {
  const THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
  const SKIN = 0xf3a46c, SKIN_D = 0xd9824c;
  // look per agent: shirt, under-shirt, pants, shoes, hair, extras
  const LOOK = {
    flash: {shirt: 0xe42b0c, under: 0xf3efeb, pants: 0x1c1a19, shoe: 0xefe6da, hair: 0x1a1414, cap: 0x141212, glasses: false, beard: false, cup: true},
    reva:  {shirt: 0xff8a3d, under: 0xf6efe6, pants: 0x2a2523, shoe: 0x1a1817, hair: 0x5a2e1a, style: 'long'},
    nadia: {shirt: 0xf3efeb, under: 0xffc38a, pants: 0x55504c, shoe: 0xe42b0c, hair: 0x1b1515, style: 'bun', glasses: true, cup: true},
    tess:  {shirt: 0xffc38a, under: 0xf3efeb, pants: 0x1c1a19, shoe: 0xefe6da, hair: 0xb8542a, style: 'bob'},
    milo:  {shirt: 0x2b2725, under: 0xe42b0c, pants: 0x8e8882, shoe: 0x141212, hair: 0x2a1c16, cap: 0xe42b0c, beard: true},
    dex:   {shirt: 0xb85a1e, under: 0xf3efeb, pants: 0x1c1a19, shoe: 0xefe6da, hair: 0x141212, glasses: true, beard: true, cup: true},
    jada:  {shirt: 0x8f1c08, under: 0xffc38a, pants: 0xf3efeb, shoe: 0x1a1817, hair: 0x120e0e, style: 'long', glasses: false},
    ray:   {shirt: 0x8e8882, under: 0x1c1a19, pants: 0x2b2725, shoe: 0xe42b0c, hair: 0x3a2a20, glasses: true},
  };
  const TARGET = {reply: .10, book: .03};   // score = 50% reply rate vs 10% + 50% calls booked vs 3% of emails
  let sb = null, A = [], S = {}, DESK = {}, sel = null, three = null;

  const css = `
#team{display:grid;gap:14px}
#team .stage{position:relative;height:min(62vh,600px);min-height:380px;border-radius:18px;overflow:hidden;border:1px solid var(--line2);
  background:radial-gradient(900px 420px at 50% 0%,rgba(228,43,12,.18),transparent 70%),#0b0a0a}
#team canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:pan-y}
#team .tag{position:absolute;left:0;top:0;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;white-space:nowrap;text-align:center;
  font:600 10.5px var(--mono);letter-spacing:.12em;padding:5px 9px;border-radius:999px;background:rgba(10,9,9,.78);border:1px solid var(--line2);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:opacity .25s,border-color .2s}
#team .tag i{display:block;font:400 9px var(--mono);letter-spacing:.06em;color:var(--mute);font-style:normal;margin-top:1px}
#team .tag b::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--dim);margin-right:6px;vertical-align:1px}
#team .tag.on b::before{background:var(--ok);box-shadow:0 0 8px var(--ok)}
#team .tag:hover,#team .tag.sel{border-color:var(--sig)}
#team .stage.zoom .tag{opacity:0;pointer-events:none}
#team .hud{position:absolute;left:16px;top:14px;right:16px;display:flex;justify-content:space-between;gap:10px;pointer-events:none}
#team .hud .pill{pointer-events:auto}
#team .hint2{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font:10px var(--mono);color:var(--ink2);padding:5px 12px;border-radius:999px;background:rgba(10,9,9,.7);white-space:nowrap;letter-spacing:.1em;pointer-events:none;transition:opacity .3s}
#team .stage.zoom .hint2{opacity:0}
#team .det{position:absolute;top:12px;right:12px;bottom:12px;width:min(410px,calc(100% - 24px));overflow-y:auto;padding:18px 18px 16px;border-radius:16px;
  background:rgba(12,10,10,.86);border:1px solid var(--line2);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  transform:translateX(calc(100% + 24px));transition:transform .45s cubic-bezier(.2,.8,.2,1);scrollbar-width:thin}
#team .stage.zoom .det{transform:none}
#team .det .x{position:absolute;top:12px;right:12px;font:10px var(--mono);letter-spacing:.1em;padding:6px 10px;border-radius:999px;border:1px solid var(--line2);background:none;color:var(--ink2);cursor:pointer}
#team .det .x:hover{border-color:var(--sig);color:var(--ink)}
#team .tm-n{font:600 26px var(--sans);letter-spacing:-.01em}
#team .dr{font:10px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--amber);margin-top:2px}
#team .tm-st{display:inline-flex;align-items:center;gap:7px;font:10px var(--mono);padding:5px 10px;border-radius:999px;border:1px solid var(--line2);color:var(--mute);margin-top:10px}
#team .tm-st::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--dim)}
#team .tm-st.on{color:var(--ok);border-color:rgba(95,211,154,.4)}#team .tm-st.on::before{background:var(--ok);box-shadow:0 0 8px var(--ok)}
#team .job{color:var(--ink2);font-size:13px;margin:12px 0 4px}
#team .k{font:9.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin:16px 0 8px}
#team .flow{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;font-size:12px;color:var(--ink2)}
#team .flow span{font:9.5px var(--mono);color:var(--mute);letter-spacing:.08em;text-transform:uppercase;padding-top:2px}
#team .kg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#team .kg div{border:1px solid var(--line);border-radius:12px;padding:9px 10px;background:rgba(255,255,255,.02)}
#team .kg b{display:block;font:500 20px var(--sans);letter-spacing:-.01em}
#team .kg i{font:9px var(--mono);color:var(--mute);font-style:normal;letter-spacing:.08em;text-transform:uppercase}
#team .tm-ring{display:flex;gap:14px;align-items:center}
#team .tm-ring p{font-size:12px;color:var(--ink2)}
#team .desk{display:grid;gap:6px}
#team .desk div{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:7px 10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.015)}
#team .desk em{font:10px var(--mono);color:var(--mute);font-style:normal;white-space:nowrap}
#team .none{font-size:12px;color:var(--mute);padding:8px 0}
#team .ov{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
#team .ov .glass{padding:14px 16px}
#team .ov b{display:block;font:500 26px var(--sans);letter-spacing:-.02em;margin-top:6px}
#team .ov i{font:9.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-style:normal}
#team .ov p{font-size:11.5px;color:var(--mute);margin-top:2px}
#team .roster{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
#team .card{padding:14px 15px 13px;cursor:pointer;transition:transform .2s,border-color .2s}
#team .card:hover{transform:translateY(-2px);border-color:rgba(228,43,12,.5)}
#team .card .ct{display:flex;gap:11px;align-items:center}
#team .av{width:42px;height:42px;border-radius:12px;flex:none;display:grid;place-items:center;font:600 15px var(--sans);color:#160b07}
#team .card h4{font:600 14px var(--sans);letter-spacing:.04em}
#team .card .rl{font:9.5px var(--mono);color:var(--mute);letter-spacing:.1em;text-transform:uppercase}
#team .card .now{font-size:12px;color:var(--ink2);margin:10px 0 9px;min-height:36px}
#team .card .mx{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;border-top:1px solid var(--line);padding-top:9px}
#team .card .mx b{display:block;font:500 15px var(--sans)}
#team .card .mx i{font:8.5px var(--mono);color:var(--mute);font-style:normal;letter-spacing:.06em;text-transform:uppercase}
#team .tm-bar{height:4px;border-radius:4px;background:rgba(255,255,255,.06);margin-top:10px;overflow:hidden}
#team .tm-bar span{display:block;height:100%;background:linear-gradient(90deg,var(--sig),var(--amber));border-radius:inherit}
#team .lb{width:100%;border-collapse:collapse;font-size:12.5px}
#team .lb th{font:9.5px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute);text-align:right;font-weight:400;padding:0 10px 9px}
#team .lb th:first-child,#team .lb td:first-child,#team .lb th:nth-child(2),#team .lb td:nth-child(2){text-align:left}
#team .lb td{padding:10px;border-top:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
#team .lb tr{cursor:pointer}#team .lb tbody tr:hover td{background:rgba(255,255,255,.025)}
#team .tn{font-size:12px;color:var(--mute);padding:4px 2px}
@media(max-width:1100px){#team .ov{grid-template-columns:repeat(3,minmax(0,1fr))}#team .roster{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){#team .stage{height:auto;min-height:0}#team canvas{height:330px}#team .det{position:relative;inset:auto;width:auto;margin:0 10px 10px;transform:none;display:none}
  #team .stage.zoom .det{display:block}#team .ov{grid-template-columns:repeat(2,minmax(0,1fr))}#team .roster{grid-template-columns:1fr}#team .lb .hm{display:none}}`;

  /* ---------- helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const n = v => (v || 0).toLocaleString('en-US');
  const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '—';
  const cname = c => c ? c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || c.email : '';
  const ago = iso => { if (!iso) return ''; const h = (Date.now() - new Date(iso)) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + 'm' : h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd' };
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  const score = s => s.sent ? Math.round(50 * Math.min(1, s.replies / s.sent / TARGET.reply) + 50 * Math.min(1, s.booked / s.sent / TARGET.book)) : null;
  const ring = (v, size = 64) => { const r = size / 2 - 5, L = 2 * Math.PI * r, f = v == null ? 0 : v / 100;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--sig)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${L * f} ${L}" opacity="${f ? 1 : 0}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="var(--ink)" font-family="Inter,sans-serif" font-size="${size / 4}" font-weight="500">${v == null ? '—' : v}</text></svg>` };
  const status = a => a.active ? '<span class="tm-st on">Working</span>' : '<span class="tm-st">Trained · not switched on</span>';

  /* ---------- data ---------- */
  async function load() {
    const since14 = new Date(Date.now() - 14 * 864e5).toISOString(), c = 'id,full_name,first_name,last_name,email,company';
    const [ag, fu, wt, dl, nu, ns] = await Promise.all([
      sb.from('agents').select('*').order('sort'),
      sb.from('followups').select('agent,status,step,due_at,sent_at,opened_at,replied_at,booked_at,contact_id').limit(10000),
      sb.from('v_waiting').select('id,full_name,first_name,email,company,last_inbound_at'),
      sb.from('deals').select(`stage,updated_at,contacts(${c},last_inbound_at,last_outbound_at,tags)`).eq('pipeline', 'seller').is('lost_reason', null),
      sb.from('contacts').select(c).contains('tags', ['nurture']).limit(500),
      sb.from('activities').select(`at,contacts(${c})`).eq('type', 'no_show').gte('at', since14),
    ]);
    const err = [ag, fu, wt, dl, nu, ns].find(r => r.error);
    if (err) throw new Error(err.error.message);
    A = ag.data;
    S = Object.fromEntries(A.map(a => [a.id, {sent: 0, opened: 0, replies: 0, booked: 0, queued: 0, days: Array(30).fill(0)}]));
    for (const f of fu.data) { const s = S[f.agent]; if (!s) continue;
      if (f.status === 'queued' || f.status === 'approved') s.queued++;
      if (f.sent_at) { s.sent++; const d = Math.floor((Date.now() - new Date(f.sent_at)) / 864e5); if (d < 30) s.days[29 - d]++ }
      if (f.opened_at) s.opened++; if (f.replied_at) s.replies++; if (f.booked_at) s.booked++ }
    A.forEach(a => S[a.id].score = score(S[a.id]));
    // who is on each desk right now — straight from the CRM, whatever the agent's switch says
    const deals = dl.data.filter(d => d.contacts && !(d.contacts.tags || []).includes('not_interested')), at = st => deals.filter(d => st.includes(d.stage));
    const EARLY = ['Interested', 'Discovery Call Held', 'Seller Qualified'], cut = Date.now() - 3 * 864e5;
    DESK = {
      flash: wt.data.map(c => ({c, w: 'waiting ' + ago(c.last_inbound_at)})),
      reva: at(EARLY).filter(d => { const o = d.contacts.last_outbound_at, i = d.contacts.last_inbound_at; return o && new Date(o) < cut && (!i || new Date(o) > new Date(i)) })
        .map(d => ({c: d.contacts, w: 'quiet ' + ago(d.contacts.last_outbound_at)})),
      nadia: nu.data.map(c => ({c, w: 'not now'})),
      tess: at(['Discovery Call Booked']).map(d => ({c: d.contacts, w: 'call booked'})),
      milo: ns.data.filter(x => x.contacts).map(x => ({c: x.contacts, w: 'missed ' + ago(x.at)})),
      dex: at(['Documents Requested']).map(d => ({c: d.contacts, w: 'since ' + ago(d.updated_at)})),
      jada: at(['Listing Agreement Signed', 'Listing Live']).map(d => ({c: d.contacts, w: d.stage === 'Listing Live' ? 'listing live' : 'signed'})),
      ray: [],
    };
  }
  const nowLine = a => { const d = DESK[a.id] || [];
    if (a.id === 'ray') return 'Starts when Issac has a business phone line.';
    const one = d.length === 1, what = {flash: one ? 'owner waiting for an answer' : 'owners waiting for an answer', reva: one ? 'owner gone quiet' : 'owners gone quiet',
      nadia: one ? 'owner on "not now"' : 'owners on "not now"', tess: one ? 'call to confirm' : 'calls to confirm', milo: one ? 'missed call to rebook' : 'missed calls to rebook',
      dex: one ? 'deal waiting on documents' : 'deals waiting on documents', jada: one ? 'signed owner to thank' : 'signed owners to thank'}[a.id];
    return d.length ? `${d.length} ${what}${a.active ? '' : ' · on hold until switched on'}` : 'Nothing on the desk right now.' };

  /* ---------- page ---------- */
  async function render(client, v) {
    sb = client; sel = null;
    v.innerHTML = '<div class="hint">Loading the team…</div>';
    try { await load() } catch (e) { v.innerHTML = `<div class="err">Team failed to load · ${esc(e.message)}</div>`; return }
    const tot = A.reduce((t, a) => { const s = S[a.id]; t.sent += s.sent; t.rep += s.replies; t.bk += s.booked; t.q += s.queued; return t }, {sent: 0, rep: 0, bk: 0, q: 0});
    const on = A.filter(a => a.active).length, desk = new Set(Object.values(DESK).flat().map(x => x.c.id)).size, ts = score({sent: tot.sent, replies: tot.rep, booked: tot.bk});
    const rank = [...A].sort((a, b) => (S[b.id].score ?? -1) - (S[a.id].score ?? -1) || S[b.id].sent - S[a.id].sent || a.sort - b.sort);
    v.innerHTML = `<style>${css}</style><div id="team">
      <div class="stage" id="t-stage"><canvas id="t-cv"></canvas><div id="t-tags"></div>
        <div class="hud"><span class="pill">${A.length} people · ${on} working</span><span class="pill">${on ? 'Live' : 'Nothing is sent until you switch someone on'}</span></div>
        <div class="hint2">Click anyone to see how they're doing · drag to look around</div>
        <aside class="det" id="t-det"></aside></div>
      <div class="ov">
        ${[['Team', A.length, 'follow-up staff'], ['Working', on + ' / ' + A.length, on ? 'switched on' : 'ready, waiting for go-live'], ['On their desks', desk, 'owners they would handle now'],
          ['Emails sent', n(tot.sent), tot.q ? n(tot.q) + ' waiting for approval' : 'all time'], ['Replies', n(tot.rep), pct(tot.rep, tot.sent) + ' reply rate'],
          ['Calls booked', n(tot.bk), ts == null ? 'team score starts with the first email' : 'team score ' + ts + ' / 100']]
          .map(([k, b, p], i) => `<section class="glass${i === 5 ? ' kpi accent' : ''}" style="min-height:0"><i>${k}</i><b>${b}</b><p>${p}</p></section>`).join('')}
      </div>
      <div class="roster">${A.map(a => { const s = S[a.id], L = LOOK[a.id] || {};
        return `<section class="glass card" data-a="${a.id}"><div class="ct"><div class="av" style="background:${hex(L.shirt || 0xe42b0c)}">${esc(a.name[0])}</div>
          <div><h4>${esc(a.name)}</h4><div class="rl">${esc(a.role)}</div></div><div style="margin-left:auto">${ring(s.score, 40)}</div></div>
          <div class="now">${esc(nowLine(a))}</div>
          <div class="mx"><div><b>${n(s.sent)}</b><i>Sent</i></div><div><b>${n(s.replies)}</b><i>Replies</i></div><div><b>${n(s.booked)}</b><i>Calls</i></div><div><b>${(DESK[a.id] || []).length}</b><i>Desk</i></div></div>
          <div class="tm-bar"><span style="width:${s.score || 0}%"></span></div></section>` }).join('')}</div>
      <section class="glass panel" style="padding:16px 18px"><h3 style="font-weight:500;margin-bottom:4px">Performance ranking</h3>
        <p class="tn" style="margin-bottom:12px">Score out of 100: half reply rate (goal 10%), half calls booked (goal 3% of emails). Starts with each person's first email.</p>
        <div style="overflow-x:auto"><table class="lb"><thead><tr><th>#</th><th>Person</th><th class="hm">On desk</th><th>Sent</th><th class="hm">Opened</th><th>Replies</th><th class="hm">Reply rate</th><th>Calls</th><th>Score</th></tr></thead>
        <tbody>${rank.map((a, i) => { const s = S[a.id];
          return `<tr data-a="${a.id}"><td>${s.score == null ? '—' : i + 1}</td><td><b>${esc(a.name)}</b> <span style="color:var(--mute)">· ${esc(a.role)}</span></td><td class="hm">${(DESK[a.id] || []).length}</td>
            <td>${n(s.sent)}</td><td class="hm">${n(s.opened)}</td><td>${n(s.replies)}</td><td class="hm">${pct(s.replies, s.sent)}</td><td>${n(s.booked)}</td><td>${s.score ?? '—'}</td></tr>` }).join('')}</tbody></table></div></section>
    </div>`;
    v.querySelectorAll('[data-a]').forEach(e => e.onclick = () => { focus(e.dataset.a); document.getElementById('t-stage').scrollIntoView({behavior: 'smooth', block: 'start'}) });
    await world();
  }

  function detail(a) {
    const s = S[a.id], d = DESK[a.id] || [], mx = Math.max(1, ...s.days);
    const spark = `<svg viewBox="0 0 300 54" width="100%" height="54" preserveAspectRatio="none">${s.days.map((x, i) => `<rect x="${i * 10 + 1}" y="${50 - 46 * x / mx}" width="8" height="${Math.max(1.5, 46 * x / mx)}" rx="2" fill="${x ? 'var(--sig)' : 'rgba(255,255,255,.08)'}"/>`).join('')}</svg>`;
    return `<button class="x" id="t-x">← TEAM</button>
      <div class="tm-n">${esc(a.name)}</div><div class="dr">${esc(a.role)}</div>${status(a)}
      <p class="job">${esc(a.job)}</p>
      <div class="k">How they work</div>
      <div class="flow"><span>Starts</span><div>${esc(a.trigger)}</div><span>Sends</span><div>${esc(a.cadence || '—')}</div><span>Stops</span><div>${esc(a.stops)}</div></div>
      <div class="k">Performance</div>
      <div class="tm-ring">${ring(s.score)}<p>${s.score == null ? (a.active ? 'Score appears after the first email.' : 'No emails yet: switched off. Score appears after the first email.') : `Reply rate ${pct(s.replies, s.sent)} (goal 10%) · calls booked ${pct(s.booked, s.sent)} of emails (goal 3%).`}</p></div>
      <div class="kg" style="margin-top:12px"><div><b>${n(s.sent)}</b><i>Sent</i></div><div><b>${pct(s.opened, s.sent)}</b><i>Opened</i></div><div><b>${n(s.replies)}</b><i>Replies</i></div>
        <div><b>${pct(s.replies, s.sent)}</b><i>Reply rate</i></div><div><b>${n(s.booked)}</b><i>Calls booked</i></div><div><b>${n(s.queued)}</b><i>To approve</i></div></div>
      <div class="k">Emails sent · last 30 days</div>${spark}
      <div class="k">On the desk now · ${d.length}</div>
      <div class="desk">${d.length ? d.slice(0, 12).map(x => `<div><span>${esc(cname(x.c))}</span><em>${esc(x.w)}</em></div>`).join('') + (d.length > 12 ? `<p class="none">+ ${d.length - 12} more</p>` : '')
        : `<p class="none">${a.id === 'ray' ? 'Starts with the phone line.' : 'Nobody right now.'}</p>`}</div>`;
  }

  /* ---------- 3D office ---------- */
  function loadThree() {
    if (window.THREE) return Promise.resolve();
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = THREE_SRC; s.onload = ok; s.onerror = () => no(new Error('3D engine failed to load')); document.head.appendChild(s) });
  }

  async function world() {
    const cv = document.getElementById('t-cv'), stage = document.getElementById('t-stage');
    try { await loadThree() } catch (e) { cv.replaceWith(Object.assign(document.createElement('div'), {className: 'none', style: 'padding:40px', textContent: e.message})); return }
    const T = window.THREE; if (T.ColorManagement) T.ColorManagement.legacyMode = false;  // hex colours are sRGB
    const R = new T.WebGLRenderer({canvas: cv, antialias: true, alpha: false});
    R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
    R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = .95;
    const scene = new T.Scene(); scene.background = new T.Color(0x0d0b0a); scene.fog = new T.Fog(0x0d0b0a, 16, 34);
    const cam = new T.PerspectiveCamera(38, 1, .1, 100);
    const M = (c, o = {}) => new T.MeshStandardMaterial({color: c, flatShading: true, roughness: .78, metalness: .02, ...o});
    const box = (w, h, d, m, x = 0, y = 0, z = 0, p = scene) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; p.add(b); return b };
    const cyl = (rt, rb, h, seg, m, x = 0, y = 0, z = 0, p = scene) => { const b = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; p.add(b); return b };

    // lights: warm key, red rim, soft fill
    scene.add(new T.HemisphereLight(0xffe4cf, 0x1a0e0a, .7));
    const key = new T.DirectionalLight(0xffe1c4, 1.25); key.position.set(5, 11, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, {left: -12, right: 12, top: 10, bottom: -6}); key.shadow.bias = -.0004; scene.add(key);
    const rim = new T.PointLight(0xe42b0c, 2.2, 22); rim.position.set(-6, 4.5, -5); scene.add(rim);
    const amb = new T.PointLight(0xff8a3d, 1.1, 18); amb.position.set(7, 3.5, -3); scene.add(amb);

    // room
    const floor = box(30, .2, 22, M(0x1d1714), 0, -.1, 0); floor.castShadow = false;
    const grid = new T.GridHelper(30, 30, 0x3a2219, 0x261a15); grid.position.y = .01; scene.add(grid);
    box(30, 9, .3, M(0x16110f), 0, 4.4, -8.5).castShadow = false;            // back wall
    box(.3, 9, 22, M(0x130f0d), -15, 4.4, 0).castShadow = false;             // side wall
    for (let i = 0; i < 5; i++) {                                              // window strip with Austin dusk
      box(3.6, 3.2, .05, M(0x2a130b, {emissive: 0xff6a2a, emissiveIntensity: .16 - i * .015}), -9.6 + i * 4.8, 4.8, -8.33);
      box(.12, 3.4, .1, M(0x0a0808), -7.75 + i * 4.8, 4.8, -8.3);
    }
    // the N on the wall
    const sig = M(0xe42b0c, {emissive: 0xe42b0c, emissiveIntensity: .9});
    box(.22, 1.4, .1, sig, 9.2, 5.1, -8.28); box(.22, 1.4, .1, sig, 10.1, 5.1, -8.28); const dg = box(.22, 1.62, .1, sig, 9.65, 5.1, -8.28); dg.rotation.z = .58;
    box(3.2, .03, .03, M(0xff8a3d, {emissive: 0xff8a3d, emissiveIntensity: .8}), 9.65, 4.1, -8.28);
    // rug
    box(14, .02, 7.5, M(0x2b1a14), 0, .01, .6).castShadow = false;
    // ceiling lamps
    for (const x of [-6, 0, 6]) { cyl(.02, .02, 2.6, 4, M(0x111111), x, 7.7, -1.5); const sh = cyl(.35, .7, .45, 8, M(0x1a1515), x, 6.3, -1.5);
      cyl(.5, .5, .02, 8, M(0xffd8b0, {emissive: 0xffc38a, emissiveIntensity: 1.4}), x, 6.07, -1.5); sh.castShadow = false }
    // plants (low-poly pots)
    const plant = (x, z, s = 1) => { cyl(.32 * s, .25 * s, .55 * s, 7, M(0xe9ddd0), x, .27 * s, z);
      for (let i = 0; i < 4; i++) { const l = new T.Mesh(new T.IcosahedronGeometry(.42 * s - i * .05, 0), M([0x3f5b3a, 0x4b6b42, 0x34502f][i % 3])); l.position.set(x + Math.sin(i * 2) * .15, (.8 + i * .32) * s, z + Math.cos(i * 2) * .15); l.castShadow = true; scene.add(l) } };
    plant(-13, -6.5, 1.3); plant(13, -6.5, 1.1); plant(-13, 4, 1); plant(12.6, 3.5, 1.2);
    // sofa + coffee bar for life
    box(3.4, .55, 1.1, M(0x2c2523), -11, .45, -1.8); box(3.4, .8, .3, M(0x2c2523), -11, .95, -2.25); box(1.2, .25, .5, M(0xe42b0c), -11.6, .85, -1.75);
    box(2.6, 1.1, .8, M(0x231d1b), 11.2, .55, -6.6); cyl(.2, .2, .45, 8, M(0x8e8882, {metalness: .5, roughness: .3}), 10.6, 1.33, -6.6);

    // desks: 2 rows of 4
    const ids = A.map(a => a.id), spots = ids.map((_, i) => ({x: -6.6 + (i % 4) * 4.4, z: i < 4 ? -3.2 : 1.6}));
    const wood = M(0x3a2c24), leg = M(0x141212), scr = M(0x1a120e, {emissive: 0xff8a3d, emissiveIntensity: .55});
    spots.forEach(({x, z}, i) => {
      box(2.6, .1, 1.2, wood, x, 1.05, z - .55); for (const dx of [-1.2, 1.2]) box(.08, 1, 1.1, leg, x + dx, .52, z - .55);
      box(1.3, .78, .06, M(0x0e0c0b), x - .15, 1.62, z - .95); const s = box(1.2, .68, .02, scr, x - .15, 1.62, z - .91); s.castShadow = false;
      box(.1, .3, .1, leg, x - .15, 1.2, z - .97); box(.7, .03, .25, M(0x2a2523), x - .15, 1.12, z - .45);
      cyl(.06, .05, .14, 7, M(0xe9ddd0), x + .85, 1.17, z - .5);                       // mug on desk
      const ch = new T.Group(); ch.position.set(x + .9, 0, z - .1); scene.add(ch);  // chair pushed aside
      box(.6, .1, .6, M(0x231d1b), 0, .62, 0, ch); box(.6, .7, .08, M(0x231d1b), 0, 1, -.28, ch); cyl(.04, .04, .55, 6, leg, 0, .32, 0, ch); ch.rotation.y = .5;
    });

    // people
    const P = [];
    A.forEach((a, i) => { const g = person(T, M, box, cyl, LOOK[a.id] || LOOK.flash, a.gender);
      g.position.set(spots[i].x - .9, 0, spots[i].z + .35); g.rotation.y = .15 - (i % 4) * .08; Object.assign(g.userData, {id: a.id, base: g.rotation.y, ph: i * 1.3}); scene.add(g); P.push(g);
      const halo = new T.Mesh(new T.RingGeometry(.45, .55, 28), new T.MeshBasicMaterial({color: 0xe42b0c, transparent: true, opacity: 0})); halo.rotation.x = -Math.PI / 2; halo.position.set(g.position.x, .03, g.position.z); scene.add(halo); g.userData.halo = halo });

    // name tags
    const tags = document.getElementById('t-tags');
    tags.innerHTML = A.map(a => `<div class="tag${a.active ? ' on' : ''}" data-t="${a.id}"><b>${esc(a.name)}</b><i>${esc(a.role)}</i></div>`).join('');
    tags.querySelectorAll('.tag').forEach(t => t.onclick = () => focus(t.dataset.t));

    // camera rig
    const HOME = {p: new T.Vector3(0, 5.2, 12.5), t: new T.Vector3(0, 1.5, -1)};
    const cur = {p: HOME.p.clone(), t: HOME.t.clone()}, goal = {p: HOME.p.clone(), t: HOME.t.clone()};
    let yaw = 0, drag = null, hover = null;
    const ray = new T.Raycaster(), mouse = new T.Vector2();
    const pick = e => { const r = cv.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, cam);
      const h = ray.intersectObjects(P, true)[0]; if (!h) return null; let o = h.object; while (o && !o.userData.id) o = o.parent; return o };
    cv.addEventListener('pointerdown', e => { drag = {x: e.clientX, yaw, moved: false} });
    const up = e => { if (!drag || !cv.isConnected) return; const moved = drag.moved; drag = null; if (moved) return;
      const o = pick(e); if (o) focus(o.userData.id); else if (sel) focus(null) }; addEventListener('pointerup', up);
    cv.addEventListener('pointermove', e => { if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; if (!sel) yaw = Math.max(-.6, Math.min(.6, drag.yaw - dx * .004)); return }
      const o = pick(e); hover = o ? o.userData.id : null; cv.style.cursor = o ? 'pointer' : 'grab' });

    three = {
      go(id) {
        const g = P.find(x => x.userData.id === id);
        if (!g) { goal.p.copy(HOME.p); goal.t.copy(HOME.t); return }
        const w = new T.Vector3(); g.getWorldPosition(w); const side = innerWidth > 700 ? -1.15 : 0;  // keep the person left of the side panel
        goal.t.set(w.x - side * 1.1, 1.25, w.z); goal.p.set(w.x - side * 1.1 + .3, 3.1, w.z + 3.9);  // high enough to clear the front-row monitors
      },
    };

    const size = () => { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 700 ? 50 : 38; cam.updateProjectionMatrix() };
    size(); const ro = new ResizeObserver(size); ro.observe(cv);
    const clk = new T.Clock(), v3 = new T.Vector3();
    (function tick() {
      if (!cv.isConnected) { ro.disconnect(); removeEventListener('pointerup', up); R.dispose(); three = null; return }   // page changed: stop the loop
      requestAnimationFrame(tick);
      const dt = Math.min(.1, clk.getDelta()), t = clk.elapsedTime, k = 1 - Math.pow(.0016, dt);
      // home view drifts slowly; yaw from dragging
      if (!sel) { const r = HOME.p.z, a = yaw + Math.sin(t * .12) * .06; goal.p.set(Math.sin(a) * r, HOME.p.y, Math.cos(a) * r) }
      cur.p.lerp(goal.p, Math.min(1, k * 2.4)); cur.t.lerp(goal.t, Math.min(1, k * 2.4)); cam.position.copy(cur.p); cam.lookAt(cur.t);
      for (const g of P) { const u = g.userData, on = u.id === sel || u.id === hover;
        g.position.y = Math.sin(t * 1.6 + u.ph) * .015; g.rotation.y = u.base + Math.sin(t * .5 + u.ph) * .08 + (u.id === sel ? -u.base : 0) * .9;
        g.userData.head.rotation.y = Math.sin(t * .7 + u.ph) * .18; g.userData.head.rotation.x = Math.sin(t * .9 + u.ph) * .04;
        u.halo.material.opacity += ((on ? .85 : 0) - u.halo.material.opacity) * .15; u.halo.scale.setScalar(1 + Math.sin(t * 3) * .04) }
      R.render(scene, cam);
      // tags follow heads
      const W = cv.clientWidth, H = cv.clientHeight;
      tags.querySelectorAll('.tag').forEach(el => { const g = P.find(x => x.userData.id === el.dataset.t); if (!g) return; g.userData.head.getWorldPosition(v3); v3.y += .55; v3.project(cam);
        el.style.transform = `translate(${(v3.x * .5 + .5) * W}px,${(-v3.y * .5 + .5) * H}px) translate(-50%,-100%)`; el.style.display = v3.z < 1 ? '' : 'none';
        el.classList.toggle('sel', el.dataset.t === hover) });
    })();
  }

  // a low-poly person, ~1.8 tall, standing like the reference: one hand in a pocket, coffee in the other
  function person(T, M, box, cyl, L, gender) {
    const g = new T.Group(), f = gender === 'f', skin = M(SKIN), skinD = M(SKIN_D), shirt = M(L.shirt), under = M(L.under), pants = M(L.pants), shoe = M(L.shoe), hair = M(L.hair), dark = M(0x111010);
    const sw = f ? .9 : 1;  // slimmer frame
    // shoes + rolled cuffs
    for (const s of [-1, 1]) { box(.2, .13, .36, shoe, s * .13 * sw, .065, .04, g); box(.21, .03, .37, M(0xf3efeb), s * .13 * sw, .13, .04, g);
      cyl(.105, .1, .14, 7, pants, s * .13 * sw, .22, 0, g); cyl(.085, .1, .66, 7, pants, s * .13 * sw, .62, 0, g) }
    box(.46 * sw, .18, .26, pants, 0, .98, 0, g);                                                // hips
    const torso = cyl(.25 * sw, .23 * sw, .6, 6, under, 0, 1.36, 0, g); torso.scale.z = .62;        // under-shirt
    for (const s of [-1, 1]) { const p = box(.2 * sw, .62, .3, shirt, s * .16 * sw, 1.37, -.005, g); p.rotation.z = s * .04 }  // open shirt panels
    box(.5 * sw, .1, .3, shirt, 0, 1.64, -.01, g);                                              // shoulders/collar
    for (const s of [-1, 1]) { const c = box(.12, .04, .12, shirt, s * .1, 1.71, .1, g); c.rotation.y = s * .5 }
    // arms: sleeve, forearm, hand
    const arm = (s, cup) => { const a = new T.Group(); a.position.set(s * .32 * sw, 1.6, 0); g.add(a);
      cyl(.085, .08, .3, 6, shirt, 0, -.13, 0, a); cyl(.062, .055, .34, 6, skin, 0, -.44, 0, a); box(.1, .12, .1, skinD, 0, -.66, .01, a);
      if (cup) { a.rotation.x = -1.15; a.rotation.z = s * .12; const c = new T.Group(); c.position.set(0, -.68, .08); c.rotation.x = 1.15; a.add(c);
        cyl(.075, .058, .2, 8, M(0xc79a6a), 0, .02, 0, c); cyl(.08, .08, .035, 8, dark, 0, .14, 0, c) }
      else { a.rotation.z = s * .14; a.rotation.x = .1 } };
    arm(1, !!L.cup); arm(-1, false);
    // neck + head
    cyl(.07, .08, .1, 6, skinD, 0, 1.73, 0, g);
    const head = new T.Group(); head.position.set(0, 1.95, 0); head.scale.setScalar(1.22); g.add(head); g.userData.head = head;
    const hd = cyl(.15, .12, .3, 6, skin, 0, 0, 0, head); hd.scale.z = .95;
    box(.04, .06, .05, skinD, 0, -.01, .145, head);                                                    // nose
    for (const s of [-1, 1]) { box(.035, .03, .02, dark, s * .055, .035, .14, head); box(.05, .07, .04, skinD, s * .15, 0, 0, head);  // eyes, ears
      box(.06, .015, .02, M(L.hair), s * .058, .075, .14, head) }                                       // brows
    if (L.glasses) { for (const s of [-1, 1]) { const fr = box(.085, .06, .012, dark, s * .058, .035, .155, head); fr.material = dark } box(.04, .012, .012, dark, 0, .04, .157, head) }
    if (L.beard) { box(.27, .12, .05, hair, 0, -.1, .1, head); for (const s of [-1, 1]) box(.05, .16, .2, hair, s * .13, -.04, .02, head) }
    if (f) {
      box(.31, .1, .3, hair, 0, .15, -.01, head); box(.31, .2, .08, hair, 0, .02, -.13, head);
      for (const s of [-1, 1]) box(.05, .17, .25, hair, s * .155, .04, -.02, head);
      if (L.style === 'long') box(.3, .45, .09, hair, 0, -.18, -.12, head);
      if (L.style === 'bun') { const b = new T.Mesh(new T.IcosahedronGeometry(.085, 0), hair); b.position.set(0, .2, -.12); b.castShadow = true; head.add(b) }
      if (L.style === 'bob') for (const s of [-1, 1]) box(.06, .2, .26, hair, s * .155, -.09, -.02, head);
    } else if (L.cap) { box(.32, .12, .31, M(L.cap), 0, .16, 0, head); box(.26, .025, .16, M(L.cap), 0, .11, .2, head) }
    else { box(.31, .09, .3, hair, 0, .155, -.005, head); box(.31, .14, .06, hair, 0, .07, -.13, head) }
    return g;
  }

  function focus(id) {
    sel = id || null;
    const stage = document.getElementById('t-stage'), det = document.getElementById('t-det');
    if (!stage) return;
    stage.classList.toggle('zoom', !!sel);
    if (three) three.go(sel);
    if (sel) { const a = A.find(x => x.id === sel); det.innerHTML = detail(a); det.scrollTop = 0; det.querySelector('#t-x').onclick = () => focus(null) }
  }

  return {render};
})();
