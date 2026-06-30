/* View 01 — Outline. The plain indented list, but collapsible and searchable
   so it stays usable past a few hundred rows. This is the "ground truth"
   view every other visualisation is checked against. */
(function(){

  function rowHTML(node, themeList){
    const color = node.flagged ? window.SVZ.FLAG_COLOR : window.SVZ.colorForTheme(node.theme, themeList);
    const hasKids = node.children.length > 0;
    return (
      '<div class="node-row" data-id="' + node.id + '">' +
        '<span class="toggle" data-toggle="' + node.id + '">' + (hasKids ? '▾' : '·') + '</span>' +
        '<span class="dot" style="background:' + color + '"></span>' +
        '<span class="name" data-name="' + node.id + '">' + escapeHtml(node.name) + '</span>' +
        '<span class="meta">' + (node.numbering || '') + (node.slug ? '  /' + node.slug : '') + (hasKids ? '  (' + (node._count-1) + ')' : '') + '</span>' +
      '</div>'
    );
  }

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderNode(node, themeList){
    const wrap = document.createElement('div');
    wrap.innerHTML = rowHTML(node, themeList);
    const rowEl = wrap.firstElementChild;
    const container = document.createElement('div');
    container.appendChild(rowEl);
    if(node.children.length){
      const childWrap = document.createElement('div');
      childWrap.className = 'children-wrap';
      childWrap.style.marginLeft = '18px';
      node.children.forEach(c => childWrap.appendChild(renderNode(c, themeList)));
      container.appendChild(childWrap);
    }
    return container;
  }

  function init(container){
    const tree = window.SVZ.state.tree;
    const themeList = window.SVZ.state.themeList;
    container.innerHTML = '';
    const root = document.createElement('div');
    tree.roots.forEach(n => root.appendChild(renderNode(n, themeList)));
    container.appendChild(root);

    container.addEventListener('click', e => {
      const t = e.target.closest('[data-toggle]');
      if(t){
        const row = t.closest('.node-row');
        const wrap = row.nextElementSibling;
        if(wrap && wrap.classList.contains('children-wrap')){
          const collapsed = wrap.classList.toggle('collapsed');
          t.textContent = collapsed ? '▸' : '▾';
        }
        return;
      }
      const nameEl = e.target.closest('[data-name]');
      if(nameEl){
        const node = tree.byId.get(nameEl.dataset.name);
        window.SVZ.setReadout(node);
      }
    });
  }

  function applySearch(query){
    const rows = document.querySelectorAll('#view-outline .node-row');
    const q = (query||'').trim().toLowerCase();
    rows.forEach(row => {
      const nameEl = row.querySelector('.name');
      const hay = nameEl.textContent.toLowerCase();
      const match = q && hay.includes(q);
      nameEl.classList.toggle('match', match);
      if(match){
        // expand ancestors so the match is visible
        let p = row.closest('.children-wrap');
        while(p){
          p.classList.remove('collapsed');
          const toggle = p.previousElementSibling && p.previousElementSibling.querySelector('[data-toggle]');
          if(toggle) toggle.textContent = '▾';
          p = p.parentElement.closest('.children-wrap');
        }
      }
    });
  }

  window.SVZ.views.outline = { init, applySearch };
})();
