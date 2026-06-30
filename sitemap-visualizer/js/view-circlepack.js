/* View 05 — Zoomable circle packing. Same hierarchy, packed-circle layout
   instead of angular/rectangular — some inspectors read nesting more easily
   this way, especially for spotting one oversized branch among many small
   ones. Click a circle with children to zoom in, click empty space to zoom out. */
(function(){
  let nodeSel, rootRef;

  function toHierarchyData(node){
    return { name: node.name, node, children: node.children.map(toHierarchyData) };
  }

  function colorFor(d){
    const n = d.data.node;
    if(!n) return 'rgba(255,255,255,0.04)';
    if(d.children) return 'rgba(255,255,255,0.05)'; // structural container, kept quiet
    return n.flagged && window.SVZ.state.showFlags ? window.SVZ.FLAG_COLOR
      : window.SVZ.colorForTheme(n.theme, window.SVZ.state.themeList);
  }

  function init(container){
    container.innerHTML = '';
    const tree = window.SVZ.state.tree;
    const data = { name: 'sitemap', node: null, children: tree.roots.map(toHierarchyData) };

    const size = Math.max(560, Math.min(container.clientWidth, container.clientHeight) - 20);
    const root = d3.pack().size([size, size]).padding(3)(
      d3.hierarchy(data).sum(d => (d.children && d.children.length) ? 0 : 1).sort((a,b) => b.value - a.value)
    );
    rootRef = root;
    let focus = root, view;

    const svg = d3.select(container).append('svg')
      .attr('viewBox', [-size/2, -size/2, size, size])
      .attr('width', '100%').attr('height', '100%')
      .style('cursor', 'pointer');

    const g = svg.append('g');
    const node = g.selectAll('circle').data(root.descendants().slice(1)).join('circle')
      .attr('fill', colorFor)
      .attr('stroke', d => d.children ? '#2C4A6E' : 'none')
      .attr('stroke-width', 1)
      .on('mouseenter', (e,d) => { if(d.data.node) window.SVZ.setReadout(d.data.node); })
      .on('click', (event, d) => { if(d.children && focus !== d){ zoom(event, d); event.stopPropagation(); } });
    nodeSel = node;

    const label = g.append('g').attr('pointer-events', 'none').attr('text-anchor', 'middle')
      .selectAll('text').data(root.descendants().slice(1)).join('text')
        .style('fill', '#E8EEF2').style('font-family', 'var(--mono)')
        .style('font-size', d => Math.min(12, d.r/3) + 'px')
        .style('fill-opacity', d => d.parent === root ? 1 : 0)
        .style('display', d => d.parent === root ? 'inline' : 'none')
        .text(d => d.data.name.length > 16 ? d.data.name.slice(0,14) + '…' : d.data.name);

    svg.on('click', (event) => zoom(event, root));
    zoomTo([root.x, root.y, root.r * 2]);

    function zoomTo(v){
      const k = size / v[2];
      view = v;
      label.attr('transform', d => 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')');
      node.attr('transform', d => 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')');
      node.attr('r', d => d.r * k);
    }

    function zoom(event, d){
      focus = d;
      const t = svg.transition().duration(600).tween('zoom', () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return tt => zoomTo(i(tt));
      });
      label.filter(function(ld){ return ld.parent === focus || this.style.display === 'inline'; })
        .transition(t)
        .style('fill-opacity', ld => ld.parent === focus ? 1 : 0)
        .on('start', function(ld){ if(ld.parent === focus) this.style.display = 'inline'; })
        .on('end', function(ld){ if(ld.parent !== focus) this.style.display = 'none'; });
    }

    window.SVZ.renderLegend(window.SVZ.state.themeList);
  }

  function applySearch(query){
    const q = (query||'').trim().toLowerCase();
    if(!nodeSel) return;
    nodeSel.attr('stroke', d => {
      if(q && d.data.name && d.data.name.toLowerCase().includes(q)) return '#fff';
      return d.children ? '#2C4A6E' : 'none';
    }).attr('stroke-width', d => (q && d.data.name && d.data.name.toLowerCase().includes(q)) ? 2.5 : 1);
  }

  window.SVZ.views.circlepack = { init, applySearch };
})();
