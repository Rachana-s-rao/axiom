/* ============================================================
   Axiom — GATE
   Opening sequence -> role selection -> hand-off to the app.

   Timeline (ms from page load):
     0      logo draws, wordmark rises, counter runs
     3100   content lifts away            (stage "exit")
     3500   screen splits open            (stage "open")
     4700   selection page interactive    (stage "select")
   Pick a role -> light burst from the click, wash expands,
   the app is rendered underneath and the gate fades out.

   Drop a photo at assets/education-bg.jpg and it is blended
   into the background automatically.
   ============================================================ */
(function(){
  "use strict";
  var gate = document.getElementById('gate');
  if(!gate) return;

  var appEl   = document.getElementById('app');
  var selectEl= document.getElementById('select');
  var intro   = document.getElementById('intro');
  var wash    = document.getElementById('gateWash');
  var sceneEl = document.getElementById('gateScene');
  var canvas  = document.getElementById('gateCanvas');
  var bar     = document.getElementById('introBar');
  var counter = document.getElementById('introCount');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];
  var introDone = false;
  var pointer = { x:-9999, y:-9999, nx:.5, ny:.4, active:false };

  function later(fn, ms){ var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers(){ timers.forEach(clearTimeout); timers = []; }
  function setStage(s){ gate.setAttribute('data-stage', s); }
  function lockApp(on){
    if(!appEl) return;
    if(on) appEl.setAttribute('inert',''); else appEl.removeAttribute('inert');
  }
  lockApp(true);

  /* --------------------------------------------------------
     Optional photo: only shown if assets/education-bg.jpg exists
     -------------------------------------------------------- */
  (function(){
    var im = new Image();
    im.onload = function(){ gate.classList.add('has-photo'); };
    im.src = 'assets/education-bg.jpg';
  })();

  /* --------------------------------------------------------
     Scene: a dark study hall drawn in SVG (arched window,
     light shafts, shelves with rows of books, floor glow).
     -------------------------------------------------------- */
  function rng(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shelfBlock(x0, x1, seed, side){
    var r = rng(seed), out = '';
    var spines = ['#2A3427','#323F2E','#3A4836','#414E3C','#4A5B44','#586F52','#33403E','#3F5250','#4C6360'];
    for(var row = 0; row < 9; row++){
      var base = 70 + row * 100, x = x0;
      while(x < x1){
        var w = 9 + r() * 20, h = 56 + r() * 32;
        var fill = spines[Math.floor(r() * spines.length)];
        var tilt = r() < 0.05 ? (r() < .5 ? -9 : 9) : 0;
        out += '<rect x="'+x.toFixed(1)+'" y="'+(base - h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.5" fill="'+fill+'"'+
               (tilt ? ' transform="rotate('+tilt+' '+(x + w/2).toFixed(1)+' '+base+')"' : '')+'/>';
        if(r() < 0.22){
          out += '<rect x="'+(x + w*0.25).toFixed(1)+'" y="'+(base - h + 9).toFixed(1)+'" width="'+(w*0.5).toFixed(1)+'" height="2.5" fill="#BAC8B1" opacity=".5"/>';
        }
        x += w + (r() < .08 ? 8 + r()*22 : 1.2);
      }
      out += '<rect x="'+x0+'" y="'+base+'" width="'+(x1 - x0)+'" height="8" fill="#141B12"/>';
    }
    return out;
  }
  function buildScene(){
    if(!sceneEl) return;
    var arch = function(cx, top, w, bottom){
      var r = w/2;
      return 'M'+(cx-r)+','+bottom+' V'+(top+r)+' A'+r+','+r+' 0 0 1 '+(cx+r)+','+(top+r)+' V'+bottom+' Z';
    };
    var svg = '' +
    '<defs>'+
      '<linearGradient id="gsBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C3928"/><stop offset=".6" stop-color="#1A2217"/><stop offset="1" stop-color="#0F150E"/></linearGradient>'+
      '<linearGradient id="gsWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDF1E8"/><stop offset=".45" stop-color="#BAC8B1"/><stop offset="1" stop-color="#7B9669" stop-opacity=".55"/></linearGradient>'+
      '<linearGradient id="gsWinDim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BAC8B1" stop-opacity=".7"/><stop offset="1" stop-color="#6B8480" stop-opacity=".25"/></linearGradient>'+
      '<linearGradient id="gsBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6EDDF" stop-opacity=".2"/><stop offset="1" stop-color="#BAC8B1" stop-opacity="0"/></linearGradient>'+
      '<linearGradient id="gsFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0C110B" stop-opacity="0"/><stop offset=".55" stop-color="#0C110B" stop-opacity=".85"/><stop offset="1" stop-color="#0C110B" stop-opacity=".95"/></linearGradient>'+
      '<radialGradient id="gsGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#BAC8B1" stop-opacity=".5"/><stop offset="1" stop-color="#BAC8B1" stop-opacity="0"/></radialGradient>'+
      '<filter id="gsFar" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.6"/></filter>'+
      '<filter id="gsSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>'+
      '<filter id="gsGlowBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="30"/></filter>'+
    '</defs>'+
    '<rect width="1600" height="900" fill="url(#gsBg)"/>'+
    '<ellipse cx="800" cy="360" rx="420" ry="360" fill="url(#gsGlow)" filter="url(#gsGlowBlur)"/>'+
    // shelves
    '<g filter="url(#gsFar)" opacity=".46"><g transform="skewY(2.5)">'+shelfBlock(-30, 470, 11, 'l')+'</g>'+
    '<g transform="translate(0 -30) skewY(-2.5)">'+shelfBlock(1130, 1630, 29, 'r')+'</g></g>'+
    // windows
    '<g filter="url(#gsFar)">'+
      '<path d="'+arch(505, 250, 120, 640)+'" fill="url(#gsWinDim)" opacity=".5"/>'+
      '<path d="'+arch(1095, 250, 120, 640)+'" fill="url(#gsWinDim)" opacity=".5"/>'+
    '</g>'+
    '<g>'+
      '<path d="'+arch(800, 150, 300, 690)+'" fill="url(#gsWin)" opacity=".5"/>'+
      '<g stroke="#2A3427" stroke-width="7" fill="none" opacity=".9">'+
        '<path d="M800 150 V690"/><path d="M650 330 H950"/><path d="M650 470 H950"/><path d="M650 600 H950"/>'+
        '<path d="M725 190 V330"/><path d="M875 190 V330"/><path d="M725 330 V690"/><path d="M875 330 V690"/>'+
        '<path d="'+arch(800, 150, 300, 690)+'" stroke-width="10"/>'+
      '</g>'+
    '</g>'+
    // light shafts
    '<g style="mix-blend-mode:screen" filter="url(#gsSoft)">'+
      '<polygon class="beam b1" points="700,330 790,330 640,900 380,900" fill="url(#gsBeam)"/>'+
      '<polygon class="beam b2" points="790,330 850,330 900,900 640,900" fill="url(#gsBeam)"/>'+
      '<polygon class="beam b3" points="850,330 930,330 1230,900 950,900" fill="url(#gsBeam)"/>'+
    '</g>'+
    // floor
    '<rect y="700" width="1600" height="200" fill="url(#gsFloor)"/>'+
    '<ellipse cx="800" cy="835" rx="360" ry="34" fill="#BAC8B1" opacity=".14" filter="url(#gsSoft)"/>';
    sceneEl.innerHTML = svg;
  }
  buildScene();

  /* --------------------------------------------------------
     Dynamic element: constellation of motes and formula glyphs
     that drift, link up and react to the cursor.
     -------------------------------------------------------- */
  var ctx = canvas ? canvas.getContext('2d') : null;
  var W = 0, H = 0, DPR = 1, motes = [], glyphs = [], raf = 0, running = false;
  var GLYPHS = ['\u2211','\u03C0','\u222B','\u2234','\u0394','\u221E','\u221A','\u03BB','\u2248','\u03B8','\u2200','\u03A9'];

  function sizeCanvas(){
    if(!canvas) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.max(28, Math.min(84, Math.round(W * H / 20000)));
    var r = rng(7);
    motes = [];
    for(var i = 0; i < n; i++){
      motes.push({ x:r()*W, y:r()*H, vx:(r()-.5)*.22, vy:-.05 - r()*.2, r:.8 + r()*1.7, a:.25 + r()*.55 });
    }
    glyphs = [];
    var g = Math.max(6, Math.min(12, Math.round(W / 130)));
    for(var j = 0; j < g; j++){
      glyphs.push({ ch:GLYPHS[j % GLYPHS.length], x:r()*W, y:r()*H, vy:-.06 - r()*.1, vx:(r()-.5)*.05, s:20 + r()*30, a:.05 + r()*.08, rot:(r()-.5)*.5 });
    }
  }

  function frame(){
    if(!running) return;
    ctx.clearRect(0, 0, W, H);
    var i, j, m, dx, dy, d;

    // glyphs
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(i = 0; i < glyphs.length; i++){
      var g = glyphs[i];
      g.x += g.vx; g.y += g.vy;
      if(g.y < -40){ g.y = H + 40; g.x = Math.random() * W; }
      ctx.save();
      ctx.translate(g.x, g.y); ctx.rotate(g.rot);
      ctx.font = '300 ' + g.s + 'px Fraunces, Georgia, serif';
      ctx.fillStyle = 'rgba(186,200,177,' + g.a + ')';
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }

    // motes
    for(i = 0; i < motes.length; i++){
      m = motes[i];
      if(pointer.active){
        dx = m.x - pointer.x; dy = m.y - pointer.y; d = Math.sqrt(dx*dx + dy*dy);
        if(d < 130 && d > 0.1){ var f = (130 - d) / 130 * .9; m.x += dx / d * f; m.y += dy / d * f; }
      }
      m.x += m.vx; m.y += m.vy;
      if(m.y < -10){ m.y = H + 10; m.x = Math.random() * W; }
      if(m.x < -10) m.x = W + 10; else if(m.x > W + 10) m.x = -10;
    }
    ctx.lineWidth = 1;
    for(i = 0; i < motes.length; i++){
      m = motes[i];
      for(j = i + 1; j < motes.length; j++){
        dx = m.x - motes[j].x; dy = m.y - motes[j].y; d = dx*dx + dy*dy;
        if(d < 12100){
          ctx.strokeStyle = 'rgba(123,150,105,' + ((1 - Math.sqrt(d) / 110) * .32).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(motes[j].x, motes[j].y); ctx.stroke();
        }
      }
      if(pointer.active){
        dx = m.x - pointer.x; dy = m.y - pointer.y; d = Math.sqrt(dx*dx + dy*dy);
        if(d < 190){
          ctx.strokeStyle = 'rgba(186,200,177,' + ((1 - d / 190) * .5).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(214,226,206,' + m.a + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  function startCanvas(){
    if(!ctx || running) return;
    sizeCanvas();
    if(reduce){ running = true; frame(); running = false; return; } // one still frame
    running = true; raf = requestAnimationFrame(frame);
  }
  function stopCanvas(){ running = false; cancelAnimationFrame(raf); }
  window.addEventListener('resize', function(){ if(gate.classList.contains('is-hidden')) return; sizeCanvas(); });
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ stopCanvas(); }
    else if(!gate.classList.contains('is-hidden') && !gate.classList.contains('is-gone')){ running = false; startCanvas(); }
  });

  /* cursor spotlight + gentle parallax on the scene */
  var pending = false;
  gate.addEventListener('pointermove', function(e){
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    pointer.nx = e.clientX / window.innerWidth; pointer.ny = e.clientY / window.innerHeight;
    if(pending) return; pending = true;
    requestAnimationFrame(function(){
      pending = false;
      gate.style.setProperty('--gx', (pointer.nx * 100).toFixed(1) + '%');
      gate.style.setProperty('--gy', (pointer.ny * 100).toFixed(1) + '%');
      if(sceneEl && !reduce) sceneEl.style.transform = 'translate(' + ((.5 - pointer.nx) * 22).toFixed(1) + 'px,' + ((.5 - pointer.ny) * 14).toFixed(1) + 'px)';
    });
  });
  gate.addEventListener('pointerleave', function(){ pointer.active = false; });

  /* --------------------------------------------------------
     Role cards: cursor light, tilt, click burst
     -------------------------------------------------------- */
  var cards = Array.prototype.slice.call(gate.querySelectorAll('.role-card'));
  cards.forEach(function(card){
    card.addEventListener('pointermove', function(e){
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      if(e.pointerType === 'mouse' && !reduce){
        card.style.setProperty('--ry', ((x / r.width - .5) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((.5 - y / r.height) * 6).toFixed(2) + 'deg');
      }
    });
    card.addEventListener('pointerleave', function(){
      card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
    });
    card.addEventListener('click', function(e){
      var r = card.getBoundingClientRect();
      var cx = e.clientX, cy = e.clientY;
      if(!cx && !cy){ cx = r.left + r.width / 2; cy = r.top + r.height / 2; } // keyboard activation
      choose(card, cx, cy);
    });
  });

  var chosen = false;
  function choose(card, cx, cy){
    if(chosen || gate.getAttribute('data-stage') !== 'select') return;
    chosen = true;
    var role = card.getAttribute('data-role');
    var r = card.getBoundingClientRect();

    gate.classList.add('is-leaving');
    cards.forEach(function(c){ c.classList.add(c === card ? 'is-chosen' : 'is-dismissed'); });

    var rip = document.createElement('span');
    rip.className = 'rc-ripple';
    rip.style.left = (cx - r.left) + 'px'; rip.style.top = (cy - r.top) + 'px';
    card.appendChild(rip);

    var delay = reduce ? 0 : 420;
    later(function(){
      gate.style.setProperty('--wx', cx + 'px'); gate.style.setProperty('--wy', cy + 'px');
      gate.classList.add('wash-go');
    }, delay);
    later(function(){ if(window.AX && window.AX.app) window.AX.app.enter(role); }, delay + 350);
    later(function(){
      lockApp(false);
      appEl.classList.remove('app-enter'); void appEl.offsetWidth; appEl.classList.add('app-enter');
      gate.classList.add('is-gone');
    }, delay + (reduce ? 50 : 1000));
    later(function(){
      gate.classList.add('is-hidden');
      stopCanvas();
      rip.remove();
      setStage('done');
    }, delay + (reduce ? 100 : 1700));
    later(function(){ appEl.classList.remove('app-enter'); }, delay + 3000);
  }

  /* --------------------------------------------------------
     Opening sequence
     -------------------------------------------------------- */
  function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
  function runCounter(ms){
    var t0 = null;
    function tick(ts){
      if(introDone) return;
      if(t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms), v = ease(p);
      counter.textContent = Math.round(v * 100);
      bar.style.transform = 'scaleX(' + v.toFixed(4) + ')';
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function openSelect(){
    if(introDone) return;
    introDone = true;
    counter.textContent = '100'; bar.style.transform = 'scaleX(1)';
    clearTimers();
    setStage('exit');
    later(function(){
      gate.classList.add('is-open');
      setStage('open');
      selectEl.removeAttribute('inert');
    }, reduce ? 0 : 420);
    later(function(){
      setStage('select');
      if(intro) intro.style.display = 'none';
      var first = gate.querySelector('.role-card');
      if(first && document.activeElement === document.body) { /* leave focus alone; keyboard users tab in */ }
    }, reduce ? 50 : 420 + 1250);
  }

  function skipIntro(){
    if(gate.getAttribute('data-stage') === 'intro') openSelect();
  }
  intro.addEventListener('click', skipIntro);
  document.addEventListener('keydown', function(e){
    if(gate.getAttribute('data-stage') === 'intro' && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); skipIntro(); }
  });

  function start(){
    startCanvas();
    if(reduce){
      counter.textContent = '100'; bar.style.transform = 'scaleX(1)';
      openSelect();
      return;
    }
    runCounter(2850);
    later(openSelect, 3100);
  }

  /* --------------------------------------------------------
     Public: return to the role selection from inside the app
     -------------------------------------------------------- */
  window.AX = window.AX || {};
  window.AX.gate = {
    show: function(){
      clearTimers();
      chosen = false; introDone = true;
      gate.classList.remove('is-gone', 'is-hidden', 'is-leaving', 'wash-go');
      cards.forEach(function(c){ c.classList.remove('is-chosen', 'is-dismissed'); c.style.setProperty('--rx','0deg'); c.style.setProperty('--ry','0deg'); });
      if(intro) intro.style.display = 'none';
      selectEl.removeAttribute('inert');
      lockApp(true);
      gate.classList.add('is-open');
      setStage('select');
      var old = gate.querySelector('.rc-ripple'); if(old) old.remove();
      running = false; startCanvas();
      var first = gate.querySelector('.role-card'); if(first) first.focus({ preventScroll:true });
    }
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
