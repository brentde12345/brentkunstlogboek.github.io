// UI enhancements: TOC highlighting, theme toggle, back-to-top, light particle canvas
(function(){
  // theme toggle (light/dark)
  const toggle = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const saved = localStorage.getItem('site-theme');

  function applyTheme(name){
    if(name === 'dark') root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
    localStorage.setItem('site-theme', name);
    if(toggle) toggle.textContent = name === 'dark' ? '☀️' : '🌙';
  }

  // initial
  if(saved === 'dark') applyTheme('dark');
  else if(saved === 'light') applyTheme('light');
  else {
    // respect prefers-color-scheme
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  if(toggle){
    toggle.addEventListener('click', ()=>{
      const isDark = root.getAttribute('data-theme') === 'dark';
      applyTheme(isDark ? 'light' : 'dark');
    });
  }

  // Back to top
  const btt = document.getElementById('back-to-top');
  function checkBtt(){
    if(window.scrollY > 360) btt.classList.add('show'); else btt.classList.remove('show');
  }
  if(btt){
    btt.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
    window.addEventListener('scroll', checkBtt, {passive:true});
    checkBtt();
  }

  // TOC active state
  const navLinks = Array.from(document.querySelectorAll('#theme-list a'));
  const sections = navLinks.map(a=>document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);

  if('IntersectionObserver' in window && sections.length){
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        const id = e.target.id;
        const link = navLinks.find(a=>a.getAttribute('href').slice(1) === id);
        if(e.isIntersecting){
          navLinks.forEach(x=>x.classList.remove('active'));
          if(link) link.classList.add('active');
        }
      });
    },{threshold:0.45});

    sections.forEach(s=>obs.observe(s));
  }

  // Build a lightweight particle field inside .hero-decor using canvas
  (function heroParticles(){
    const decor = document.querySelector('.hero-decor');
    if(!decor) return;
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.zIndex = '2';
    canvas.style.pointerEvents = 'none';
    decor.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let w=0,h=0,particles=[];

    function resize(){
      w = decor.clientWidth; h = decor.clientHeight;
      canvas.width = w; canvas.height = h;
    }

    function initParticles(){
      particles = [];
      const count = Math.max(12, Math.round((w*h)/60000));
      for(let i=0;i<count;i++){
        particles.push({
          x: Math.random()*w,
          y: Math.random()*h,
          r: 2+Math.random()*6,
          vx: (Math.random()-0.5)*0.2,
          vy: (Math.random()-0.5)*0.2,
          hue: 200 + Math.random()*80
        });
      }
    }

    function draw(){
      ctx.clearRect(0,0,w,h);
      particles.forEach(p=>{
        p.x += p.vx; p.y += p.vy;
        if(p.x < -20) p.x = w + 20;
        if(p.x > w + 20) p.x = -20;
        if(p.y < -20) p.y = h + 20;
        if(p.y > h + 20) p.y = -20;
        ctx.beginPath();
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);
        g.addColorStop(0, `hsla(${p.hue},80%,65%,0.14)`);
        g.addColorStop(0.6, `hsla(${p.hue},80%,60%,0.06)`);
        g.addColorStop(1, `transparent`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.r*3, p.y - p.r*3, p.r*6, p.r*6);
      });
      requestAnimationFrame(draw);
    }

    function start(){
      resize(); initParticles(); draw();
    }

    window.addEventListener('resize', ()=>{ resize(); initParticles(); });
    start();
  })();

  // Reading progress (vertical)
  (function readingProgress(){
    const wrap = document.createElement('div');
    wrap.id = 'reading-progress-vertical';
    const bar = document.createElement('div');
    bar.className = 'bar';
    wrap.appendChild(bar);
    document.body.appendChild(wrap);

    function update(){
      const main = document.getElementById('main');
      if(!main) return;
      const rect = main.getBoundingClientRect();
      const docH = main.scrollHeight || (main.offsetHeight + main.scrollHeight);
      const winH = window.innerHeight;
      const total = Math.max(1, main.scrollHeight - winH);
      const scrolled = Math.min(Math.max(0, window.scrollY - main.offsetTop), total);
      const pct = Math.round((scrolled / total) * 100);
      bar.style.height = (isFinite(pct) && pct > 0 ? pct : 0) + '%';
    }

    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
    update();
  })();

  // Gallery lightbox
  (function galleryLightbox(){
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    if(!items.length) return;

    // create lightbox overlay
    const lx = document.createElement('div');
    lx.className = 'lightbox';
    lx.setAttribute('aria-hidden','true');
    lx.innerHTML = `
      <div class="nav">
        <button class="prev" aria-label="Vorige">‹</button>
        <button class="next" aria-label="Volgende">›</button>
      </div>
      <div class="content" role="dialog" aria-modal="true">
        <div class="image" aria-hidden="true"><img class="lightbox-img" alt=""/></div>
        <div class="caption"></div>
      </div>
    `;
    document.body.appendChild(lx);

    const imgContainer = lx.querySelector('.image');
    const imgEl = lx.querySelector('.image .lightbox-img');
    const capEl = lx.querySelector('.caption');
    function escapeHtml(str){
      return String(str).replace(/[&<>"'`]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[s]);
    }
    let current = 0;

    // show can accept either an index (number) referring to a gallery item
    // or a string URL to open an arbitrary image (used by per-theme images)
    function show(arg, maybeCaption){
      if(typeof arg === 'number'){
        current = (arg + items.length) % items.length;
        const item = items[current];
        const caption = item.querySelector('figcaption') ? item.querySelector('figcaption').textContent : '';
        // try to find an <img> inside item, otherwise fallback to background-image url
        const innerImg = item.querySelector('img');
        if(innerImg && innerImg.src){
          imgEl.src = innerImg.src;
          imgEl.alt = innerImg.alt || caption || '';
        } else {
          const thumb = item.querySelector('.thumb');
          const bg = window.getComputedStyle(thumb).backgroundImage || '';
          const m = /url\(["']?(.*?)["']?\)/.exec(bg);
          imgEl.src = m ? m[1] : '';
          imgEl.alt = caption || '';
        }
        capEl.innerHTML = caption ? `<div class="text">${escapeHtml(caption)}</div>` : '';
      } else if(typeof arg === 'string'){
        // arbitrary image URL
        imgEl.src = arg;
        imgEl.alt = maybeCaption || '';
        capEl.innerHTML = maybeCaption ? `<div class="text">${escapeHtml(maybeCaption)}</div>` : '';
      } else {
        return;
      }
      lx.classList.add('show');
      lx.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
      // focus management
      lx.querySelector('.prev').focus();
    }

    function hide(){
      lx.classList.remove('show');
      lx.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    }

    function next(){ show(current + 1); }
    function prev(){ show(current - 1); }

    items.forEach((it, i)=>{
      it.addEventListener('click', ()=> show(i));
      it.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') show(i); });
      it.setAttribute('tabindex','0');
    });

    lx.querySelector('.next').addEventListener('click', next);
    lx.querySelector('.prev').addEventListener('click', prev);

    lx.addEventListener('click', (e)=>{
      if(e.target === lx) hide();
    });

    document.addEventListener('keydown', (e)=>{
      if(lx.classList.contains('show')){
        if(e.key === 'Escape') hide();
        if(e.key === 'ArrowRight') next();
        if(e.key === 'ArrowLeft') prev();
      }
    });

    // Expose a global helper so other code can open the lightbox with an image URL
    window.openLightbox = function(url, caption){ show(url, caption); };
  })();

  // Make theme images clickable to open in the lightbox (preserve original ratio)
  (function wireThemeImages(){
    const imgs = Array.from(document.querySelectorAll('.theme-image'));
    if(!imgs.length) return;
    imgs.forEach(img=>{
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', ()=>{
        if(window.openLightbox) window.openLightbox(img.src, img.alt || '');
      });
      img.addEventListener('keypress', (e)=>{ if(e.key === 'Enter' && window.openLightbox) window.openLightbox(img.src, img.alt || ''); });
      img.setAttribute('tabindex','0');
    });
  })();

  // Flying dove removed — no runtime behavior required

  // Gallery notes: save and load from localStorage
  (function galleryNotes(){
    const textarea = document.getElementById('gallery-text');
    if(!textarea) return;

    const storageKey = 'gallery-notes';
    const saved = localStorage.getItem(storageKey);
    if(saved) textarea.value = saved;

    let timer = null;
    textarea.addEventListener('input', ()=>{
      if(timer) clearTimeout(timer);
      timer = setTimeout(()=>{
        localStorage.setItem(storageKey, textarea.value);
      }, 800);
    });
    textarea.addEventListener('blur', ()=>{
      if(timer) clearTimeout(timer);
      localStorage.setItem(storageKey, textarea.value);
    });
  })();

  // Inject one image per theme if a matching file exists in `img/{id}.{ext}`
  (function loadThemeImages(){
    const exts = ['webp','png','jpg','jpeg','gif'];
    function exists(url){
      return new Promise(resolve=>{
        const img = new Image();
        img.onload = ()=>resolve(true);
        img.onerror = ()=>resolve(false);
        img.src = url;
      });
    }

    const themeSections = Array.from(document.querySelectorAll('article.theme, section.theme'));
    themeSections.forEach(async section=>{
      const id = section.id;
      if(!id) return;
      for(const ext of exts){
        const url = `img/${id}.${ext}`;
        // try to fetch by image object load
        // eslint-disable-next-line no-await-in-loop
        const ok = await exists(url);
        if(ok){
          const img = document.createElement('img');
          img.className = 'theme-media img-glow';
          img.src = url;
          img.alt = section.querySelector('h2') ? section.querySelector('h2').textContent : id;
          // insert before the h2 (so it shows at top of section)
          const h2 = section.querySelector('h2');
          if(h2) section.insertBefore(img, h2);
          else section.insertBefore(img, section.firstChild);

          // clicking opens the global lightbox
          img.addEventListener('click', ()=>{
            if(window.openLightbox) window.openLightbox(url, img.alt);
          });
          img.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') window.openLightbox(url, img.alt); });
          img.setAttribute('tabindex','0');
          break; // stop after first existing extension
        }
      }
    });
  })();

  // Load gallery images automatically from img/gallery-{index}.{ext}
  (function loadGalleryImages(){
    const exts = ['webp','png','jpg','jpeg','gif'];
    function exists(url){
      return new Promise(resolve=>{
        const img = new Image();
        img.onload = ()=>resolve(true);
        img.onerror = ()=>resolve(false);
        img.src = url;
      });
    }

    const figures = Array.from(document.querySelectorAll('.gallery-item'));
    if(!figures.length) return;

    figures.forEach(async fig=>{
      const idxAttr = fig.getAttribute('data-index');
      const idx = idxAttr ? Number(idxAttr) : null;
      if(idx === null || Number.isNaN(idx)) return;
      for(const ext of exts){
        const url = `img/gallery-${idx}.${ext}`;
        // eslint-disable-next-line no-await-in-loop
        const ok = await exists(url);
        if(ok){
          // remove existing placeholder thumb if present
          const thumbDiv = fig.querySelector('.thumb');
          if(thumbDiv) thumbDiv.remove();
          const img = document.createElement('img');
          img.className = 'gallery-thumb';
          img.src = url;
          img.alt = fig.querySelector('figcaption') ? fig.querySelector('figcaption').textContent : `Gallery ${idx+1}`;
          // insert at top of figure
          fig.insertBefore(img, fig.firstChild);

          // open lightbox when clicked
          img.style.cursor = 'zoom-in';
          img.addEventListener('click', ()=>{ if(window.openLightbox) window.openLightbox(img.src, img.alt); });
          img.setAttribute('tabindex','0');
          // stop after first found
          break;
        }
      }
    });
  })();

  (function enableEditableMiniTitles(){
    const sections = Array.from(document.querySelectorAll('article.theme, section.theme'));
    if(!sections.length) return;

    function saveKey(id){ return `mini-title:${id}`; }

    sections.forEach((section, idx)=>{
      const id = section.id || `section-${idx+1}`;
      let wrap = section.querySelector('.mini-titles');
      let created = false;
      if(!wrap){
        wrap = document.createElement('div');
        wrap.className = 'mini-titles';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mini-title';
        b.setAttribute('aria-label','Bewerk kleine titel');
        // default text; may be overridden below
        b.textContent = `Titel ${idx + 1}`;
        wrap.appendChild(b);
        // insert after H2 if present
        const h2 = section.querySelector('h2');
        if(h2 && h2.parentNode){
          if(h2.nextSibling) h2.parentNode.insertBefore(wrap, h2.nextSibling);
          else h2.parentNode.appendChild(wrap);
        } else {
          section.insertBefore(wrap, section.firstChild);
        }
        created = true;
      }

      const btn = wrap.querySelector('.mini-title');
      if(!btn) return;

      // If the element is not contenteditable, convert it to an editable element
      // We'll use a contenteditable span inside the button for easier editing semantics
      let editable = btn.querySelector('[contenteditable]');
      if(!editable){
        const span = document.createElement('span');
        span.setAttribute('contenteditable','true');
        span.className = 'mini-title-editable';
        // move text into span
        span.textContent = btn.textContent || `Titel ${idx + 1}`;
        // clear button and append span
        btn.textContent = '';
        btn.appendChild(span);
        // make button act as a focus wrapper
        btn.addEventListener('click', ()=>{ span.focus(); });
        // allow Enter to blur (to avoid creating line breaks)
        span.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); span.blur(); } });
        editable = span;
      }

      // Load saved value from localStorage if present
      const saved = localStorage.getItem(saveKey(id));
      if(saved){ editable.textContent = saved; }
      else if(section.dataset.miniTitle){ editable.textContent = section.dataset.miniTitle; }

      // save on blur or after short debounce while typing
      let timer = null;
      function doSave(){
        const text = editable.textContent.trim();
        localStorage.setItem(saveKey(id), text);
      }
      editable.addEventListener('input', ()=>{ if(timer) clearTimeout(timer); timer = setTimeout(doSave, 600); });
      editable.addEventListener('blur', ()=>{ if(timer) clearTimeout(timer); doSave(); });

    });
  })();

})();
