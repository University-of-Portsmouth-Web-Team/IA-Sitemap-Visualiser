/* View 07 — 3D force graph. Same parent→child edges, laid out by a physics
   simulation in navigable 3D space instead of a fixed layout. Good for large
   sites because nodes spread themselves out rather than overlapping; orbit,
   zoom, and click a node to fly to it and inspect it in the readout bar. */
(function(){
  let Graph, container;

  function buildGraphData(){
    const tree = window.SVZ.state.tree;
    const nodes = [], links = [];
    tree.byId.forEach(n => nodes.push(n));
    tree.byId.forEach(n => { if(n.parentId && tree.byId.has(n.parentId)) links.push({ source: n.parentId, target: n.id }); });
    return { nodes, links };
  }

  function colorFor(n){
    return n.flagged && window.SVZ.state.showFlags ? window.SVZ.FLAG_COLOR
      : window.SVZ.colorForTheme(n.theme, window.SVZ.state.themeList);
  }

  function init(c){
    container = c;
    container.innerHTML = '';
    if(typeof ForceGraph3D === 'undefined'){
      container.innerHTML = '<div class="view-empty">3D engine failed to load from CDN.<br>Check your internet connection and reload.</div>';
      return;
    }
    const hint = document.createElement('div');
    hint.style.cssText = 'position:absolute;top:8px;left:14px;z-index:4;font-family:var(--mono);font-size:10.5px;color:var(--paper-dim);pointer-events:none;';
    hint.textContent = 'drag to orbit · scroll to zoom · click a node to fly to it';
    container.appendChild(hint);

    Graph = ForceGraph3D()(container)
      .backgroundColor('#0B1E33')
      .graphData(buildGraphData())
      .nodeId('id')
      .nodeLabel(n => n.numbering + ' ' + n.name)
      .nodeVal(n => Math.max(1, Math.sqrt(n._count)))
      .nodeColor(colorFor)
      .nodeOpacity(0.92)
      .linkColor(() => 'rgba(150,180,210,0.25)')
      .linkWidth(0.4)
      .linkDirectionalParticles(0)
      .onNodeHover(n => { if(n) window.SVZ.setReadout(n); container.style.cursor = n ? 'pointer' : 'default'; })
      .onNodeClick(n => {
        const dist = 90;
        const ratio = 1 + dist / Math.hypot(n.x||1, n.y||1, n.z||1);
        Graph.cameraPosition({ x: (n.x||0) * ratio, y: (n.y||0) * ratio, z: (n.z||0) * ratio }, n, 900);
        window.SVZ.setReadout(n);
      });

    resize();
    window.SVZ.renderLegend(window.SVZ.state.themeList);
  }

  function resize(){
    if(!Graph || !container) return;
    Graph.width(container.clientWidth || 800).height(container.clientHeight || 600);
  }

  function applySearch(query){
    if(!Graph) return;
    const q = (query||'').trim().toLowerCase();
    Graph.nodeColor(n => {
      if(q && n.name.toLowerCase().includes(q)) return '#ffffff';
      return colorFor(n);
    });
  }

  window.SVZ.views.graph3d = { init, applySearch, resize };
})();
