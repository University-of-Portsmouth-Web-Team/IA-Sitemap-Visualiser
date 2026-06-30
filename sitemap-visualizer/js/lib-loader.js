/* ===========================================================
   LIB LOADER — loads each CDN dependency with a fallback mirror.
   If jsdelivr fails for one resource (the reported "3d-force-graph
   wouldn't load" case), this retries via unpkg before giving up,
   and only THEN starts the app's own scripts.
   =========================================================== */
(function(){
  function loadOne(srcs, i){
    return new Promise(resolve => {
      if(i >= srcs.length){ resolve(false); return; }
      const s = document.createElement('script');
      s.src = srcs[i];
      s.onload = () => resolve(true);
      s.onerror = () => { s.remove(); resolve(loadOne(srcs, i+1)); };
      document.head.appendChild(s);
    });
  }

  function loadApp(){
    const appScripts = [
      'js/core.js', 'js/view-outline.js', 'js/view-tree.js', 'js/view-sunburst.js',
      'js/view-treemap.js', 'js/view-circlepack.js', 'js/view-themes.js',
      'js/view-graph3d.js', 'js/view-city.js', 'js/main.js'
    ];
    let p = Promise.resolve();
    appScripts.forEach(src => { p = p.then(() => loadOne([src], 0)); });
  }

  const PAPA = ['https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js', 'https://unpkg.com/papaparse@5/papaparse.min.js'];
  const D3   = ['https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js', 'https://unpkg.com/d3@7/dist/d3.min.js'];
  const THREEJS = ['https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', 'https://unpkg.com/three@0.128.0/build/three.min.js'];
  const ORBIT = ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', 'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'];
  const FG3D = ['https://cdn.jsdelivr.net/npm/3d-force-graph@1/dist/3d-force-graph.min.js', 'https://unpkg.com/3d-force-graph/dist/3d-force-graph.min.js', 'https://cdn.jsdelivr.net/npm/3d-force-graph@1.73.0/dist/3d-force-graph.min.js'];

  Promise.all([
    loadOne(PAPA, 0),
    loadOne(D3, 0),
    loadOne(THREEJS, 0).then(ok => ok ? loadOne(ORBIT, 0) : false),
    loadOne(FG3D, 0)
  ]).then(loadApp);
})();
