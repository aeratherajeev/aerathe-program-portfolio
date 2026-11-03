/* Shared behaviour for every page: mobile menu, header state, reading progress,
   active section in the nav (homepage), and image placeholders. */
(function () {
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');

  // Mobile menu
  if (menuBtn && nav) {
    function setOpen(open) {
      header.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    }
    menuBtn.addEventListener('click', function () { setOpen(!header.classList.contains('menu-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // Header gets a hairline once the page scrolls; inner pages show reading progress
  var bar = document.querySelector('.progress span');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Homepage: highlight the nav link for the section in view
  if (nav && 'IntersectionObserver' in window) {
    var map = {};
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) map[el.id] = a;
    });
    var ids = Object.keys(map);
    if (ids.length) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
        var active = null;
        ids.forEach(function (id) { if (visible[id] && !active) active = id; });
        ids.forEach(function (id) {
          if (id === active) map[id].setAttribute('aria-current', 'location');
          else map[id].removeAttribute('aria-current');
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      ids.forEach(function (id) { io.observe(document.getElementById(id)); });
    }
  }

  // Image placeholders: a .thumb or .cover shows its label until its image file loads.
  // Drop the real file in at the same path and it appears automatically.
  document.querySelectorAll('.thumb img, .cover img').forEach(function (img) {
    var box = img.closest('.thumb, .cover') || img.parentElement;
    function filled() { if (img.naturalWidth) box.classList.add('has-img'); }
    if (img.complete) filled();
    img.addEventListener('load', filled);
  });
})();

/* Tabs: segmented switch with arrow-key support. Without JavaScript every panel stays visible. */
(function () {
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
    var thumb = root.querySelector('.lv-thumb');
    root.classList.add('is-enhanced');
    function moveThumb(t) {
      if (!thumb) return;
      thumb.style.width = t.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + t.offsetLeft + 'px)';
    }
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      moveThumb(t);
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); return; }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); return; }
        if (!n) return;
        e.preventDefault();
        select(tabs[(i + n + tabs.length) % tabs.length], true);
      });
    });
    var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(current);
    window.addEventListener('resize', function () { moveThumb(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveThumb(current); });
  });
})();

/* Approach page: open a problem from its link (#p1–#p9), and "Expand all". */
(function () {
  var list = [].slice.call(document.querySelectorAll('.problems details[id]'));
  if (!list.length) return;
  function openFromHash() {
    var id = location.hash.slice(1);
    var el = id && document.getElementById(id);
    if (!el || el.tagName !== 'DETAILS') return;
    el.open = true;
    requestAnimationFrame(function () { el.scrollIntoView({ block: 'start' }); });
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
  var btn = document.querySelector('[data-expand-all]');
  if (btn) {
    function sync() {
      var all = list.every(function (d) { return d.open; });
      btn.textContent = all ? 'Collapse all' : 'Expand all';
      btn.setAttribute('aria-pressed', String(all));
    }
    btn.addEventListener('click', function () {
      var open = !list.every(function (d) { return d.open; });
      list.forEach(function (d) { d.open = open; });
      sync();
    });
    list.forEach(function (d) { d.addEventListener('toggle', sync); });
    sync();
  }
})();

/* Homepage: problem carousel (scroll-snap, arrows, counter, keyboard). No autoplay. */
(function () {
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.pc-track');
    var cards = [].slice.call(track.children);
    var section = root.closest('section') || document;
    var prev = section.querySelector('[data-pc-prev]');
    var next = section.querySelector('[data-pc-next]');
    var cur = section.querySelector('[data-pc-current]');
    function step() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth; }
    function index() { return Math.round(track.scrollLeft / step()); }
    function update() {
      var i = Math.min(cards.length - 1, Math.max(0, index()));
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (cur) cur.textContent = atEnd ? cards.length : i + 1;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = atEnd;
    }
    function go(dir) {
      var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      track.scrollBy({ left: dir * step(), behavior: smooth ? 'smooth' : 'auto' });
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    var t; track.addEventListener('scroll', function () { cancelAnimationFrame(t); t = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();

/* Clients marquee: two rows, the first drifts left and the second right (data-dir). Each auto-scrolls,
   doesn't stop on hover, and can be click-dragged or swiped either way with a little momentum. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.marquee').forEach(function (root) {
  var tracks = [].slice.call(root.querySelectorAll('.marquee-track'));
  if (tracks.length < 2) return;
  var dir = root.getAttribute('data-dir') === 'right' ? 1 : -1;
  root.classList.add('is-drag');
  var W = 0, x = 0, auto = 0, vel = 0, dragging = false, lastX = 0, lastT = 0, moved = 0, prev = performance.now();
  function measure() { W = tracks[0].offsetWidth; auto = dir * W / 44000; if (!vel) vel = auto; }
  function apply() {
    if (W) { x = x % W; if (x > 0) x -= W; }
    var t = 'translate3d(' + x + 'px,0,0)';
    tracks.forEach(function (el) { el.style.transform = t; });
  }
  function frame(now) {
    var dt = Math.min(64, now - prev); prev = now;
    if (!dragging) {
      vel += (auto - vel) * Math.min(1, dt / 400);   // ease momentum back to cruising speed
      x += vel * dt;
      apply();
    }
    requestAnimationFrame(frame);
  }
  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; moved = 0; lastX = e.clientX; lastT = performance.now(); vel = 0;
    root.classList.add('is-grabbing');
    try { root.setPointerCapture(e.pointerId); } catch (_) {}
  });
  root.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var now = performance.now(), dx = e.clientX - lastX;
    x += dx; moved += Math.abs(dx);
    vel = dx / Math.max(1, now - lastT);
    lastX = e.clientX; lastT = now;
    apply();
  });
  function end() {
    if (!dragging) return;
    dragging = false; root.classList.remove('is-grabbing');
    vel = Math.max(-3, Math.min(3, vel));
    if (performance.now() - lastT > 80) vel = auto;  // held still before letting go: no fling
  }
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('lostpointercapture', end);
  root.addEventListener('dragstart', function (e) { e.preventDefault(); });
  window.addEventListener('resize', measure);
  measure(); apply(); requestAnimationFrame(frame);
  });
})();


/* Films bubbles: stretch the bubble layer down to the bottom of the page, so bubbles start at the footer. */
(function () {
  var films = document.getElementById('films');
  var layer = films && films.querySelector('.bubbles');
  if (!layer) return;
  function fit() {
    layer.style.setProperty('--bub-ext', '0px');          // measure without the layer's own extension
    var docH = document.documentElement.scrollHeight;
    var filmsBottom = films.getBoundingClientRect().bottom + window.scrollY;
    layer.style.setProperty('--bub-ext', (-Math.max(0, docH - filmsBottom)) + 'px');
  }
  fit();
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(document.body);
})();

/* Screenshot lightbox (CapacityOS proofs) */
(function(){
  var dlg=document.querySelector('.shot-lightbox'); if(!dlg||!dlg.showModal) return;
  var img=dlg.querySelector('img');
  document.querySelectorAll('.shot-zoom').forEach(function(b){
    b.addEventListener('click',function(){ img.src=b.getAttribute('data-full'); img.alt=(b.querySelector('img')||{}).alt||''; dlg.showModal(); });
  });
  dlg.querySelector('.shot-close').addEventListener('click',function(){ dlg.close(); });
  dlg.addEventListener('click',function(e){ if(e.target===dlg) dlg.close(); });
})();

/* Page navigation: always open a new page at its top (unless it targets a #section or is a back/forward visit). */
(function () {
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  if (!location.hash && nav.type !== 'back_forward') {
    window.scrollTo(0, 0);
    // In embedded previews the surrounding frame can keep its scroll; bring the page's top into view there too.
    if (window.self !== window.top) { try { document.documentElement.scrollIntoView({ block: 'start' }); } catch (e) {} }
  }
  // Arriving at a #section from another page: images and fonts that load after the first jump can push
  // the section down, so settle on it again once the page has finished loading.
  if (location.hash && nav.type !== 'back_forward') {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && target.tagName !== 'DETAILS') {
      var userMoved = false, stopAt = 0;
      var settle = function () { if (!userMoved) target.scrollIntoView({ block: 'start' }); };
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
        window.addEventListener(ev, function () { userMoved = true; }, { passive: true, once: true });
      });
      window.addEventListener('load', function () { settle(); stopAt = performance.now() + 3000; });
      if ('ResizeObserver' in window) {
        var ro = new ResizeObserver(function () {
          if (userMoved || (stopAt && performance.now() > stopAt)) { ro.disconnect(); return; }
          settle();
        });
        ro.observe(document.body);
      }
    }
  }
})();

/* Dot-grid paper. Everything snaps to one 20px lattice of dots:
   1. the content column is a whole number of grid squares wide, so its left and right edges sit on dots;
   2. card grids get whole-square column widths, and every card is a whole number of squares tall;
   3. key blocks (sections, bands, card grids, images) are nudged down so their top edge lands on a dot row;
   4. bands draw their own background, so their dots get an offset that continues the same lattice. */
(function () {
  var G = 20, root = document.documentElement;
  var GRIDS = '.cs-grid, .work, .ff-pair, .film-pair, .sw-grid, .award-list, .lv-cards, .levels, .quotes, .phases, .film-grid, .films, .principles, .cred-grid, .flowline, .shots-grid, .proof, .stats, .decision-cards, .check-list, .lead-cards, .wr-list, .ab-path, .ab-cols, .role-scale, .method';
  var STACKS = '.work > li, .writing > li, .wr-list[data-view="list"] > li, .timeline > li, .problems > details, .cap-list > div';
  var BLOCKS = 'main > figure, main > nav, main > a.next, .clients, .awards, .section-head, .sw-grid, .award-list, .marquee, .lv-cards, .levels-cols, .role-scale, .work, .writing, .pc, .actions, .ab-banner, .ab-cols, .ab-path, .proof, .ff-pair, .film-pair, .film-grid, .contact-row, .cs-hero, .cover, .about-banner, .stats, .levels, .principles, .method, .phases, .cred-grid, .flowline, .shots, .shots-grid, .table-scroll, .lead-cards, .decision-cards, .check-list, .wr-bar, .wr-list, .timeline, .cap-list, .tree, .problems, .pgroup, .phead';
  var mod = function (n) { return ((n % G) + G) % G; };
  var busy = false, raf = 0, lastW = 0, lastH = 0;
  function mark(el) { el.setAttribute('data-snap', ''); }
  function px(v) { return parseFloat(v) || 0; }
  function snap() {
    raf = 0; busy = true;
    document.querySelectorAll('[data-snap]').forEach(function (el) {
      el.style.marginTop = ''; el.style.minHeight = ''; el.style.gridTemplateColumns = ''; el.style.columnGap = ''; el.style.paddingBottom = '';
      el.removeAttribute('data-snap');
    });
    // 1. content column: a whole number of squares (920px max)
    var cw = root.clientWidth;
    root.style.setProperty('--wrap-w', Math.min(920, Math.floor((cw - 48) / G) * G) + 'px');
    // 2. card grids: whole-square columns, whole-square card heights
    document.querySelectorAll(GRIDS).forEach(function (g) {
      var cs = getComputedStyle(g);
      if (cs.display !== 'grid') return;
      var n = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
      var cg = px(cs.columnGap), rg = px(cs.rowGap);
      if (n > 1 && mod(cg) === 0) {
        var W = g.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
        var cur = px(cs.gridTemplateColumns.split(' ')[0]), col = 0, gap = cg;
        if (g.scrollWidth > g.clientWidth + 1) {
          // a sideways-scrolling row (mobile carousel) keeps its card size, rounded to whole squares
          col = Math.round(cur / G) * G;
        } else {
          // span the full width end to end: find the gap nearest the designed one that leaves whole-square columns
          for (var k = 0; k <= 6 && !col; k++) {
            [cg - k * G, cg + k * G].some(function (t) {
              if (t < G) return false;
              var c = (W - (n - 1) * t) / n;
              if (c >= G && t <= c / 2 && Math.abs(c / G - Math.round(c / G)) < 0.01) { col = Math.round(c); gap = t; return true; }
              return false;
            });
          }
        }
        if (col > 0) { g.style.gridTemplateColumns = 'repeat(' + n + ', ' + col + 'px)'; if (gap !== cg) g.style.columnGap = gap + 'px'; mark(g); }
      }
      if (mod(rg) === 0) [].forEach.call(g.children, function (c) {
        var h = c.getBoundingClientRect().height;
        if (h && mod(h) > 0.5) { c.style.minHeight = Math.ceil(h / G) * G + 'px'; mark(c); }
      });
    });
    document.querySelectorAll(STACKS).forEach(function (c) {
      var h = c.getBoundingClientRect().height;
      if (h && mod(h) > 0.5) { c.style.minHeight = Math.ceil(h / G) * G + 'px'; mark(c); }
    });
    // 3. block tops onto dot rows (dots sit at y = 10, 30, 50 … in page coordinates)
    function snapTops() {
      document.querySelectorAll(BLOCKS).forEach(function (el) {
        if (el.classList.contains('band') || el.matches('main > section, main > div')) return;
        for (var i = 0; i < 4; i++) {
          var top = el.getBoundingClientRect().top + window.scrollY;
          var d = mod(G / 2 - top);
          if (d < 0.5 || d > G - 0.5) break;
          // margins collapse with the block above, so start from whichever margin is larger
          var prev = el.previousElementSibling, mt = px(getComputedStyle(el).marginTop);
          if (prev) mt = Math.max(mt, px(getComputedStyle(prev).marginBottom));
          el.style.marginTop = (mt + d) + 'px'; mark(el);
        }
      });
    }
    snapTops();
    snapTops();
    align();
    lastW = cw; lastH = document.documentElement.scrollHeight;
    busy = false;
  }
  // 4. dots: lock to the content's left edge, and continue the lattice inside bands
  function align() {
    var wrap = document.querySelector('main.wrap') || document.querySelector('.wrap');
    if (!wrap) return;
    var x0 = wrap.getBoundingClientRect().left + px(getComputedStyle(wrap).paddingLeft);
    root.style.setProperty('--gx', mod(x0 - G / 2) + 'px');
    var bandLeft = -(window.innerWidth - root.clientWidth) / 2;
    document.querySelectorAll('.band').forEach(function (b) {
      var top = b.getBoundingClientRect().top + window.scrollY;
      b.style.setProperty('--bx', mod(x0 - G / 2 - bandLeft) + 'px');
      b.style.setProperty('--by', mod(-top) + 'px');
    });
  }
  function queue() { if (!busy && !raf) raf = requestAnimationFrame(snap); }
  window.__snapGrid = snap;
  snap();
  window.addEventListener('resize', function () { if (root.clientWidth !== lastW) queue(); });
  window.addEventListener('load', queue);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  // late content (images, lists filled by script, opened cards) changes heights: re-snap
  if ('ResizeObserver' in window) new ResizeObserver(function () {
    if (!busy && Math.abs(document.documentElement.scrollHeight - lastH) > 1) queue();
  }).observe(document.body);
  document.addEventListener('toggle', queue, true);
})();

/* Sea turtles: two line-drawn turtles swimming slowly behind the content on every page */
(function(){
  if(document.querySelector('.sea-turtles')) return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // top-down sea turtle, line drawing, facing up (−y); flippers animate
  var SVG='<svg viewBox="0 0 80 80" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+
   '<g class="tf tf-l"><path d="M27 30 C 18 24, 9 24, 4 29 C 11 30, 18 33, 25 38"/></g>'+
   '<g class="tf tf-r"><path d="M53 30 C 62 24, 71 24, 76 29 C 69 30, 62 33, 55 38"/></g>'+
   '<g class="tb tb-l"><path d="M29 54 C 24 57, 21 61, 20 65 C 24 63, 28 60, 31 57"/></g>'+
   '<g class="tb tb-r"><path d="M51 54 C 56 57, 59 61, 60 65 C 56 63, 52 60, 49 57"/></g>'+
   '<path d="M38 60 L 40 67 L 42 60"/>'+
   '<path d="M40 14 C 44 14, 46 17, 46 20 C 46 23, 43 25, 40 25 C 37 25, 34 23, 34 20 C 34 17, 36 14, 40 14 Z"/>'+
   '<circle cx="37.6" cy="18.5" r=".9" fill="currentColor" stroke="none"/><circle cx="42.4" cy="18.5" r=".9" fill="currentColor" stroke="none"/>'+
   '<path d="M40 24 C 51 24, 57 33, 57 43 C 57 53, 50 61, 40 61 C 30 61, 23 53, 23 43 C 23 33, 29 24, 40 24 Z"/>'+
   '<path d="M40 34 L 46 38 L 46 46 L 40 50 L 34 46 L 34 38 Z" opacity=".75"/>'+
   '<path d="M40 24 V 34 M46 38 L 55 34 M46 46 L 55 50 M40 50 V 61 M34 46 L 25 50 M34 38 L 25 34" opacity=".6"/>'+
   '</g></svg>';
  var layer=document.createElement('div'); layer.className='sea-turtles'; layer.setAttribute('aria-hidden','true');
  var T=[{c:'#2f9e7e',s:58,sp:.018,y0:.28,amp:.10,ph:0,dir:1,off:.15},{c:'#1f6f98',s:42,sp:.013,y0:.68,amp:.08,ph:2.1,dir:-1,off:.6}];
  T.forEach(function(t){var e=document.createElement('div');e.className='sea-turtle';e.style.color=t.c;e.style.width=t.s+'px';e.innerHTML=SVG;layer.appendChild(e);t.el=e;});
  document.body.appendChild(layer);
  function pos(t,time){
    var W=innerWidth,H=innerHeight,m=t.s*1.5, span=W+2*m;
    var u=((time*t.sp+t.off)%1+1)%1;
    var x=t.dir>0? -m+u*span : W+m-u*span;
    var y=H*(t.y0+t.amp*Math.sin(u*6.283*1.2+t.ph));
    return [x,y];
  }
  function frame(time){
    T.forEach(function(t){
      var a=pos(t,time), b=pos(t,time+0.2);
      var ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI+90;
      t.el.style.transform='translate('+(a[0]-t.s/2)+'px,'+(a[1]-t.s/2)+'px) rotate('+ang+'deg)';
    });
  }
  window.__turtles=frame;
  if(reduce){frame(8);return;}
  if(window.__turtlesManual){frame(0);return;}
  var st=performance.now();(function loop(now){frame((now-st)/1000);requestAnimationFrame(loop);})(st);
})();
