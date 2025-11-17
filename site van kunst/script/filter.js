// Simple client-side filter for the kunstlogboek themes
(function(){
  const input = document.getElementById('theme-search');
  if(!input) return;

  const themes = Array.from(document.querySelectorAll('.theme'));
  const listLinks = Array.from(document.querySelectorAll('#theme-list a'));

  function normalize(s){
    return String(s).toLowerCase();
  }

  input.addEventListener('input', ()=>{
    const q = normalize(input.value.trim());

    themes.forEach(section=>{
      const text = normalize(section.textContent);
      const match = q === '' || text.indexOf(q) !== -1;
      section.style.display = match ? '' : 'none';
    });

    // update nav links visibility
    listLinks.forEach(a=>{
      const targetId = a.getAttribute('href').slice(1);
      const section = document.getElementById(targetId);
      if(!section) return;
      a.style.display = section.style.display === 'none' ? 'none' : '';
    });
  });

  // Enhance navigation links: smooth scroll
  document.querySelectorAll('#theme-list a').forEach(a=>{
    a.addEventListener('click', e=>{
      const href = a.getAttribute('href');
      if(!href || !href.startsWith('#')) return;
      const target = document.getElementById(href.slice(1));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'start'});
        // focus for accessibility
        target.setAttribute('tabindex','-1');
        target.focus();
      }
    });
  });

  // --- Cool effects: reveal-on-scroll, parallax hero, floating headings ---
  const revealNodes = Array.from(document.querySelectorAll('.intro, .theme'));
  const header = document.querySelector('.site-header');
  const heroDecor = document.querySelector('.hero-decor');

  // IntersectionObserver for reveal animations
  if('IntersectionObserver' in window){
    const obs = new IntersectionObserver((entries, o)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('show');
          o.unobserve(entry.target);
        }
      });
    },{threshold:0.12});

    revealNodes.forEach(n=>{
      n.classList.add('reveal');
      obs.observe(n);
    });
  } else {
    // Fallback: show everything
    revealNodes.forEach(n=>n.classList.add('show'));
  }

  // Floating animation for headings (subtle)
  document.querySelectorAll('.theme h2, .intro h2, .site-header h1').forEach((h, i)=>{
    h.classList.add('float');
    // stagger enabling the animation slightly
    setTimeout(()=>h.classList.add('animate'), 300 + (i * 120));
  });

  // Parallax effect and header shadow on scroll (rAF loop)
  let lastY = window.scrollY || 0;
  let ticking = false;

  function onScroll(){
    lastY = window.scrollY || 0;
    if(!ticking){
      window.requestAnimationFrame(()=>{
        // parallax: move hero-decor at slower rate
        if(heroDecor){
          const t = Math.max(0, lastY) * 0.18; // tweak multiplier for strength
          heroDecor.style.transform = `translateY(${t}px) rotate(${(lastY*0.002).toFixed(3)}deg)`;
        }

        // header small shadow after scrolled a bit
        if(header){
          if(lastY > 18) header.classList.add('scrolled'); else header.classList.remove('scrolled');
        }

        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, {passive:true});
  // initial run
  onScroll();

})();
