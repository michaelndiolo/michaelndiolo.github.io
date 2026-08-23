(function(){
  var els = document.querySelectorAll('.reveal');
  els.forEach(function(el, i){ el.style.transitionDelay = (i % 4 * 0.07) + 's'; });
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(function(el){ io.observe(el); });

  var counters = document.querySelectorAll('[data-count]');
  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var target = parseInt(el.getAttribute('data-count'), 10);
      var start = null;
      function step(ts){
        if (!start) start = ts;
        var progress = Math.min((ts - start) / 900, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(function(el){ cio.observe(el); });

  var markStage = document.getElementById('markStage');
  var markSteps = document.querySelectorAll('.mrail-step');
  var markCaptions = document.querySelectorAll('.mc');
  var CYCLE_MS = 3200;
  if (markStage && markSteps.length) {
    var markGhost = markStage.querySelector('.mark-ghost');

    function setFill(el, mode){
      var fill = el.querySelector('.mrail-fill');
      fill.style.transition = 'none';
      if (mode === 'done') {
        fill.style.width = '100%';
      } else if (mode === 'empty') {
        fill.style.width = '0%';
      } else if (mode === 'run') {
        fill.style.width = '0%';
        void fill.offsetWidth;
        fill.style.transition = 'width ' + CYCLE_MS + 'ms linear';
        fill.style.width = '100%';
      }
    }

    function goToStep(step, userInitiated){
      var target = parseInt(step, 10);
      markSteps.forEach(function(b){
        var s = parseInt(b.getAttribute('data-step'), 10);
        b.classList.toggle('active', s === target);
        b.classList.toggle('past', s < target);
        if (s === target) { setFill(b, (userInitiated || !autoplay) ? 'done' : 'run'); }
        else if (s < target) { setFill(b, 'done'); }
        else { setFill(b, 'empty'); }
      });
      markCaptions.forEach(function(c){ c.classList.toggle('active', c.getAttribute('data-step') === step); });
      markStage.setAttribute('data-step', step);
      idx = target;
      if (userInitiated) { autoplay = false; clearInterval(cycle); }
    }
    markSteps.forEach(function(btn){
      btn.addEventListener('click', function(){ goToStep(btn.getAttribute('data-step'), true); });
    });

    var autoplay = true;
    var idx = 0;
    var cycle = setInterval(function(){
      if (!autoplay) return;
      idx = (idx + 1) % markSteps.length;
      goToStep(String(idx), false);
    }, CYCLE_MS);
    goToStep('0', false);

    markStage.addEventListener('mousemove', function(e){
      var r = markStage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      markGhost.style.transform = 'perspective(1000px) rotateX(' + (-y * 10) + 'deg) rotateY(' + (x * 10) + 'deg)';
    });
    markStage.addEventListener('mouseleave', function(){
      markGhost.style.transform = '';
    });
  }

  document.querySelectorAll('.faq-item').forEach(function(item){
    item.querySelector('.faq-q').addEventListener('click', function(){
      var open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(o){ o.classList.remove('open'); });
      if (!open) item.classList.add('open');
    });
  });

  document.querySelectorAll('.magnet').forEach(function(btn){
    btn.addEventListener('mousemove', function(e){
      var r = btn.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width/2) * 0.25;
      var y = (e.clientY - r.top - r.height/2) * 0.4;
      btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });
    btn.addEventListener('mouseleave', function(){ btn.style.transform = 'translate(0,0)'; });
  });

  var figImgs = Array.prototype.slice.call(document.querySelectorAll('.figure-img img'));
  if (figImgs.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<div class="lightbox-close" aria-label="Close">&times;</div>' +
      '<div class="lightbox-nav lightbox-prev" aria-label="Previous">&#8249;</div>' +
      '<img alt="">' +
      '<div class="lightbox-nav lightbox-next" aria-label="Next">&#8250;</div>' +
      '<div class="lightbox-cap"></div>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lightbox-cap');
    var lbPrev = lb.querySelector('.lightbox-prev');
    var lbNext = lb.querySelector('.lightbox-next');
    var current = 0;

    function show(i){
      current = (i + figImgs.length) % figImgs.length;
      var img = figImgs[current];
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = img.alt;
    }
    function openLightbox(i){
      show(i);
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox(){
      lb.classList.remove('open');
      document.body.style.overflow = '';
    }
    figImgs.forEach(function(img, i){
      img.parentElement.addEventListener('click', function(){ openLightbox(i); });
    });
    lbPrev.addEventListener('click', function(e){ e.stopPropagation(); show(current - 1); });
    lbNext.addEventListener('click', function(e){ e.stopPropagation(); show(current + 1); });
    lb.addEventListener('click', function(e){ if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLightbox(); });
    document.addEventListener('keydown', function(e){
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }
})();
