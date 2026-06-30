/* View 02 — Collapsible tree. Classic node-link tidy tree (Bostock pattern).
   Starts with every top-level section visible but collapsed, so 1000+ pages
   render as ~100 rows until an inspector chooses to drill in. */
(function(){
  let svg, gLinks, gNodes, root, dx = 24, dy = 170, idCounter = 0;

  function collapse(d){
    if(d.children){
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  function diagonal(s, t){
    return 'M' + s.y + ',' + s.x +
      'C' + (s.y+t.y)/2 + ',' + s.x +
      ' ' + (s.y+t.y)/2 + ',' + t.x +
      ' ' + t.y + ',' + t.x;
  }

  function color(d){
    const n = d.data.node;
    if(!n) return '#3A5C7E';
    return n.flagged && window.SVZ.state.showFlags ? window.SVZ.FLAG_COLOR
      : window.SVZ.colorForTheme(n.theme, window.SVZ.state.themeList);
  }

  function update(source){
    const treeLayout = d3.tree().nodeSize([dx, dy]);
    treeLayout(root);

    const nodes = root.descendants();
    const links = root.links();

    let left = root, right = root;
    root.eachBefore(n => { if(n.x < left.x) left = n; if(n.x > right.x) right = n; });
    const height = right.x - left.x + dx * 3;
    const width = (root.height + 2) * dy + 240;

    svg.attr('width', width).attr('height', height)
      .attr('viewBox', [-dy/2, left.x - dx*1.5, width, height]);

    const node = gNodes.selectAll('g.node').data(nodes, d => d.id || (d.id = ++idCounter));

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => 'translate(' + (source.y0||0) + ',' + (source.x0||0) + ')')
      .style('cursor', d => (d._children || d.children) ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if(d._children){ d.children = d._children; d._children = null; }
        else if(d.children){ d._children = d.children; d.children = null; }
        update(d);
      })
      .on('mouseenter', (event, d) => { if(d.data.node) window.SVZ.setReadout(d.data.node); });

    nodeEnter.append('circle')
      .attr('r', 5.5)
      .attr('fill', color)
      .attr('stroke', d => d.data.node && d.data.node.flagged ? window.SVZ.FLAG_COLOR : 'none')
      .attr('stroke-width', 2);

    nodeEnter.append('text')
      .attr('dy', '0.32em')
      .attr('x', d => d._children || d.children ? -10 : 10)
      .attr('text-anchor', d => d._children || d.children ? 'end' : 'start')
      .attr('fill', d => d.data.match ? window.SVZ.FLAG_COLOR : '#E8EEF2')
      .style('font-family', 'var(--mono)')
      .style('font-size', '11px')
      .text(d => d.data.name + (d._children ? '  (' + d._children.length + ')' : ''));

    const nodeMerge = node.merge(nodeEnter);
    nodeMerge.transition().duration(220)
      .attr('transform', d => 'translate(' + d.y + ',' + d.x + ')');
    nodeMerge.select('circle').attr('fill', color)
      .attr('stroke', d => d.data.node && d.data.node.flagged ? window.SVZ.FLAG_COLOR : 'none');
    nodeMerge.select('text')
      .attr('x', d => d._children || d.children ? -10 : 10)
      .attr('text-anchor', d => d._children || d.children ? 'end' : 'start')
      .attr('fill', d => d.data.match ? window.SVZ.FLAG_COLOR : '#E8EEF2')
      .text(d => d.data.name + (d._children ? '  (' + d._children.length + ')' : ''));

    node.exit().transition().duration(150)
      .attr('transform', d => 'translate(' + source.y + ',' + source.x + ')')
      .remove();

    const link = gLinks.selectAll('path.link').data(links, d => d.target.id);
    const linkEnter = link.enter().append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#2C4A6E')
      .attr('stroke-width', 1.3)
      .attr('d', d => { const o = {x: source.x0||0, y: source.y0||0}; return diagonal(o, o); });

    link.merge(linkEnter).transition().duration(220)
      .attr('d', d => diagonal(d.source, d.target));

    link.exit().transition().duration(150)
      .attr('d', d => { const o = {x: source.x, y: source.y}; return diagonal(o, o); })
      .remove();

    root.eachBefore(d => { d.x0 = d.x; d.y0 = d.y; });
  }

  function toHierarchyData(node){
    return { name: node.name, node, children: node.children.map(toHierarchyData) };
  }

  function init(container){
    container.innerHTML = '<div style="padding:10px 24px;color:var(--paper-dim);font-family:var(--mono);font-size:11px;">' +
      'Click a node to expand / collapse. Hover for detail in the readout bar below.</div>';
    const tree = window.SVZ.state.tree;

    const synthetic = { name: 'sitemap', node: null, children: tree.roots.map(toHierarchyData) };
    root = d3.hierarchy(synthetic);
    root.x0 = 0; root.y0 = 0;
    root.children.forEach(collapse); // each top-level section starts collapsed

    svg = d3.select(container).append('svg');
    gLinks = svg.append('g').attr('fill', 'none');
    gNodes = svg.append('g');

    update(root);
  }

  function applySearch(query){
    const q = (query||'').trim().toLowerCase();
    root.each(d => { d.data.match = false; });
    if(q){
      root.each(d => {
        if(d.data.name && d.data.name.toLowerCase().includes(q)){
          d.data.match = true;
          let p = d.parent;
          while(p){
            if(p._children){ p.children = p._children; p._children = null; }
            p = p.parent;
          }
        }
      });
    }
    update(root);
  }

  window.SVZ.views.tree = { init, applySearch };
})();
