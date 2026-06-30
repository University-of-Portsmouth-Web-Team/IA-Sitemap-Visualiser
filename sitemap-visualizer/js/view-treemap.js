/* View 04 — Drill-down treemap. Tile area = number of pages in that branch,
   so bloated sections are visible immediately without scrolling. Shows two
   levels at a time (a section and its children); click a tile to drill in,
   use the breadcrumb to climb back out. */
(function(){
  let focusNode, container, breadcrumbStack;

  function limitedClone(node, maxDepth, depth){
    const showChildren = depth < maxDepth && node.children.length;
    return {
      _orig: node,
      name: node.name,
      children: showChildren ? node.children.map(c => limitedClone(c, maxDepth, depth+1)) : []
    };
  }

  function colorFor(orig){
    if(!orig) return '#3A5C7E';
    return orig.flagged && window.SVZ.state.showFlags ? window.SVZ.FLAG_COLOR
      : window.SVZ.colorForTheme(orig.theme, window.SVZ.state.themeList);
  }

  function render(){
    container.innerHTML = '';
    const crumb = document.createElement('div');
    crumb.style = 'padding:10px 18px;font-family:var(--mono);font-size:11px;color:var(--paper-dim);border-bottom:1px solid var(--line);';
    crumb.innerHTML = breadcrumbStack.map((n,i) =>
      '<span data-jump="' + i + '" style="cursor:pointer;' + (i===breadcrumbStack.length-1?'color:var(--signal)':'') + '">' +
      (n._origNode ? n._origNode.name : 'all sections') + '</span>'
    ).join('  <span style="color:var(--line)">/</span>  ') +
    '<span style="float:right;color:var(--paper-dim)">click a tile to drill in · click a crumb to go back</span>';
    crumb.addEventListener('click', e => {
      const j = e.target.closest('[data-jump]');
      if(j){
        const idx = +j.dataset.jump;
        breadcrumbStack = breadcrumbStack.slice(0, idx+1);
        focusNode = breadcrumbStack[breadcrumbStack.length-1]._origNode || { name:'sitemap', children: window.SVZ.state.tree.roots, _count: window.SVZ.state.tree.total };
        render();
      }
    });
    container.appendChild(crumb);

    const svgHolder = document.createElement('div');
    svgHolder.style.cssText = 'position:absolute;inset:38px 0 0 0;';
    container.appendChild(svgHolder);

    const w = container.clientWidth || 900, h = (container.clientHeight || 600) - 38;
    const clone = limitedClone(focusNode, 2, 0);
    const root = d3.hierarchy(clone).sum(d => {
      if(d.children && d.children.length) return 0;
      return (d._orig.children && d._orig.children.length) ? d._orig._count : 1;
    });
    d3.treemap().size([w, h]).paddingOuter(3).paddingTop(d => d.depth === 1 ? 18 : 3).paddingInner(2).round(true)(root);

    const svg = d3.select(svgHolder).append('svg').attr('width', w).attr('height', h);
    const nodes = root.descendants().filter(d => d.depth > 0);

    const cell = svg.selectAll('g').data(nodes).join('g')
      .attr('transform', d => 'translate(' + d.x0 + ',' + d.y0 + ')');

    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => colorFor(d.data._orig))
      .attr('fill-opacity', d => d.depth === 1 ? 0.35 : 0.9)
      .attr('stroke', '#0B1E33')
      .attr('stroke-width', 1.5)
      .style('cursor', d => d.data._orig.children.length ? 'pointer' : 'default');

    cell.append('text')
      .attr('x', 5).attr('y', d => d.depth === 1 ? 13 : 14)
      .style('font-family', 'var(--mono)')
      .style('font-size', d => d.depth === 1 ? '11px' : '10px')
      .style('fill', '#E8EEF2')
      .style('pointer-events', 'none')
      .text(d => {
        const w_ = d.x1 - d.x0;
        const label = d.data.name + (d.data._orig.children.length ? ' (' + d.data._orig._count + ')' : '');
        const maxChars = Math.floor(w_ / 6.2);
        return label.length > maxChars ? label.slice(0, Math.max(0,maxChars-1)) + '…' : label;
      });

    cell.on('mouseenter', (e,d) => window.SVZ.setReadout(d.data._orig));
    cell.on('click', (e,d) => {
      if(d.data._orig.children.length){
        focusNode = d.data._orig;
        breadcrumbStack.push({ _origNode: focusNode });
        render();
      }
    });

    window.SVZ.renderLegend(window.SVZ.state.themeList);
  }

  function init(c){
    container = c;
    container.style.position = 'relative';
    const tree = window.SVZ.state.tree;
    focusNode = { name: 'sitemap', children: tree.roots, _count: tree.total };
    breadcrumbStack = [{ _origNode: null }];
    render();
  }

  function applySearch(){ /* treemap relies on visual drill-down rather than search-highlight */ }

  window.SVZ.views.treemap = { init, applySearch };
})();
