(function () {
  'use strict';

  var TOPS = { home: 'tn-home', sobre: 'tn-sobre' };
  var BOTS = { home: 'bn-home', sobre: 'bn-sobre' };
  var SECS = ['home', 'sobre'];

  var hasReader = typeof document !== 'undefined' && !!document.getElementById('sec-reader');

  function show(id) {
    if (SECS.indexOf(id) < 0) return;

    if (hasReader) {
      var r = document.getElementById('sec-reader');
      if (r) r.style.display = 'none';
    }

    SECS.forEach(function (s) {
      var el = document.getElementById('sec-' + s);
      if (el) el.classList.remove('on');
    });
    var target = document.getElementById('sec-' + id);
    if (target) target.classList.add('on');

    SECS.forEach(function (s) {
      var t = document.getElementById(TOPS[s]);
      var b = document.getElementById(BOTS[s]);
      if (t) t.classList.toggle('active', s === id);
      if (b) b.classList.toggle('active', s === id);
    });

    window.scrollTo(0, 0);
  }

  function openSub() {
    var ov = document.getElementById('subOv');
    if (!ov) return;
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      var n = document.getElementById('sNombre');
      if (n) n.focus();
    }, 120);
  }

  function closeSub() {
    var ov = document.getElementById('subOv');
    if (!ov) return;
    ov.classList.remove('open');
    document.body.style.overflow = '';
  }

  function bgClose(e) {
    if (e.target === document.getElementById('subOv')) closeSub();
  }

  function submitSub() {
    var nombreEl = document.getElementById('sNombre');
    var emailEl = document.getElementById('sEmail');
    if (!emailEl) return;
    var nombre = (nombreEl && nombreEl.value) ? nombreEl.value.trim() : '';
    var email = emailEl.value.trim();

    if (!email || email.indexOf('@') < 0) {
      emailEl.classList.add('err');
      emailEl.focus();
      return;
    }
    emailEl.classList.remove('err');

    var f = document.createElement('form');
    f.method = 'POST';
    f.action = 'https://1e22ccbe.sibforms.com/serve/MUIFAImNtjNmHq5LpaK-cn-6fXZj5OMRIVi_N2j6sO7lOgYfku227N7flq9_ysaKRpGIzgIY8btJ3-h4kOQhmC5l9ozewXKT_MEvCEYOwN1TiDHU49xmvpWYfkrX92_-kK8SYfS45ADUH_hwHxFeEND8x42g9boudtaQwXph5CfjEf-XeKGJZS0xPc7pZjPPJn9U_0uFCE_NhFOn';
    f.target = 'sib-frame';
    f.style.display = 'none';
    function addField(n, v) {
      var i = document.createElement('input');
      i.name = n;
      i.value = v;
      f.appendChild(i);
    }
    addField('EMAIL', email);
    addField('email_address_check', '');
    addField('locale', 'es');
    if (nombre) addField('FIRSTNAME', nombre);
    document.body.appendChild(f);
    f.submit();
    document.body.removeChild(f);

    var subForm = document.getElementById('subForm');
    var subOk = document.getElementById('subOk');
    if (subForm) subForm.style.display = 'none';
    if (subOk) subOk.style.display = 'block';
    setTimeout(function () {
      closeSub();
      setTimeout(function () {
        if (subForm) subForm.style.display = 'block';
        if (subOk) subOk.style.display = 'none';
        if (nombreEl) nombreEl.value = '';
        emailEl.value = '';
      }, 400);
    }, 3000);
  }

  function applyHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (h === 'sobre' && document.getElementById('sec-sobre')) show('sobre');
  }

  function onDocClick(e) {
    var navEl = e.target.closest && e.target.closest('[data-nav]');
    if (navEl && navEl.getAttribute('data-nav')) {
      e.preventDefault();
      show(navEl.getAttribute('data-nav'));
      return;
    }
    var subEl = e.target.closest && e.target.closest('[data-open-sub]');
    if (subEl) {
      e.preventDefault();
      openSub();
      return;
    }
    var closeEl = e.target.closest && e.target.closest('[data-close-sub]');
    if (closeEl) {
      e.preventDefault();
      closeSub();
      return;
    }
    var subBtn = e.target.closest && e.target.closest('[data-submit-sub]');
    if (subBtn) {
      e.preventDefault();
      submitSub();
    }
  }

  window.show = show;
  window.openSub = openSub;
  window.closeSub = closeSub;
  window.bgClose = bgClose;
  window.submitSub = submitSub;

  document.addEventListener('DOMContentLoaded', function () {
    document.body.addEventListener('click', onDocClick);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSub();
    });
    var subOv = document.getElementById('subOv');
    if (subOv) subOv.addEventListener('click', bgClose);

    if (!document.getElementById('loginPass')) {
      applyHash();
      window.addEventListener('hashchange', applyHash);
    }
  });
})();
