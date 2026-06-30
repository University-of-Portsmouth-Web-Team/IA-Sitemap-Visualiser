/* View 06 — Theme clusters. Same pages, regrouped by keyword-detected topic
   instead of by current navigation structure. Compare this against the
   Outline/Tree views: if a topic's pages are scattered across many bubbles
   here while sitting in one IA branch there (or vice versa), that's a signal
   worth discussing in an IA redesign. Hover a page to see its *current*
   breadcrumb in the readout bar below — that's the direct A/B comparison. */
(function(){
  function init(container){
    container.innerHTML = '';
    const tree = window.SVZ.state.tree;
    const themeList = window.SVZ.state.themeList;

    const groups = themeList.map(t => ({ name: t, children: [] }));
    const byTheme = new Map(groups.map(g => [g.name, g]));
    tree.byId.forEach(n => { const g = byTheme.get(n.theme) || byTheme.get('other'); if(g) g.children.push({ name: n.name, node: n }); });

    const data = { name: 'themes', children: groups.filter(g => g.children.length) };
    const size = Math.max(560, Math.min(container.clientWidth, container.clientHeight) - 20);
    const root = d3.pack().size([size, size]).padding(d => d.depth === 1 ? 6 : 1.4)(
      d3.hierarchy(data).sum(() => 1).sort((a,b) => b.value - a.value)
    );

    const svg = d3.select(container).append('svg')
      .attr('viewBox', [0, 0, size, size]).attr('width', '100%').attr('height', '100%');

    const g = svg.append('g');
    g.selectAll('circle.theme-bg').data(root.descendants().filter(d => d.depth === 1)).join('circle')
      .attr('class', 'theme-bg')
      .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r)
      .attr('fill', d => window.SVZ.colorForTheme(d.data.name, themeList))
      .attr('fill-opacity', 0.14)
      .attr('stroke', d => window.SVZ.colorForTheme(d.data.name, themeList))
      .attr('stroke-opacity', 0.5);

    g.selectAll('text.theme-label').data(root.descendants().filter(d => d.depth === 1)).join('text')
      .attr('class', 'theme-label')
      .attr('x', d => d.x).attr('y', d => d.y - d.r + 13)
      .attr('text-anchor', 'middle')
      .style('font-family', 'var(--mono)').style('font-size', '11px').style('letter-spacing', '.04em')
      .style('fill', d => window.SVZ.colorForTheme(d.data.name, themeList))
      .text(d => d.data.name.toUpperCase() + '  (' + d.children.length + ')');

    g.selectAll('circle.leaf').data(root.descendants().filter(d => d.depth === 2)).join('circle')
      .attr('class', 'leaf')
      .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r)
      .attr('fill', d => d.data.node.flagged && window.SVZ.state.showFlags ? window.SVZ.FLAG_COLOR : window.SVZ.colorForTheme(d.data.node.theme, themeList))
      .attr('fill-opacity', 0.9)
      .on('mouseenter', (e,d) => window.SVZ.setReadout(d.data.node));

    window.SVZ.renderLegend(themeList);
  }

  function applySearch(query){
    const q = (query||'').trim().toLowerCase();
    d3.selectAll('#view-themes circle.leaf')
      .attr('stroke', d => (q && d.data.name.toLowerCase().includes(q)) ? '#fff' : 'none')
      .attr('stroke-width', d => (q && d.data.name.toLowerCase().includes(q)) ? 2 : 0);
  }

  window.SVZ.views.themes = { init, applySearch };
})();
