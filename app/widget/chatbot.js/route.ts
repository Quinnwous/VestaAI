import { NextRequest, NextResponse } from 'next/server'

// Serveert het chatbot-widget JavaScript dat op externe kantoor-websites wordt geladen
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  const js = `(function() {
  var kantoorId = document.currentScript ? document.currentScript.dataset.kantoorId : null;
  if (!kantoorId) { console.warn('[VestaAI] Geen kantoor_id geconfigureerd.'); return; }

  var apiBase = '${appUrl}';
  var berichten = [];
  var leadVerzameld = false;

  // Stijlen injecteren
  var style = document.createElement('style');
  style.textContent = [
    '#vai-chat-knop { position:fixed; bottom:24px; right:24px; width:56px; height:56px; border-radius:50%; background:#1A6B45; color:#fff; border:none; cursor:pointer; font-size:22px; box-shadow:0 4px 16px rgba(0,0,0,.2); z-index:9998; display:flex; align-items:center; justify-content:center; transition:transform .15s; }',
    '#vai-chat-knop:hover { transform:scale(1.08); }',
    '#vai-chat-venster { position:fixed; bottom:90px; right:24px; width:340px; max-width:calc(100vw - 32px); height:480px; background:#fff; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,.15); display:flex; flex-direction:column; z-index:9999; overflow:hidden; border:1px solid #e5e7eb; }',
    '#vai-chat-header { padding:14px 16px; background:#1A6B45; color:#fff; font-size:14px; font-weight:600; font-family:system-ui,sans-serif; }',
    '#vai-chat-berichten { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; }',
    '.vai-bericht { max-width:85%; padding:8px 12px; border-radius:12px; font-size:13px; line-height:1.5; font-family:system-ui,sans-serif; word-wrap:break-word; }',
    '.vai-bericht-assistent { background:#f3f4f6; color:#111827; align-self:flex-start; border-bottom-left-radius:4px; }',
    '.vai-bericht-user { background:#1A6B45; color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }',
    '#vai-chat-invoer { padding:8px; border-top:1px solid #e5e7eb; display:flex; gap:6px; }',
    '#vai-chat-tekst { flex:1; border:1px solid #d1d5db; border-radius:8px; padding:8px 10px; font-size:13px; resize:none; outline:none; font-family:system-ui,sans-serif; max-height:80px; }',
    '#vai-chat-tekst:focus { border-color:#1A6B45; }',
    '#vai-chat-stuur { background:#1A6B45; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:13px; font-weight:600; flex-shrink:0; }',
    '#vai-chat-stuur:disabled { opacity:.5; }',
    '.vai-laden { display:inline-flex; gap:3px; }',
    '.vai-laden span { width:5px; height:5px; border-radius:50%; background:#9ca3af; animation:vai-bounce .8s infinite; }',
    '.vai-laden span:nth-child(2) { animation-delay:.15s; }',
    '.vai-laden span:nth-child(3) { animation-delay:.3s; }',
    '@keyframes vai-bounce { 0%,80%,100%{transform:scale(0.7)} 40%{transform:scale(1)} }',
    '#vai-lead-formulier { padding:12px; border-top:1px solid #e5e7eb; background:#f9fafb; }',
    '#vai-lead-formulier p { font-size:12px; color:#6b7280; margin-bottom:8px; font-family:system-ui,sans-serif; }',
    '#vai-lead-formulier input { width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px 10px; font-size:12px; margin-bottom:6px; box-sizing:border-box; }',
    '#vai-lead-btn { background:#1A6B45; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:12px; cursor:pointer; font-weight:600; }',
  ].join('');
  document.head.appendChild(style);

  // DOM bouwen
  var knop = document.createElement('button');
  knop.id = 'vai-chat-knop';
  knop.setAttribute('aria-label', 'Chat openen');
  knop.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  document.body.appendChild(knop);

  var venster = document.createElement('div');
  venster.id = 'vai-chat-venster';
  venster.style.display = 'none';
  venster.innerHTML = '<div id="vai-chat-header">Hoe kan ik u helpen?</div><div id="vai-chat-berichten"></div><div id="vai-chat-invoer"><textarea id="vai-chat-tekst" placeholder="Stel een vraag..." rows="1"></textarea><button id="vai-chat-stuur">→</button></div>';
  document.body.appendChild(venster);

  var berDiv = document.getElementById('vai-chat-berichten');
  var tekst = document.getElementById('vai-chat-tekst');
  var stuur = document.getElementById('vai-chat-stuur');
  var open = false;

  function voegBerichtToe(tekst, rol) {
    var el = document.createElement('div');
    el.className = 'vai-bericht vai-bericht-' + (rol === 'user' ? 'user' : 'assistent');
    el.textContent = tekst;
    berDiv.appendChild(el);
    berDiv.scrollTop = berDiv.scrollHeight;
    return el;
  }

  function voegLadenToe() {
    var el = document.createElement('div');
    el.className = 'vai-bericht vai-bericht-assistent';
    el.innerHTML = '<div class="vai-laden"><span></span><span></span><span></span></div>';
    berDiv.appendChild(el);
    berDiv.scrollTop = berDiv.scrollHeight;
    return el;
  }

  function toonLeadFormulier() {
    if (leadVerzameld || document.getElementById('vai-lead-formulier')) return;
    var form = document.createElement('div');
    form.id = 'vai-lead-formulier';
    form.innerHTML = '<p>Laat uw e-mailadres achter en we nemen contact met u op.</p><input type="text" id="vai-lead-naam" placeholder="Uw naam (optioneel)"><input type="email" id="vai-lead-email" placeholder="Uw e-mailadres" required><button id="vai-lead-btn">Versturen</button>';
    venster.appendChild(form);
    document.getElementById('vai-lead-btn').addEventListener('click', function() {
      var email = document.getElementById('vai-lead-email').value;
      var naam = document.getElementById('vai-lead-naam').value;
      if (!email) return;
      fetch(apiBase + '/api/chat/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kantoor_id: kantoorId, naam: naam || undefined, email: email, bericht: berichten.slice(-3).map(b => b.tekst).join(' | ') })
      });
      form.innerHTML = '<p style="color:#1A6B45;font-weight:600;">Bedankt! We nemen zo snel mogelijk contact met u op.</p>';
      leadVerzameld = true;
    });
  }

  async function stuurBericht() {
    var invoer = tekst.value.trim();
    if (!invoer) return;
    tekst.value = '';
    tekst.style.height = 'auto';
    stuur.disabled = true;

    berichten.push({ rol: 'user', tekst: invoer });
    voegBerichtToe(invoer, 'user');

    var laden = voegLadenToe();

    try {
      var res = await fetch(apiBase + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kantoor_id: kantoorId, berichten: berichten })
      });
      var data = await res.json();
      laden.remove();
      var antwoord = data.antwoord || 'Er ging iets mis. Probeer het opnieuw.';
      berichten.push({ rol: 'assistant', tekst: antwoord });
      voegBerichtToe(antwoord, 'assistant');

      // Leadformulier tonen na 3 berichten van de gebruiker
      if (berichten.filter(b => b.rol === 'user').length >= 3) {
        toonLeadFormulier();
      }
    } catch (err) {
      laden.remove();
      voegBerichtToe('Er ging iets mis. Probeer het opnieuw.', 'assistant');
    }
    stuur.disabled = false;
    tekst.focus();
  }

  knop.addEventListener('click', function() {
    open = !open;
    venster.style.display = open ? 'flex' : 'none';
    venster.style.flexDirection = 'column';
    if (open && berichten.length === 0) {
      voegBerichtToe('Hallo! Waarmee kan ik u helpen?', 'assistant');
      berichten = [{ rol: 'assistant', tekst: 'Hallo! Waarmee kan ik u helpen?' }];
    }
    if (open) tekst.focus();
  });

  stuur.addEventListener('click', stuurBericht);
  tekst.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stuurBericht(); }
  });
  tekst.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });
})();`

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
