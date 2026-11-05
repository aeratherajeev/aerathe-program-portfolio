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
  // Both rows cruise at the same speed in px per ms, however long each row is
  function measure() { W = tracks[0].offsetWidth; auto = dir * (window.innerWidth <= 640 ? 0.024 : 0.03); if (!vel) vel = auto; }
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
   3. every block top and every horizontal line (section dividers, card edges, list rules) lands on a dot row;
   4. bands draw their own background, so their dots get an offset that continues the same lattice. */
(function () {
  var G = 20, root = document.documentElement;
  var GRIDS = '.cs-grid, .work, .ff-pair, .film-pair, .sw-grid, .award-list, .lv-cards, .levels, .quotes, .phases, .film-grid, .films, .principles, .cred-grid, .flowline, .shots-grid, .proof, .stats, .decision-cards, .check-list, .lead-cards, .wr-list, .ab-path, .ab-cols, .role-scale, .method';
  var STACKS = '.table-scroll, .work > li, .writing > li, .wr-list[data-view="list"] > li, .timeline > li, .problems > details, .cap-list > div';
  var BLOCKS = '.cs-meta, .cs-grid, main table, main > figure, main > nav, main > a.next, .clients, .awards, .section-head, .sw-grid, .award-list, .marquee, .lv-cards, .levels-cols, .role-scale, .work, .writing, .pc, .actions, .ab-banner, .ab-cols, .ab-path, .proof, .ff-pair, .film-pair, .film-grid, .contact-row, .cs-hero, .cover, .about-banner, .stats, .levels, .principles, .method, .phases, .cred-grid, .flowline, .shots, .shots-grid, .table-scroll, .lead-cards, .decision-cards, .check-list, .wr-bar, .wr-list, .timeline, .cap-list, .tree, .problems, .pgroup, .phead';
  var mod = function (n) { return ((n % G) + G) % G; };
  var busy = false, raf = 0, lastW = 0, lastH = 0;
  // remember each element's own inline style before the grid touches it, so a re-snap restores it exactly
  var changes = 0;
  function mark(el) { changes++; if (!el.hasAttribute('data-snap')) { el.__snapOrig = el.getAttribute('style'); el.setAttribute('data-snap', ''); } }
  function px(v) { return parseFloat(v) || 0; }
  function snap() {
    raf = 0; busy = true;
    document.querySelectorAll('[data-snap]').forEach(function (el) {
      if (el.__snapOrig == null) el.removeAttribute('style'); else el.setAttribute('style', el.__snapOrig);
      el.__base = null;
      el.removeAttribute('data-snap');
    });
    // 1. content column: a whole number of squares (920px max)
    var cw = root.clientWidth;
    root.style.setProperty('--wrap-w', Math.min(920, Math.floor((cw - 48) / G) * G) + 'px');
    // 3. vertical rhythm: block tops and every horizontal line land on a dot row
    //    (dots sit at y = 10, 30, 50 … in page coordinates). Top-level sections are moved by growing the
    //    section above them (padding, so bands never show a gap); everything else gets a little extra margin.
    var SKIP = '.marquee, .pc-track, .sw-grid, .sea-turtles, .hero-dots, .gz-art, .gz-cmp, .st-art';
    function visible(el) { return el.offsetParent !== null || getComputedStyle(el).position === 'fixed'; }
    function lined(el) {
      var cs = getComputedStyle(el);
      return px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.borderTopColor) &&
        el.getBoundingClientRect().width >= 200;
    }
    function sideBySide(el) {
      var par = el.parentElement; if (!par) return false;
      var pcs = getComputedStyle(par);
      if (!/flex/.test(pcs.display) || pcs.flexDirection.indexOf('row') !== 0) return false;
      var r = el.getBoundingClientRect();
      return [].some.call(par.children, function (k) {
        if (k === el || k.offsetParent === null) return false;
        var q = k.getBoundingClientRect();
        return q.width > 0 && q.top < r.bottom - 1 && q.bottom > r.top + 1;
      });
    }
    function candidates() {
      var set = new Set();
      var main = document.querySelector('main');
      if (!main) return [];
      [].forEach.call(main.children, function (el) { set.add(el); });
      document.querySelectorAll(BLOCKS).forEach(function (el) { set.add(el); });
      main.querySelectorAll('*').forEach(function (el) { if (lined(el)) set.add(sideBySide(el) && el.parentElement !== main ? el.parentElement : el); });
      return Array.from(set).filter(function (el) {
        if (!visible(el) || el.closest(SKIP)) return false;
        var pos = getComputedStyle(el).position; if (pos === 'absolute' || pos === 'fixed') return false;
        var pd = el.parentElement && getComputedStyle(el.parentElement).display;
        // items laid out side by side follow their container, which is snapped instead
        if (el.parentElement !== main) {
          var pcs = getComputedStyle(el.parentElement);
          var oneCol = pcs.gridTemplateColumns.split(' ').filter(Boolean).length <= 1;
          if (((pd === 'grid' || pd === 'inline-grid') && !oneCol) || (pd === 'flex' && pcs.flexDirection.indexOf('row') === 0 && pcs.flexWrap !== 'wrap') || sideBySide(el)) return false;
        }
        return true;
      }).sort(function (x, y) { return x.compareDocumentPosition(y) & 4 ? -1 : 1; });
    }
    // nudge a length to the nearest dot row, but never below what the element had before the grid touched it
    function nearest(el, prop, current, d) {
      el.__base = el.__base || {};
      if (el.__base[prop] == null) el.__base[prop] = current;
      var v = current + (d > G / 2 ? d - G : d);
      if (v < el.__base[prop] - 0.01) v += G;
      return v;
    }
    function snapRhythm() {
      var main = document.querySelector('main');
      candidates().forEach(function (el) {
        for (var i = 0; i < 4; i++) {
          var top = el.getBoundingClientRect().top + window.scrollY;
          var d = mod(G / 2 - top);
          if (d < 0.5 || d > G - 0.5) break;
          if (el.parentElement === main) {
            var prev = el.previousElementSibling;
            while (prev && !visible(prev)) prev = prev.previousElementSibling;
            if (!prev) break;
            var pb = px(getComputedStyle(prev).paddingBottom); mark(prev); prev.style.setProperty('padding-bottom', nearest(prev, 'pb', pb, d) + 'px', 'important');
          } else {
            // margins collapse with the block above, so start from whichever margin is larger
            var sib = el.previousElementSibling, mt = px(getComputedStyle(el).marginTop);
            if (sib) mt = Math.max(mt, px(getComputedStyle(sib).marginBottom));
            mark(el); el.style.setProperty('margin-top', nearest(el, 'mt', mt, d) + 'px', 'important');
          }
        }
      });
    }
    function bottomLined(el) {
      var cs = getComputedStyle(el);
      return cs.display !== 'inline' && cs.display.indexOf('table') !== 0 && px(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none' &&
        !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.borderBottomColor) && el.getBoundingClientRect().width >= 200 && visible(el) && !el.closest(SKIP);
    }
    function snapBottoms(pass) {
      var main = document.querySelector('main'); if (!main) return;
      main.querySelectorAll('*').forEach(function (el) {
        // buttons and pills keep their designed height; only their position follows the grid
        if (!bottomLined(el) || el.__rounded || el.matches('.btn, .chain > *, .gx-phases > li, .gx-qs > li, .gx-proof > li')) return;
        var r = el.getBoundingClientRect(), bottom = r.bottom + window.scrollY;
        // wait for the top to settle on a dot row first, or the height gets corrected twice
        var dt = mod(G / 2 - (r.top + window.scrollY));
        if (pass < 5 && dt > 0.5 && dt < G - 0.5) return;
        var d = mod(G / 2 - bottom);
        if (d < 0.5 || d > G - 0.5) return;
        // bottom just past a dot row: trim the overshoot from the bottom padding rather than adding a near-empty square
        var back = G - d, pb = px(getComputedStyle(el).paddingBottom);
        el.__base = el.__base || {};
        if (back <= 6 && pb - back >= 12 && el.__base.trim == null) {
          el.__base.trim = back; mark(el); el.style.removeProperty('min-height'); el.style.setProperty('padding-bottom', (pb - back) + 'px', 'important'); return;
        }
        mark(el); el.style.setProperty('min-height', nearest(el, 'h', r.height, d) + 'px', 'important');
      });
    }
    // round a card up to whole squares from its natural height, so repeated passes never keep growing it
    function roundUp(c) {
      if (c.matches('.btn, .chain > *, .gx-phases > li, .gx-qs > li, .gx-proof > li')) return;
      c.__base = c.__base || {};
      if (c.__base.nat == null) c.__base.nat = c.getBoundingClientRect().height;
      var h = c.__base.nat, want = Math.ceil(h / G - 0.025) * G;
      if (!h) return;
      c.__rounded = true;
      // only a few pixels over a whole square: take them out of the bottom padding instead of adding a near-empty square
      var over = mod(h), pb = px(getComputedStyle(c).paddingBottom);
      if (over > 0.5 && over <= 6 && pb - over >= 12 && c.__base.trim == null) {
        c.__base.trim = over; mark(c);
        c.style.setProperty('padding-bottom', (pb - over) + 'px', 'important');
        c.__base.nat = h - over; want = c.__base.nat;
      }
      if (Math.abs(c.getBoundingClientRect().height - want) < 0.5) return;
      mark(c); c.style.minHeight = want + 'px';
    }
    function roundHeights() {
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
        if (col > 0) { var tpl = 'repeat(' + n + ', ' + col + 'px)'; if (g.style.gridTemplateColumns !== tpl || (gap !== cg && g.style.columnGap !== gap + 'px')) { mark(g); g.style.gridTemplateColumns = tpl; if (gap !== cg) g.style.columnGap = gap + 'px'; } }
      }
      if (mod(rg) === 0) [].forEach.call(g.children, function (c) { roundUp(c); });
    });
    document.querySelectorAll('main table tr').forEach(function (tr) {
      var h = tr.getBoundingClientRect().height;
      if (h && mod(h) > 0.5) { mark(tr); tr.style.height = Math.ceil(h / G) * G + 'px'; }
    });
    document.querySelectorAll(STACKS).forEach(roundUp);
    document.querySelectorAll('main *').forEach(function (row) {
      var cs = getComputedStyle(row);
      if (!/flex/.test(cs.display) || cs.flexWrap !== 'wrap' || cs.flexDirection.indexOf('row') !== 0) return;
      var rg = px(cs.rowGap); if (!mod(rg)) return;
      var lineds = [].filter.call(row.children, function (k) { return k.offsetParent !== null && (px(getComputedStyle(k).borderTopWidth) > 0 || px(getComputedStyle(k).borderBottomWidth) > 0); });
      if (lineds.length < 2) return;
      mark(row); row.style.setProperty('row-gap', Math.max(G, Math.round(rg / G) * G) + 'px', 'important');
    });
    }
    // each adjustment can shift what follows, so repeat until a full pass changes nothing
    document.querySelectorAll('main *').forEach(function (el) { el.__rounded = false; });
    for (var pass = 0; pass < 8; pass++) { changes = 0; roundHeights(); snapRhythm(); snapBottoms(pass); if (!changes) break; }
    snapRhythm();
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
  // web fonts can finish after the first pass and shift everything by a few pixels: settle again
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', queue);
  window.addEventListener('load', function () { setTimeout(queue, 600); setTimeout(queue, 1800); });
  // late content (images, lists filled by script, opened cards) changes heights: re-snap
  if ('ResizeObserver' in window) new ResizeObserver(function () {
    if (!busy && Math.abs(document.documentElement.scrollHeight - lastH) > 1) queue();
  }).observe(document.body);
  document.addEventListener('toggle', queue, true);
})();

/* Sea turtles: two line-drawn turtles swimming in the first fold of each page (they scroll away with it).
   Each keeps its own slow path; when the cursor comes close, it swims away and then drifts back to its path. */
(function () {
  if (document.querySelector('.sea-turtles')) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVG = '<svg viewBox="0 0 80 80" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<g class="tf tf-l"><path d="M27 30 C 18 24, 9 24, 4 29 C 11 30, 18 33, 25 38"/></g>' +
    '<g class="tf tf-r"><path d="M53 30 C 62 24, 71 24, 76 29 C 69 30, 62 33, 55 38"/></g>' +
    '<g class="tb tb-l"><path d="M29 54 C 24 57, 21 61, 20 65 C 24 63, 28 60, 31 57"/></g>' +
    '<g class="tb tb-r"><path d="M51 54 C 56 57, 59 61, 60 65 C 56 63, 52 60, 49 57"/></g>' +
    '<path d="M38 60 L 40 67 L 42 60"/>' +
    '<path d="M40 14 C 44 14, 46 17, 46 20 C 46 23, 43 25, 40 25 C 37 25, 34 23, 34 20 C 34 17, 36 14, 40 14 Z"/>' +
    '<circle cx="37.6" cy="18.5" r=".9" fill="currentColor" stroke="none"/><circle cx="42.4" cy="18.5" r=".9" fill="currentColor" stroke="none"/>' +
    '<path d="M40 24 C 51 24, 57 33, 57 43 C 57 53, 50 61, 40 61 C 30 61, 23 53, 23 43 C 23 33, 29 24, 40 24 Z"/>' +
    '<path d="M40 34 L 46 38 L 46 46 L 40 50 L 34 46 L 34 38 Z" opacity=".75"/>' +
    '<path d="M40 24 V 34 M46 38 L 55 34 M46 46 L 55 50 M40 50 V 61 M34 46 L 25 50 M34 38 L 25 34" opacity=".6"/>' +
    '</g></svg>';
  var layer = document.createElement('div');
  layer.className = 'sea-turtles';
  layer.setAttribute('aria-hidden', 'true');
  var T = [
    { c: '#2f9e7e', s: 58, sp: .018, y0: .30, amp: .12, ph: 0,   dir: 1,  off: .15 },
    { c: '#1f6f98', s: 42, sp: .013, y0: .70, amp: .10, ph: 2.1, dir: -1, off: .60 }
  ];
  T.forEach(function (t) {
    var e = document.createElement('div');
    e.className = 'sea-turtle'; e.style.color = t.c; e.style.width = t.s + 'px'; e.innerHTML = SVG;
    layer.appendChild(e); t.el = e; t.dx = 0; t.dy = 0; t.vx = 0; t.vy = 0; t.ang = null;
  });
  document.body.appendChild(layer);
  var W = 0, H = 0;
  function size() { W = document.documentElement.clientWidth; H = Math.max(520, innerHeight); layer.style.height = H + 'px'; }
  size(); addEventListener('resize', size);
  function path(t, time) {
    var m = t.s * 1.5, span = W + 2 * m, u = ((time * t.sp + t.off) % 1 + 1) % 1;
    return [t.dir > 0 ? -m + u * span : W + m - u * span, H * (t.y0 + t.amp * Math.sin(u * 6.283 * 1.2 + t.ph))];
  }
  // cursor position in page coordinates (the layer sits at the top of the page)
  var mx = -9999, my = -9999;
  addEventListener('pointermove', function (e) { mx = e.pageX; my = e.pageY; }, { passive: true });
  document.addEventListener('pointerleave', function () { mx = my = -9999; });
  var last = 0;
  function frame(time) {
    var dt = Math.min(.05, last ? time - last : .016); last = time;
    T.forEach(function (t) {
      var a = path(t, time), b = path(t, time + .2);
      var x = a[0] + t.dx, y = a[1] + t.dy;
      // flee from the cursor
      var ddx = x - mx, ddy = y - my, d = Math.hypot(ddx, ddy), R = 130;
      if (d < R && d > 0.1) { var f = (1 - d / R) * 900; t.vx += ddx / d * f * dt; t.vy += ddy / d * f * dt; }
      // spring back to the path, with damping
      t.vx += -t.dx * 1.2 * dt; t.vy += -t.dy * 1.2 * dt;
      t.vx *= Math.pow(.25, dt); t.vy *= Math.pow(.25, dt);
      t.dx += t.vx * dt; t.dy += t.vy * dt;
      var hx = (b[0] - a[0]) / .2 + t.vx, hy = (b[1] - a[1]) / .2 + t.vy;
      var target = Math.atan2(hy, hx) * 180 / Math.PI + 90;
      if (t.ang === null) t.ang = target;
      var diff = ((target - t.ang + 540) % 360) - 180; t.ang += diff * Math.min(1, dt * 6);
      t.el.classList.toggle('is-fleeing', Math.hypot(t.vx, t.vy) > 60);
      t.el.style.transform = 'translate(' + (x - t.s / 2) + 'px,' + (y - t.s / 2) + 'px) rotate(' + t.ang + 'deg)';
    });
  }
  window.__turtles = frame;
  if (reduce) { frame(8); return; }
  if (window.__turtlesManual) { frame(0); return; }
  var st = performance.now(), raf = 0, on = true;
  function loop(now) { frame((now - st) / 1000); raf = on ? requestAnimationFrame(loop) : 0; }
  raf = requestAnimationFrame(loop);
  // stop animating once the first fold has scrolled out of view
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
    on = e[0].isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop);
  }).observe(layer);
})();
