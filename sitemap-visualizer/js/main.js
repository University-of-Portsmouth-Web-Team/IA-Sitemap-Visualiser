/* ===========================================================
   MAIN — wires the UI chrome to the views registered on window.SVZ.views
   =========================================================== */
(function(){
  const TABS = [
    { id: 'outline',    n: '01', label: 'Outline' },
    { id: 'tree',       n: '02', label: 'Tree' },
    { id: 'sunburst',   n: '03', label: 'Sunburst' },
    { id: 'treemap',    n: '04', label: 'Treemap' },
    { id: 'circlepack', n: '05', label: 'Circle pack' },
    { id: 'themes',     n: '06', label: 'Themes' },
    { id: 'graph3d',    n: '07', label: '3D graph' },
    { id: 'city',       n: '08', label: '3D city' }
  ];

  let currentTab = TABS[0].id;
  let inited = new Set();

  function el(html){ const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function buildShell(){
    const tabsEl = document.getElementById('tabs');
    tabsEl.innerHTML = TABS.map(t =>
      '<div class="tab' + (t.id===currentTab?' active':'') + '" data-tab="' + t.id + '">' +
      '<span class="n">' + t.n + '</span>' + t.label + '</div>'
    ).join('');
    tabsEl.addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]');
      if(tab) activateTab(tab.dataset.tab);
    });

    const main = document.getElementById('main');
    main.innerHTML = TABS.map(t => '<div class="view" id="view-' + t.id + '"></div>').join('');
  }

  function updateStats(tree, themeList){
    const flaggedCount = [...tree.byId.values()].filter(n => n.flagged).length;
    document.getElementById('stats').innerHTML =
      '<span>pages <b>' + tree.total + '</b></span>' +
      '<span>top-level sections <b>' + tree.roots.length + '</b></span>' +
      '<span>max depth <b>' + tree.depth + '</b></span>' +
      '<span>themes detected <b>' + themeList.length + '</b></span>' +
      '<span>flagged <b>' + flaggedCount + '</b></span>';
  }

  function activateTab(id, force){
    if(id === currentTab && !force && inited.has(id)){ 
      const v = window.SVZ.views[id];
      if(v && v.activate) v.activate();
      return;
    }
    currentTab = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + id));
    window.SVZ.removeLegend();

    const container = document.getElementById('view-' + id);
    const view = window.SVZ.views[id];
    if(!view) return;
    if(!inited.has(id) || force){
      view.init(container);
      inited.add(id);
    } else if(view.activate){
      view.activate();
    }
    if(view.applySearch) view.applySearch(window.SVZ.state.query);
  }

  function handleData(rows){
    const tree = window.SVZ.buildTree(rows);
    const themeInfo = window.SVZ.detectThemes(tree.byId);
    window.SVZ.state.tree = tree;
    window.SVZ.state.themeList = themeInfo.themeList;
    updateStats(tree, themeInfo.themeList);
    inited = new Set();
    document.querySelectorAll('.view').forEach(v => v.innerHTML = '');
    activateTab(currentTab, true);
  }

  function parseAndLoad(input){
    if(!checkLibs()) return;
    Papa.parse(input, {
      header: true, skipEmptyLines: true, delimiter: '',
      complete: res => {
        if(!res.data.length || !('name' in res.data[0])){
          alert('This file doesn\'t look like a Slickplan sitemap export (expected columns like id, parent_id, name, level...). Loading the sample instead.');
          return loadSample();
        }
        handleData(res.data);
      },
      error: () => alert('Could not parse that CSV.')
    });
  }

  function checkLibs(){
    const missing = [];
    if(typeof Papa === 'undefined') missing.push('PapaParse');
    if(typeof d3 === 'undefined') missing.push('D3');
    if(typeof THREE === 'undefined') missing.push('three.js');
    if(typeof ForceGraph3D === 'undefined') missing.push('3d-force-graph');
    if(missing.length){
      document.getElementById('readout').innerHTML =
        '<span class="path" style="color:var(--signal)">Could not load: ' + missing.join(', ') +
        '. These load from a CDN — check your connection, ad-blocker, or that this isn\'t running fully offline, then reload.</span>';
      return false;
    }
    return true;
  }

  function loadSample(){
    if(!checkLibs()) return;
    fetch('data/sample-sitemap.csv').then(r => r.text()).then(parseAndLoad)
      .catch(() => alert('Could not load the sample file. If you opened index.html directly from disk (file://), run a local server instead — see README — since browsers block local file fetches over file://.'));
  }

  function wireControls(){
    document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', e => {
      if(e.target.files[0]) parseAndLoad(e.target.files[0]);
    });
    document.getElementById('sampleBtn').addEventListener('click', loadSample);

    let debounce;
    document.getElementById('searchbox').addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        window.SVZ.state.query = e.target.value;
        const view = window.SVZ.views[currentTab];
        if(view && view.applySearch) view.applySearch(e.target.value);
      }, 180);
    });

    const flagBtn = document.getElementById('flagToggle');
    flagBtn.classList.toggle('active', window.SVZ.state.showFlags);
    flagBtn.addEventListener('click', () => {
      window.SVZ.state.showFlags = !window.SVZ.state.showFlags;
      flagBtn.classList.toggle('active', window.SVZ.state.showFlags);
      inited = new Set();
      document.querySelectorAll('.view').forEach(v => v.innerHTML = '');
      activateTab(currentTab, true);
    });

    window.addEventListener('resize', () => {
      const v = window.SVZ.views[currentTab];
      if(v && v.resize) v.resize();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildShell();
    wireControls();
    window.SVZ.setReadout(null);
    loadSample();
  });
})();
