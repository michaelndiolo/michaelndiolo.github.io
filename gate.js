/* One password for every locked section on the site.
   The detail is stored encrypted (AES-256-GCM, key from PBKDF2-SHA256). It is decrypted
   in the visitor's browser, and the phrase is remembered for the browser tab only. */
(function () {
  var SALT = '3598214d77d838ac23028e921d1ed057';
  var KEY = 'olx';
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.locked[data-src]'));
  if (!blocks.length) return;

  function norm(s) { return s.trim().toLowerCase().replace(/\s+/g, ' '); }
  function sget() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function sset(v) { try { if (v === null) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, v); } catch (e) {} }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }

  var keyP = null, cache = {};
  function deriveKey(pass) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('nocrypto'));
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey'])
      .then(function (km) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unhex(SALT), iterations: 600000, hash: 'SHA-256' },
          km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      });
  }
  function load(src) {
    if (!cache[src]) {
      cache[src] = fetch(src).then(function (r) { if (!r.ok) throw new Error('fetch'); return r.text(); });
    }
    return cache[src];
  }
  function decrypt(key, src) {
    return load(src).then(function (txt) {
      var raw = unb64(txt.trim());
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
    }).then(function (pt) { return new TextDecoder().decode(pt); });
  }

  function fill(el, html) {
    var kind = el.getAttribute('data-kind') || 'html';
    if (kind === 'frame') {
      el.classList.add('open');
      var vhtml = '<div class="viewer on"><div class="vbar"><span>Drag to turn, scroll to zoom, click any part to read about it. Best on a laptop or larger screen.</span>' +
        '<span><button type="button" class="vfs">Full screen</button></span></div>' +
        '<iframe title="OlivAir 3D models" sandbox="allow-scripts"></iframe></div>';
      var teaser = el.querySelector('.lb-quiet, .lb-3d');
      if (teaser) { teaser.outerHTML = vhtml; el.classList.add('inpage'); } else el.innerHTML = vhtml;
      var v = el.querySelector('.viewer'), f = el.querySelector('iframe'), btn = el.querySelector('.vfs');
      var sc = el.getAttribute('data-scene');
      if (sc) html = html.replace('<head>', '<head><script>window.OLSCENE=' + JSON.stringify(sc) + '</script>');
      f.srcdoc = html;
      function inFs() { return v.classList.contains('fs') || document.fullscreenElement === v || document.webkitFullscreenElement === v; }
      function setLabel() { btn.textContent = inFs() ? 'Exit full screen' : 'Full screen'; }
      function enter() {
        var rq = v.requestFullscreen || v.webkitRequestFullscreen;
        if (rq) { try { var r = rq.call(v); if (r && r.catch) r.catch(function () { v.classList.add('fs'); setLabel(); }); } catch (e) { v.classList.add('fs'); } }
        else v.classList.add('fs');
        setLabel();
      }
      function leave() {
        v.classList.remove('fs');
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) { try { ex.call(document); } catch (e) {} }
        setLabel();
      }
      btn.addEventListener('click', function () { if (inFs()) leave(); else enter(); });
      document.addEventListener('fullscreenchange', setLabel);
      document.addEventListener('webkitfullscreenchange', setLabel);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && v.classList.contains('fs')) leave(); });
    } else {
      el.classList.add('open');
      el.innerHTML = html;
      Array.prototype.forEach.call(el.querySelectorAll('.reveal'), function (n) { n.classList.add('in'); });
    }
  }

  function addIndicator() {
    var top = document.querySelector('.top-row');
    if (!top || top.querySelector('.unlocked-tag')) return;
    var s = document.createElement('button');
    s.type = 'button'; s.className = 'unlocked-tag';
    s.innerHTML = '<span class="dot"></span>Detail unlocked &middot; <u>lock</u>';
    s.addEventListener('click', function () { sset(null); location.reload(); });
    top.appendChild(s);
  }

  var busy = false;
  function attempt(raw, silent, ui) {
    var pass = norm(raw);
    if (!pass) { if (ui) ui.err.textContent = 'Please enter the password.'; return; }
    if (busy) return; busy = true;
    if (ui) { ui.btn.disabled = true; ui.btn.textContent = 'Checking...'; ui.err.textContent = ''; }
    deriveKey(pass).then(function (key) {
      return Promise.all(blocks.map(function (b) { return decrypt(key, b.getAttribute('data-src')); }));
    }).then(function (htmls) {
      sset(pass);
      blocks.forEach(function (b, i) { fill(b, htmls[i]); });
      addIndicator();
      document.dispatchEvent(new Event('olx:unlocked'));
    }).catch(function (e) {
      sset(null);
      if (!silent && ui) {
        ui.err.textContent = (e && e.message === 'nocrypto') ? 'This browser cannot unlock the detail. Please try a current Chrome, Safari or Firefox.'
          : (e && e.message === 'fetch') ? 'Could not load the detail. Please try again.'
          : 'That is not the password. Try again, or email me to ask.';
      }
    }).then(function () {
      busy = false;
      if (ui) { ui.btn.disabled = false; ui.btn.textContent = 'Unlock'; }
    });
  }

  blocks.forEach(function (b) {
    var form = b.querySelector('form'); if (!form) return;
    var ui = { err: b.querySelector('.err'), btn: form.querySelector('button'), pw: form.querySelector('input') };
    form.addEventListener('submit', function (e) { e.preventDefault(); attempt(ui.pw.value, false, ui); });
  });

  var s = sget();
  if (s) attempt(s, true, null);
})();
