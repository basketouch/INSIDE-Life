(function () {
  'use strict';

  var PAGE_SIZE = 6;
  var JSON_URL = '/ediciones.json';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function formatEdicionNum(n) {
    var x = Number(n);
    if (!isFinite(x) || x < 1) return String(n);
    if (x < 1000) return ('00' + Math.floor(x)).slice(-3);
    return String(Math.floor(x));
  }

  function labelEdicion(item) {
    return 'Edición #' + formatEdicionNum(item.num);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== '') n.textContent = text;
    return n;
  }

  function parseISODateLocal(iso) {
    if (!iso || typeof iso !== 'string') return null;
    var p = iso.split('-');
    if (p.length !== 3) return null;
    var y = parseInt(p[0], 10);
    var m = parseInt(p[1], 10);
    var d = parseInt(p[2], 10);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function toISODateLocal(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function fechaLarga(item) {
    if (item.fechaTexto) return item.fechaTexto;
    var d = parseISODateLocal(item.fecha);
    if (!d || isNaN(d.getTime())) return item.fecha || '';
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function diaSemanaLabel(item) {
    var d = parseISODateLocal(item.fecha);
    if (!d || isNaN(d.getTime())) return '';
    return DIAS[d.getDay()];
  }

  function generarProximas(meta) {
    var g = meta && meta.proximasGeneradas;
    if (!g || !g.desdeFecha || !g.hastaFecha || typeof g.desdeNum !== 'number') return [];
    var out = [];
    var d = parseISODateLocal(g.desdeFecha);
    var lim = parseISODateLocal(g.hastaFecha);
    var num = g.desdeNum;
    if (!d || !lim) return [];
    while (d <= lim) {
      out.push({
        num: num,
        fecha: toISODateLocal(d),
        proxima: true,
        titulo: 'Próximamente'
      });
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      num++;
    }
    return out;
  }

  function newsletterFetchUrl(href) {
    if (!href || typeof href !== 'string') return '';
    var h = href.trim().split('#')[0].replace(/\/+$/, '') || '/';
    if (h === '/newsletter' || h.endsWith('/newsletter')) return '/newsletter';
    if (h === '/newsletter.html' || h.endsWith('/newsletter.html')) return '/newsletter';
    return '';
  }

  function tituloDesdeHeroNewsletter(html) {
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var h1 = doc.querySelector('h1.nl-h1');
      if (!h1) return '';
      var t = (h1.innerText || h1.textContent || '').replace(/\s+/g, ' ').trim();
      return t;
    } catch (e) {
      return '';
    }
  }

  function enrichTituloDesdeNewsletterEnVivo(list) {
    var targets = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].proxima || !list[i].href) continue;
      if (newsletterFetchUrl(list[i].href)) targets.push(list[i]);
    }
    if (!targets.length) return Promise.resolve();
    return fetch('/newsletter', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('newsletter');
        return r.text();
      })
      .then(function (html) {
        var titulo = tituloDesdeHeroNewsletter(html);
        if (!titulo) return;
        targets.forEach(function (item) {
          item.titulo = titulo;
        });
      })
      .catch(function () {});
  }

  function sortEdiciones(list) {
    var pasadas = [];
    var proximas = [];
    list.forEach(function (x) {
      if (x.proxima) proximas.push(x);
      else pasadas.push(x);
    });
    pasadas.sort(function (a, b) {
      return new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime();
    });
    proximas.sort(function (a, b) {
      return new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime();
    });
    return pasadas.concat(proximas);
  }

  function appendTags(parent, tags) {
    if (!tags || !tags.length) return;
    var wrap = el('div', 'card-tags');
    tags.forEach(function (t) {
      wrap.appendChild(el('span', 'card-tag', t));
    });
    parent.appendChild(wrap);
  }

  function buildFootDate(item, withArrow, emailHint) {
    var foot = el('div', 'card-foot');
    var left = el('div', 'card-foot-date');
    left.appendChild(el('span', 'card-dow', diaSemanaLabel(item)));
    left.appendChild(el('span', 'card-day', fechaLarga(item)));
    foot.appendChild(left);
    if (withArrow) foot.appendChild(el('span', 'card-arrow', '→'));
    if (emailHint) foot.appendChild(el('span', 'card-email-hint', 'Email'));
    return foot;
  }

  function buildCardLink(item) {
    var a = el('a', 'card');
    a.href = item.href;
    a.appendChild(el('div', 'card-num', labelEdicion(item)));
    a.appendChild(el('div', 'card-title', item.titulo));
    appendTags(a, item.tags);
    a.appendChild(buildFootDate(item, true, false));
    return a;
  }

  function buildCardEmail(item) {
    var d = el('div', 'card card--email');
    d.setAttribute('title', 'Enviada por email; la web muestra la edición más reciente.');
    d.appendChild(el('div', 'card-num', labelEdicion(item)));
    d.appendChild(el('div', 'card-title', item.titulo));
    appendTags(d, item.tags);
    d.appendChild(buildFootDate(item, false, true));
    return d;
  }

  function buildCardProxima(item) {
    var d = el('div', 'card dim');
    d.appendChild(el('div', 'card-num', labelEdicion(item)));
    d.appendChild(el('div', 'card-title', item.titulo || 'Próximamente'));
    d.appendChild(buildFootDate(item, false, false));
    return d;
  }

  function renderItem(item) {
    if (item.proxima) return buildCardProxima(item);
    if (item.href) return buildCardLink(item);
    return buildCardEmail(item);
  }

  function showError(container, loadBtn) {
    container.textContent = '';
    var p = el('p', 'archivo-fallback');
    p.textContent = 'No se pudo cargar el listado. Recarga la página o vuelve más tarde.';
    container.appendChild(p);
    container.setAttribute('aria-busy', 'false');
    if (loadBtn) loadBtn.hidden = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('archivoCards');
    var loadBtn = document.getElementById('archivoLoadMore');
    if (!container) return;

    var sorted = [];
    var offset = 0;

    function appendBatch() {
      var chunk = sorted.slice(offset, offset + PAGE_SIZE);
      chunk.forEach(function (item) {
        container.appendChild(renderItem(item));
      });
      offset += chunk.length;
      if (loadBtn) loadBtn.hidden = offset >= sorted.length;
    }

    fetch(JSON_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('fetch');
        return r.json();
      })
      .then(function (data) {
        var raw = (data && data.ediciones) ? data.ediciones.slice() : [];
        var gen = generarProximas(data.meta);
        sorted = sortEdiciones(raw.concat(gen));
        return enrichTituloDesdeNewsletterEnVivo(sorted);
      })
      .then(function () {
        offset = 0;
        container.textContent = '';
        if (!sorted.length) {
          container.appendChild(el('p', null, 'No hay ediciones en el archivo todavía.'));
          if (loadBtn) loadBtn.hidden = true;
          container.setAttribute('aria-busy', 'false');
          return;
        }
        appendBatch();
        container.setAttribute('aria-busy', 'false');
        if (loadBtn) {
          loadBtn.addEventListener('click', appendBatch);
        }
      })
      .catch(function () {
        showError(container, loadBtn);
      });
  });
})();
