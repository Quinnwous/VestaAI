/* ─────────────────────────────────────────────────────────────────────────
   VestaAI ontwerp-kit · gedeelde primitives voor de prototypes in docs/ontwerp/
   Spec voor: components/ui (FilterBar, dropdown = Radix Popover, Segmented,
   Chip, Pill, RangeSlider = Radix Slider, Switch), hooks/useFilterState,
   lib/opmaak.ts, en de woningtype-taxonomie in lib/transactieNormalisatie.ts.
   ───────────────────────────────────────────────────────────────────────── */
window.Kit = (() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceer = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Echte i4 Housing-logo (uit Storage-bucket kantoor-assets in de app) ──
  const LOGO = 'data:image/png;base64,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';

  // ── Taxonomie woningtypes: 4 groepen (waardering, § 3.3) × NVM-achtige subtypes ──
  const TAXONOMIE = [
    { groep: 'appartement', label: 'Appartement', subs: ['Bovenwoning', 'Benedenwoning', 'Maisonnette', 'Portiekflat', 'Galerijflat', 'Penthouse', 'Studio'] },
    { groep: 'rijwoning', label: 'Eengezinswoning', subs: ['Tussenwoning', 'Hoekwoning', 'Eindwoning', 'Geschakelde woning', 'Herenhuis', 'Drive-in woning'] },
    { groep: 'halfvrijstaand', label: 'Halfvrijstaand', subs: ['Twee-onder-een-kap', 'Geschakelde twee-onder-een-kap'] },
    { groep: 'vrijstaand', label: 'Vrijstaand', subs: ['Vrijstaande woning', 'Villa', 'Landhuis', 'Bungalow', 'Woonboerderij'] },
  ];
  const GROEP = Object.fromEntries(TAXONOMIE.map(t => [t.groep, t]));
  const ENERGIE = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const TEAM = [{ key: 'marc', naam: 'Marc van Dijk', init: 'MD' }, { key: 'nicole', naam: 'Nicole van Dijk', init: 'ND' }, { key: 'chita', naam: 'Chita van Soest', init: 'CS' }, { key: 'ton', naam: 'Ton van Soest', init: 'TS' }, { key: 'naomi', naam: 'Naomi Bentvelzen', init: 'NB' }];
  const PLAATSEN = [
    { key: 'wassenaar', label: 'Wassenaar', m2: 6300, mix: [.20, .20, .25, .35], gewicht: .34, eigen: .22, wijken: ['Centrum', 'Oostdorp', 'Zijlwatering', 'Deijleroord', 'Prinsenwijk', 'De Kieviet', 'De Paauw', 'Oud-Wassenaar', 'Nieuw-Wassenaar', 'Rijksdorp'] },
    { key: 'denhaag', label: 'Den Haag', m2: 5600, mix: [.55, .30, .08, .07], gewicht: .40, eigen: .07, wijken: ['Benoordenhout', 'Statenkwartier', 'Archipelbuurt', 'Mariahoeve', 'Duinzigt', 'Vogelwijk'] },
    { key: 'voorschoten', label: 'Voorschoten', m2: 4900, mix: [.30, .40, .20, .10], gewicht: .09, eigen: .05, wijken: ['Centrum', 'Vlietwijk', 'Bijdorp', 'Boschgeest', 'Nassauwijk'] },
    { key: 'leidschendam', label: 'Leidschendam', m2: 4700, mix: [.35, .40, .15, .10], gewicht: .09, eigen: .05, wijken: ['Centrum', 'Heuvelwijk', 'Prinsenhof', 'De Zijde'] },
    { key: 'rijswijk', label: 'Rijswijk', m2: 4300, mix: [.50, .38, .07, .05], gewicht: .08, eigen: .03, wijken: ['Centrum', 'Bomenbuurt', 'Leeuwendaal', 'Cromvliet'] },
  ];
  const KWARTALEN = []; for (let j = 2019, k = 0; j < 2026 || (j === 2026 && k <= 2); k++) { if (k === 4) { k = 0; j++; } KWARTALEN.push({ j, k, key: `${j}-Q${k + 1}`, label: `Q${k + 1} ${j}`, idx: KWARTALEN.length }); }
  const MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  // ── Willekeur (seeded, deterministisch) ──
  const seed = (s0) => { let s = s0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const gaussVan = (rnd) => () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const kiesVan = (rnd) => (arr, w) => { let r = rnd(), acc = 0; for (let i = 0; i < arr.length; i++) { acc += w[i]; if (r <= acc) return arr[i]; } return arr[arr.length - 1]; };
  const trend = idx => { let f = Math.pow(1.045, idx / 4); if (idx >= 15 && idx <= 17) f *= .94; else if (idx === 14 || idx === 18) f *= .97; return f; };
  const GROEP_F = { appartement: .86, rijwoning: .90, halfvrijstaand: 1.02, vrijstaand: 1.16 };
  const GROEP_OPP = { appartement: [62, 145], rijwoning: [100, 175], halfvrijstaand: [130, 230], vrijstaand: [160, 420] };

  /** Genereert een rijke transactieset (regionaal óf alleen eigen). Velden = kolommen van `transacties` v2. */
  function genereerTransacties({ seedWaarde = 20260917, perKwartaal = [140, 40], alleenEigen = false, plaatsen = PLAATSEN } = {}) {
    const rnd = seed(seedWaarde), gauss = gaussVan(rnd), kies = kiesVan(rnd); const out = [];
    KWARTALEN.forEach(q => {
      const n = perKwartaal[0] + Math.round(rnd() * perKwartaal[1]);
      for (let i = 0; i < n; i++) {
        const p = kies(plaatsen, plaatsen.map(x => x.gewicht)); const groep = kies(TAXONOMIE, p.mix).groep; const tax = GROEP[groep];
        const eigen = rnd() < p.eigen; if (alleenEigen && !eigen) continue;
        const sub = tax.subs[Math.floor(rnd() * tax.subs.length)]; const opp = Math.round(GROEP_OPP[groep][0] + rnd() * (GROEP_OPP[groep][1] - GROEP_OPP[groep][0]));
        const bouwjaar = groep === 'appartement' ? 1955 + Math.round(rnd() * 68) : 1900 + Math.round(Math.pow(rnd(), .8) * 124);
        const labelIdx = Math.max(0, Math.min(9, Math.round(9 - (bouwjaar - 1900) / 124 * 8 + gauss() * 1.4 - (rnd() < .25 ? 2 : 0))));
        const perceel = groep === 'appartement' ? null : Math.round(opp * (groep === 'vrijstaand' ? 3.2 + rnd() * 4 : 1.2 + rnd() * 1.3));
        const kamers = Math.max(1, Math.round(opp / 32 + gauss() * .8));
        const m2prijs = p.m2 * GROEP_F[groep] * trend(q.idx) * (1 + gauss() * .13) * (eigen ? 1.015 : 1) * (1 - labelIdx * .012);
        const prijs = Math.round(opp * m2prijs / 5000) * 5000;
        const looptijd = Math.max(5, Math.round((q.idx < 12 ? 24 : q.idx <= 18 ? 52 : 34) * Math.exp(gauss() * .45) * (eigen ? .85 : 1)));
        const ratio = (q.idx < 12 ? 4.5 : q.idx <= 18 ? -2.5 : 1.2) + gauss() * 3.2 + (eigen ? 1.4 : 0);
        const maand = q.k * 3 + Math.floor(rnd() * 3), dag = 1 + Math.floor(rnd() * 28);
        out.push({ id: out.length, q: q.idx, plaats: p.key, plaatsLabel: p.label, wijk: p.wijken[Math.floor(rnd() * p.wijken.length)], groep, sub, opp, perceel, bouwjaar, energielabel: ENERGIE[labelIdx], kamers, tuin: groep !== 'appartement' ? rnd() < .9 : rnd() < .15, garage: groep === 'vrijstaand' ? rnd() < .7 : groep === 'halfvrijstaand' ? rnd() < .45 : rnd() < .12, prijs, m2: Math.round(prijs / opp), looptijd, ratio, eigen, makelaar: eigen ? TEAM[Math.floor(rnd() * TEAM.length)].key : null, datum: new Date(q.j, maand, dag), rnd: rnd() });
      }
    });
    return out;
  }

  // ── Opmaak (lib/opmaak.ts) ──
  const nl = new Intl.NumberFormat('nl-NL');
  const euro = v => v == null ? '—' : '€ ' + nl.format(Math.round(v));
  const euroKort = v => v == null ? '—' : v >= 1e6 ? '€ ' + (v / 1e6).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' mln' : '€ ' + nl.format(Math.round(v / 1000)) + ' k';
  const procent = (v, teken = true) => v == null ? '—' : (teken && v > 0 ? '+' : '') + v.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  const dagen = v => v == null ? '—' : Math.round(v) + ' dgn';
  const datum = d => `${d.getDate()} ${MAAND[d.getMonth()]} ${d.getFullYear()}`;
  const m2 = v => v == null ? '—' : nl.format(Math.round(v)) + ' m²';
  const mediaan = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const gem = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const mooieStap = ruw => { const p = Math.pow(10, Math.floor(Math.log10(ruw || 1))); const r = ruw / p; return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p; };

  // ── Getal-tween (StatTile), 400 ms ease-out cubic ──
  const tweens = new WeakMap();
  function tween(el, naar, fmt) { const van = tweens.get(el) ?? naar; tweens.set(el, naar); if (reduceer || van === naar || van == null || naar == null) { el.textContent = fmt(naar); return; } const t0 = performance.now(); const stap = t => { const p = Math.min(1, (t - t0) / 400), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(van + (naar - van) * e); if (p < 1) requestAnimationFrame(stap); }; requestAnimationFrame(stap); }

  // ── Topbar + subnav (AppTopbar.tsx + marktanalyse/layout) ──
  function topbar({ actief = 'Overzicht' } = {}) {
    const items = ['Overzicht', 'Woningdossier', 'Marktanalyse', 'Transacties', 'Concurrentie', 'Verkoopkaart'];
    const html = `<header class="topbar"><div class="topbar-in"><div class="lockup"><span class="vesta">VestaAI</span><span class="x">×</span><img src="${LOGO}" alt="i4 Housing"></div><nav class="nav" aria-label="Hoofdmenu">${items.map(i => `<a href="#" ${i === actief ? 'aria-current="page"' : ''}>${i}</a>`).join('')}</nav><div class="avatar" title="Marc van Dijk">M</div></div></header>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  // ── Segmented control met schuivende thumb ──
  function segmented(host, opties, huidig, onChange, { klasse = '' } = {}) {
    host.className = ('seg ' + klasse).trim(); host.setAttribute('role', 'radiogroup');
    host.innerHTML = `<span class="thumb"></span>` + opties.map(o => `<button type="button" role="radio" aria-checked="${String(o.key) === String(huidig)}" data-k="${o.key}">${o.label}</button>`).join('');
    const thumb = $('.thumb', host);
    const plaats = () => { const b = $('button[aria-checked="true"]', host); if (!b) { thumb.style.width = '0'; return; } thumb.style.left = b.offsetLeft + 'px'; thumb.style.width = b.offsetWidth + 'px'; };
    $$('button', host).forEach(b => b.onclick = () => { $$('button', host).forEach(x => x.setAttribute('aria-checked', x === b)); plaats(); onChange(isNaN(+b.dataset.k) ? b.dataset.k : +b.dataset.k); });
    requestAnimationFrame(plaats); document.fonts?.ready.then(plaats); addEventListener('resize', plaats);
    return { zet(k) { $$('button', host).forEach(x => x.setAttribute('aria-checked', String(x.dataset.k) === String(k))); plaats(); } };
  }

  // ── Dropdown-filter (trigger + popover); één tegelijk open, Escape/klik-buiten sluit ──
  let openDrop = null;
  document.addEventListener('click', e => { if (openDrop && !openDrop.host.contains(e.target)) openDrop.sluit(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openDrop) { const t = openDrop.trigger; openDrop.sluit(); t.focus(); } });
  function dropdown(host, { label, render, samenvat, teller, onWis, rechts = false }) {
    host.className = 'fdrop';
    host.innerHTML = `<button type="button" class="fbtn" aria-expanded="false" aria-haspopup="dialog"><span class="lbl">${label}</span><span class="waarde"></span><span class="badge" hidden></span><svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m2.5 4.5 3.5 3.5 3.5-3.5"/></svg></button><div class="pop ${rechts ? 'rechts' : ''}" role="dialog" aria-label="${label}" hidden><div class="pop-kop"><b>${label}</b><button type="button" class="link wis">Wis</button></div><div class="pop-body"></div><div class="pop-voet"><button type="button" class="btn btn-primair btn-klein gereed">Gereed</button></div></div>`;
    const trigger = $('.fbtn', host), pop = $('.pop', host), body = $('.pop-body', host);
    const api = { host, trigger, open() { if (openDrop && openDrop !== api) openDrop.sluit(); pop.hidden = false; trigger.setAttribute('aria-expanded', 'true'); openDrop = api; const f = pop.querySelector('input, button'); f && f.focus({ preventScroll: true }); }, sluit() { pop.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (openDrop === api) openDrop = null; }, ververs() { const s = samenvat(), n = teller ? teller() : 0; $('.waarde', trigger).textContent = s ? ' ' + s : ''; $('.waarde', trigger).hidden = !s; const bd = $('.badge', trigger); bd.hidden = !n; bd.textContent = n; trigger.classList.toggle('actief', !!s || !!n); } };
    trigger.onclick = () => pop.hidden ? api.open() : api.sluit(); $('.gereed', host).onclick = () => api.sluit(); $('.wis', host).onclick = () => { onWis(); api.render(); api.ververs(); };
    api.render = () => { body.innerHTML = ''; render(body); }; api.render(); api.ververs();
    return api;
  }

  // ── Bouwstenen voor in een popover ──
  const checkSvg = `<svg viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2.5 6.5 2.5 2.5 4.5-5"/></svg>`;
  function vinkje(label, checked, onChange, { klasse = '', n = null } = {}) { const l = document.createElement('label'); l.className = ('vink ' + klasse).trim(); l.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}><span class="box">${checkSvg}</span><span>${label}</span>${n != null ? `<span class="n num">${n}</span>` : ''}`; $('input', l).onchange = e => onChange(e.target.checked); return l; }
  function chipsLijst(host, opties, gekozen, onChange, { klasse = '' } = {}) { host.className = 'chips'; host.innerHTML = ''; opties.forEach(o => { const b = document.createElement('button'); b.type = 'button'; b.className = ('chip ' + klasse).trim(); b.setAttribute('aria-pressed', gekozen.has(o.key)); b.textContent = o.label; b.onclick = () => { gekozen.has(o.key) ? gekozen.delete(o.key) : gekozen.add(o.key); b.setAttribute('aria-pressed', gekozen.has(o.key)); onChange(); }; host.appendChild(b); }); }
  function rangeSlider(host, { min, max, stap, van, tot, fmt, onChange, ticks = [] }) {
    host.className = 'range'; host.innerHTML = `<div class="range-waarden"><span class="v1"></span><span class="v2"></span></div><div class="rail"></div><div class="bereik"></div><input type="range" class="r1" min="${min}" max="${max}" step="${stap}" value="${van}" aria-label="Van"><input type="range" class="r2" min="${min}" max="${max}" step="${stap}" value="${tot}" aria-label="Tot"><div class="range-ticks">${ticks.map(t => `<span>${t}</span>`).join('')}</div>`;
    const r1 = $('.r1', host), r2 = $('.r2', host), b = $('.bereik', host); let V = van, T = tot;
    const teken = () => { const p = v => (v - min) / (max - min) * 100; b.style.left = p(V) + '%'; b.style.width = (p(T) - p(V)) + '%'; $('.v1', host).textContent = fmt(V, 'van'); $('.v2', host).textContent = fmt(T, 'tot'); r1.value = V; r2.value = T; };
    r1.oninput = () => { V = Math.min(+r1.value, T); teken(); onChange(V, T); }; r2.oninput = () => { T = Math.max(+r2.value, V); teken(); onChange(V, T); }; teken();
    return { zet(v, t) { V = v; T = t; teken(); } };
  }
  function schakel(host, { label, aan, onChange }) { host.className = 'schakel'; host.setAttribute('role', 'switch'); host.setAttribute('aria-checked', aan); host.innerHTML = `<span class="track"></span>${label}`; host.onclick = () => { const nu = host.getAttribute('aria-checked') !== 'true'; host.setAttribute('aria-checked', nu); onChange(nu); }; return { zet(v) { host.setAttribute('aria-checked', v); } }; }
  function filterPills(host, pills, onWisAlles) { host.className = 'pills'; host.innerHTML = ''; host.hidden = !pills.length; pills.forEach(p => { const el = document.createElement('span'); el.className = 'pill'; el.innerHTML = `${p.label}: <b>${p.waarde}</b><button type="button" aria-label="${p.label}-filter verwijderen">×</button>`; $('button', el).onclick = p.onRemove; host.appendChild(el); }); if (pills.length > 1) { const w = document.createElement('button'); w.type = 'button'; w.className = 'link'; w.textContent = 'Wis alles'; w.onclick = onWisAlles; host.appendChild(w); } }
  function protoStrip({ staten, huidig, onChange, tekst }) { const el = document.createElement('div'); el.className = 'proto'; el.innerHTML = `<div class="proto-in"><b>Prototype-strip</b> (niet in de app) · toon staat: <div class="segStaat"></div><span>${tekst}</span></div>`; document.body.appendChild(el); segmented($('.segStaat', el), staten, huidig, onChange, { klasse: 'klein' }); }

  // ── URL-state (useFilterState) ──
  function leesHash(std, parse) { const h = new URLSearchParams(location.hash.slice(1)); const s = std(); if (![...h.keys()].length) return s; for (const [k, v] of h) if (parse[k]) s[k] = parse[k](v); return s; }
  function schrijfHash(obj) { const h = new URLSearchParams(); Object.entries(obj).forEach(([k, v]) => { if (v == null || v === '' || (Array.isArray(v) && !v.length) || (v instanceof Set && !v.size)) return; h.set(k, v instanceof Set ? [...v].join(',') : Array.isArray(v) ? v.join(',') : String(v)); }); history.replaceState(null, '', '#' + h.toString()); }

  return { $, $$, reduceer, LOGO, TAXONOMIE, GROEP, ENERGIE, TEAM, PLAATSEN, KWARTALEN, MAAND, seed, gaussVan, kiesVan, genereerTransacties, nl, euro, euroKort, procent, dagen, datum, m2, mediaan, gem, mooieStap, tween, topbar, segmented, dropdown, vinkje, chipsLijst, rangeSlider, schakel, filterPills, protoStrip, leesHash, schrijfHash };
})();
