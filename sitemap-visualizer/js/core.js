/* ===========================================================
   CORE — parsing, tree building, flagging, theme detection.
   Exposes window.SVZ with shared state + helpers used by all views.
   =========================================================== */
(function(){

  const STOPWORDS = new Set(['a','an','the','of','in','on','to','for','and','or','your','our','is','are',
    'at','by','with','from','as','be','this','that','these','those','it','its','you','we','us','about',
    'page','pages','home','site','new','2025','2026','2027']);

  function tokenize(str){
    return (str||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
      .filter(w => w && w.length > 2 && !STOPWORDS.has(w));
  }

  const PALETTE = ['#5B8C9C','#D9A441','#B65C4B','#7E8F5C','#9C6FA8','#4F7CAC','#C98A3B','#6FA98C',
    '#A85C7B','#8C7BA8','#5C9C7E','#C97B5C','#5B7C9C','#9CA84F','#A8849C','#4FA89C',
    '#C9B23B','#7C9CC9','#B87C4F','#6B9CB8'];
  const FLAG_COLOR = '#FF6A39';
  const OTHER_COLOR = '#5C6B7A';

  function colorForTheme(theme, themeList){
    if(theme === 'other') return OTHER_COLOR;
    const i = themeList.indexOf(theme);
    return PALETTE[i % PALETTE.length];
  }

  /* ---------- CSV rows -> tree ---------- */
  function buildTree(rows){
    const byId = new Map();
    rows.forEach(r => {
      const id = (r.id||'').trim();
      if(!id) return;
      byId.set(id, {
        id, parentId: (r.parent_id||'').trim() || null,
        name: (r.name||'(untitled)').trim(),
        level: parseInt(r.level)||1,
        order: parseInt(r.order)||0,
        numbering: (r.numbering||'').trim(),
        pageType: (r.page_type||'').trim(),
        slug: (r.url_slug||'').trim(),
        link: (r.link||'').trim(),
        status: (r.content_status||'').trim(),
        metaTitle: (r.meta_title||'').trim(),
        children: []
      });
    });

    const roots = [];
    byId.forEach(n => {
      if(n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n);
      else roots.push(n);
    });
    byId.forEach(n => n.children.sort((a,b)=>a.order-b.order));
    roots.sort((a,b)=>a.order-b.order);

    // duplicate-slug detection (catches case-only dupes like "Clearing"/"clearing")
    const slugCount = new Map();
    byId.forEach(n => {
      const s = n.slug.toLowerCase();
      if(!s) return;
      slugCount.set(s, (slugCount.get(s)||0)+1);
    });

    byId.forEach(n => {
      const nm = n.name.toLowerCase();
      const flags = {
        isError: /\b(403|404|500)\b|\berror\b/.test(nm),
        isClone: nm.startsWith('clone of') || nm.includes(' clone'),
        isTest: /\btest\b|\bdev\b|trigger|sandbox|\btemp\b|\bdemo\b/.test(nm),
        isDuplicateSlug: !!(n.slug && slugCount.get(n.slug.toLowerCase()) > 1)
      };
      n.flags = flags;
      n.flagged = flags.isError || flags.isClone || flags.isTest || flags.isDuplicateSlug;
    });

    function countDesc(n){
      n._count = 1 + n.children.reduce((s,c)=> s + countDesc(c), 0);
      return n._count;
    }
    roots.forEach(countDesc);

    function maxDepth(n){
      return n.children.length ? 1 + Math.max(...n.children.map(maxDepth)) : 1;
    }
    const depth = roots.length ? Math.max(...roots.map(maxDepth)) : 0;

    return { roots, byId, depth, total: byId.size };
  }

  /* ---------- theme detection (keyword-frequency, explainable) ---------- */
  function detectThemes(byId, topN){
    topN = topN || 20;
    const freq = new Map();
    byId.forEach(n => tokenize(n.name + ' ' + n.slug).forEach(w => freq.set(w, (freq.get(w)||0)+1)));

    const seeds = [...freq.entries()]
      .filter(([,c]) => c >= 3)
      .sort((a,b) => b[1]-a[1])
      .slice(0, topN)
      .map(([w]) => w);
    const rank = new Map(seeds.map((w,i) => [w,i]));

    function bestSeed(text){
      let best = null;
      tokenize(text).forEach(w => {
        if(rank.has(w) && (best===null || rank.get(w) < rank.get(best))) best = w;
      });
      return best;
    }

    byId.forEach(n => {
      let theme = bestSeed(n.name + ' ' + n.slug);
      if(!theme){
        let p = n.parentId;
        while(p && byId.has(p) && !theme){
          const anc = byId.get(p);
          theme = bestSeed(anc.name + ' ' + anc.slug);
          p = anc.parentId;
        }
      }
      n.theme = theme || 'other';
    });

    const present = new Set([...byId.values()].map(n => n.theme));
    const themeList = seeds.filter(s => present.has(s));
    if(present.has('other')) themeList.push('other');
    return { seeds, themeList };
  }

  /* ---------- breadcrumb helper ---------- */
  function pathTo(node, byId){
    const chain = [node];
    let p = node.parentId;
    while(p && byId.has(p)){ chain.unshift(byId.get(p)); p = byId.get(p).parentId; }
    return chain;
  }

  /* ---------- shared global namespace ---------- */
  window.SVZ = {
    tokenize, buildTree, detectThemes, pathTo,
    colorForTheme, FLAG_COLOR, OTHER_COLOR, PALETTE,
    state: { tree: null, themeList: [], showFlags: true, colorMode: 'theme', query: '' },
    views: {},          // each view module registers {init, applySearch} here, keyed by id
    setReadout(node){
      const bar = document.getElementById('readout');
      if(!node){ bar.innerHTML = '<span class="path">Hover or click a node to inspect it</span>'; return; }
      const chain = pathTo(node, window.SVZ.state.tree.byId).map(n=>n.name).join('  ›  ');
      const color = node.flagged ? window.SVZ.FLAG_COLOR : window.SVZ.colorForTheme(node.theme, window.SVZ.state.themeList);
      bar.innerHTML =
        '<span class="dot" style="background:'+color+'"></span>' +
        '<span class="path">' + (node.numbering ? node.numbering + ' ' : '') + chain + '</span>' +
        '<span class="tag">L' + node.level + '</span>' +
        '<span class="tag">' + node._count + ' node' + (node._count===1?'':'s') + ' incl. self</span>' +
        '<span class="tag">' + (node.theme || 'other') + '</span>' +
        (node.flagged ? '<span class="tag flagged">flagged: ' + Object.keys(node.flags).filter(k=>node.flags[k]).join(', ') + '</span>' : '') +
        (node.slug ? '<span class="tag">/' + node.slug + '</span>' : '');
    },
    renderLegend(themeList, container){
      let box = document.getElementById('legend');
      if(!box){
        box = document.createElement('div');
        box.id = 'legend';
        (container || document.getElementById('main')).appendChild(box);
      }
      box.innerHTML = '<div class="title">Theme key</div>' + themeList.map(t =>
        '<div class="item"><span class="dot" style="background:' + window.SVZ.colorForTheme(t, themeList) + '"></span>' + t + '</div>'
      ).join('') + '<div class="item" style="margin-top:6px;"><span class="dot" style="background:' + window.SVZ.FLAG_COLOR + '"></span>flagged (test/clone/error/dupe)</div>';
    },
    removeLegend(){
      const box = document.getElementById('legend');
      if(box) box.remove();
    }
  };
})();
