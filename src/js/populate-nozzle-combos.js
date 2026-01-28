(function () {
  function findSelectByKeywords(keywords) {
    keywords = Array.isArray(keywords) ? keywords : [keywords];
    const els = Array.from(document.querySelectorAll('select'));
    for (const el of els) {
      const id = (el.id || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const className = (el.className || '').toLowerCase();
      const text = (el.textContent || '').toLowerCase();
      for (const kw of keywords) {
        const k = kw.toLowerCase();
        if (id.includes(k) || name.includes(k) || aria.includes(k) || className.includes(k) || text.includes(k)) {
          return el;
        }
      }
    }
    return null;
  }

  function findAllComboSelects() {
    const selectors = [
      'select[data-role="combo"]',
      'select[data-role="nozzle-combos"]',
      'select.nozzle-combos',
      'select#combo',
      'select#combo-select',
      'select[name*="combo"]',
      'select[name*="nozzle"]'
    ];
    const found = [];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el && !found.includes(el)) found.push(el);
    }
    if (found.length === 0) {
      const all = Array.from(document.querySelectorAll('select'));
      for (const el of all) {
        const anyOptionLooksLikeCombo = Array.from(el.options).some(o => (o.text || '').includes('+'));
        if (anyOptionLooksLikeCombo) found.push(el);
      }
    }
    return found;
  }

  function extractOptionsText(selectEl) {
    if (!selectEl) return [];
    return Array.from(selectEl.options)
      .map(o => ({ value: o.value, text: o.text }))
      .filter(o => o.value !== '' && o.value !== null && typeof o.value !== 'undefined');
  }

  function buildCombosFromLists(discs, cores) {
    const combos = [];
    for (const d of discs) {
      for (const c of cores) {
        const id = `${d.value}|${c.value}`;
        const label = `${d.text} + ${c.text}`;
        combos.push({
          id,
          disc: d.value,
          core: c.value,
          label
        });
      }
    }
    return combos;
  }

  function populateSelectWithCombos(selectEl, combos) {
    if (!selectEl) return;
    const placeholder = Array.from(selectEl.options).find(o => o.value === '' || o.disabled);
    selectEl.innerHTML = '';
    if (placeholder) {
      selectEl.appendChild(placeholder);
    } else {
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '-- Select nozzle combination --';
      ph.disabled = true;
      ph.selected = true;
      selectEl.appendChild(ph);
    }
    for (const combo of combos) {
      const opt = document.createElement('option');
      opt.value = combo.id;
      opt.textContent = combo.label;
      opt.dataset.disc = combo.disc;
      opt.dataset.core = combo.core;
      selectEl.appendChild(opt);
    }
  }

  async function tryFetchJson(path) {
    try {
      const resp = await fetch(path, { cache: 'no-cache' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return await resp.json();
    } catch (e) {
      return null;
    }
  }

  async function init() {
    const comboSelects = findAllComboSelects();
    const discSelect = findSelectByKeywords(['disc', 'discs', 'teejet-disc', 'disk']);
    const coreSelect = findSelectByKeywords(['core', 'cores', 'teejet-core', 'core-nozzle']);

    const jsonPathsToTry = [
      '/data/nozzle-combinations.json',
      'data/nozzle-combinations.json',
      './data/nozzle-combinations.json'
    ];

    let combosFromJson = null;
    for (const p of jsonPathsToTry) {
      combosFromJson = await tryFetchJson(p);
      if (combosFromJson && Array.isArray(combosFromJson) && combosFromJson.length) {
        break;
      }
    }

    let combos = [];
    if (combosFromJson) {
      combos = combosFromJson.map(c => ({
        id: c.id || `${c.disc}|${c.core}`,
        disc: c.disc,
        core: c.core,
        label: c.label || `${c.disc} + ${c.core}`
      }));
    } else if (discSelect && coreSelect) {
      const discs = extractOptionsText(discSelect);
      const cores = extractOptionsText(coreSelect);
      combos = buildCombosFromLists(discs, cores);
    } else {
      console.warn('No data/nozzle-combinations.json found and could not detect disc/core selects. Aborting combos population.');
      return;
    }

    if (comboSelects.length === 0) {
      const fallback = document.querySelector('select');
      if (fallback) comboSelects.push(fallback);
    }

    for (const sel of comboSelects) {
      populateSelectWithCombos(sel, combos);
    }

    if (comboSelects[0]) {
      const evt = new Event('change', { bubbles: true });
      comboSelects[0].dispatchEvent(evt);
    }

    console.info('Nozzle combos populated:', combos.length);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
