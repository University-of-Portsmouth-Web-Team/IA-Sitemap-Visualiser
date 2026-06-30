/* View 03 — Zoomable sunburst. Depth = ring distance from centre, so the
   7-level-deep branches of this site are visible at a glance. Click an arc
   to zoom in, click the centre to zoom back out. Arc colour = theme (or
   flag colour when "show flags" is on). */
(function(){
  let rootRef, pathSel;

  function toHierarchyData(node){
    return { name: node.name, node, children: node.children.map(toHierarchyData) };
  }

  function colorFor(d){
    const n = d.data.node;
    if(!n) return '#3A5C7E';
    return n.flagged && window.SVZ.state.showFlags ? window.SVZ.FLAG_COLOR
      : window.SVZ.colorForTheme(n.theme, window.SVZ.state.themeList);
  }

  function init(container){
    container.innerHTML = '';
    const tree = window.SVZ.state.tree;
    const data = { name: 'sitemap', node: null, children: tree.roots.map(toHierarchyData) };
    const root = d3.hierarchy(data).sum(d => (d.children && d.children.length) ? 0 : 1);
    d3.partition().size([2 * Math.PI, root.height + 1])(root);
    root.each(d => d.current = d);
    rootRef = root;

    const size = Math.max(560, Math.min(container.clientWidth, container.clientHeight) - 20);
    const radius = size / (root.height + 1) / 2;

    const arc = d3.arc()
      .startAngle(d => d.x0).endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.002))
      .padRadius(radius * 1.5)
      .innerRadius(d => d.y0 * radius)
      .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const svg = d3.select(container).append('svg')
      .attr('width', '100%').attr('height', '100%')
      .attr('viewBox', [-size/2, -size/2, size, size])
      .style('font', '10px var(--mono)');

    const g = svg.append('g');

    const path = g.selectAll('path').data(root.descendants().slice(1)).join('path')
      .attr('fill', colorFor)
      .attr('fill-opacity', d => arcVisible(d.current) ? (d.data.match===false ? 0.25 : 1) : 0)
      .attr('stroke', d => d.data.match ? '#fff' : 'none')
      .attr('stroke-width', d => d.data.match ? 2 : 0)
      .attr('pointer-events', d => arcVisible(d.current) ? 'auto' : 'none')
      .attr('d', d => arc(d.current));
    pathSel = path;

    path.filter(d => d.children).style('cursor', 'pointer').on('click', clicked);
    path.on('mouseenter', (e,d) => { if(d.data.node) window.SVZ.setReadout(d.data.node); });

    const label = g.append('g').attr('pointer-events', 'none').attr('text-anchor', 'middle')
      .selectAll('text').data(root.descendants().slice(1)).join('text')
        .attr('dy', '0.32em')
        .attr('fill-opacity', d => +labelVisible(d.current))
        .attr('transform', d => labelTransform(d.current, radius))
        .attr('fill', '#E8EEF2')
        .text(d => d.data.name.length > 16 ? d.data.name.slice(0,14) + '…' : d.data.name);

    const parentCircle = g.append('circle')
      .datum(root).attr('r', radius).attr('fill', 'none').attr('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('click', clicked);

    function clicked(event, p){
      parentCircle.datum(p.parent || root);
      root.each(d => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      });
      const t = g.transition().duration(500);
      path.transition(t)
        .tween('data', d => { const i = d3.interpolate(d.current, d.target); return tt => d.current = i(tt); })
        .filter(function(d){ return +this.getAttribute('fill-opacity') || arcVisible(d.target); })
        .attr('fill-opacity', d => arcVisible(d.target) ? 1 : 0)
        .attr('pointer-events', d => arcVisible(d.target) ? 'auto' : 'none')
        .attrTween('d', d => () => arc(d.current));
      label.filter(function(d){ return +this.getAttribute('fill-opacity') || labelVisible(d.target); })
        .transition(t)
        .attr('fill-opacity', d => +labelVisible(d.target))
        .attrTween('transform', d => () => labelTransform(d.current, radius));
    }

    function arcVisible(d){ return d.y1 <= 4 && d.y0 >= 0 && d.x1 > d.x0; }
    function labelVisible(d){ return d.y1 <= 4 && d.y0 >= 0 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.035; }
    function labelTransform(d, radius){
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return 'rotate(' + (x - 90) + ') translate(' + y + ',0) rotate(' + (x < 180 ? 0 : 180) + ')';
    }

    window.SVZ.renderLegend(window.SVZ.state.themeList);
  }

  function applySearch(query){
    const q = (query||'').trim().toLowerCase();
    if(!rootRef) return;
    rootRef.each(d => { d.data.match = q ? (d.data.name && d.data.name.toLowerCase().includes(q)) : undefined; });
    if(pathSel){
      pathSel.attr('stroke', d => d.data.match ? '#fff' : 'none')
        .attr('stroke-width', d => d.data.match ? 2 : 0)
        .attr('fill-opacity', d => q ? (d.data.match ? 1 : 0.2) : 1);
    }
  }

  window.SVZ.views.sunburst = { init, applySearch };
})();
