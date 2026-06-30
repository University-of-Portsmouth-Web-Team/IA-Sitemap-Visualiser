/* View 08 — City / skyline. Each top-level section is a ground plot; each
   of its immediate children is a tower, height = how many pages sit beneath
   it. Plot floor colour = that section's own dominant theme; tower colour =
   that child's theme (or flag colour). The most intuitive view for non-
   technical stakeholders — "this district is overbuilt" reads instantly.
   Illustrative rather than exhaustive: very large sections show their 24
   biggest children plus a "+N more" marker, not every descendant. */
(function(){
  let scene, camera, renderer, controls, raycaster, mouse, container;
  let buildingMeshes = [], animId = null, lastHoverNode = null;
  const CAP = 24;

  function makeTextSprite(text, color, size){
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = size || 30;
    ctx.font = fontSize + 'px monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    canvas.width = w; canvas.height = Math.ceil(fontSize * 1.7);
    ctx.font = fontSize + 'px monospace';
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 12, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(w / 13, canvas.height / 13, 1);
    return sprite;
  }

  function colorFor(n){
    return n.flagged && window.SVZ.state.showFlags ? window.SVZ.FLAG_COLOR
      : window.SVZ.colorForTheme(n.theme, window.SVZ.state.themeList);
  }

  function buildCity(){
    const roots = window.SVZ.state.tree.roots;
    const cols = Math.ceil(Math.sqrt(roots.length));
    const rows = Math.ceil(roots.length / cols);
    const plot = 46, gap = 16, cell = plot + gap;
    const offsetX = -(cols - 1) * cell / 2;
    const offsetZ = -(rows - 1) * cell / 2;

    roots.forEach((root, idx) => {
      const cx = idx % cols, cz = Math.floor(idx / cols);
      const px = offsetX + cx * cell, pz = offsetZ + cz * cell;

      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(plot, 2, plot),
        new THREE.MeshStandardMaterial({ color: colorFor(root), transparent: true, opacity: 0.22 })
      );
      floor.position.set(px, -1, pz);
      floor.userData.node = root;
      scene.add(floor); buildingMeshes.push(floor);

      const kids = root.children;
      const shown = kids.slice(0, CAP);
      const subCols = Math.max(1, Math.ceil(Math.sqrt(Math.max(shown.length,1))));
      const bGap = plot / subCols;
      const bSize = bGap * 0.62;
      const subOffset = -(subCols - 1) * bGap / 2;

      shown.forEach((child, j) => {
        const bx = j % subCols, bz = Math.floor(j / subCols);
        const height = 5 + Math.sqrt(child._count) * 7.5;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(bSize, height, bSize),
          new THREE.MeshStandardMaterial({ color: colorFor(child), metalness: 0.05, roughness: 0.75 })
        );
        mesh.position.set(px + subOffset + bx * bGap, height / 2, pz + subOffset + bz * bGap);
        mesh.userData.node = child;
        scene.add(mesh); buildingMeshes.push(mesh);
      });

      if(kids.length === 0){
        const stub = new THREE.Mesh(new THREE.BoxGeometry(bSize, 4, bSize),
          new THREE.MeshStandardMaterial({ color: '#3A5C7E' }));
        stub.position.set(px, 2, pz);
        stub.userData.node = root;
        scene.add(stub); buildingMeshes.push(stub);
      }

      const label = makeTextSprite(root.name.length > 22 ? root.name.slice(0,20)+'…' : root.name, '#E8EEF2', 22);
      label.position.set(px, 3, pz - plot/2 - 7);
      scene.add(label);

      if(kids.length > CAP){
        const more = makeTextSprite('+' + (kids.length - CAP) + ' more', '#FF6A39', 18);
        more.position.set(px, 3, pz + plot/2 + 7);
        scene.add(more);
      }
    });
  }

  function init(c){
    if(animId) cancelAnimationFrame(animId);
    container = c;
    container.innerHTML = '';
    if(typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined'){
      container.innerHTML = '<div class="view-empty">3D engine failed to load from CDN.<br>Check your internet connection and reload.</div>';
      return;
    }
    buildingMeshes = []; lastHoverNode = null;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B1E33);
    scene.fog = new THREE.Fog(0x0B1E33, 500, 1500);

    const w = container.clientWidth || 800, h = container.clientHeight || 600;
    camera = new THREE.PerspectiveCamera(55, w/h, 1, 6000);
    camera.position.set(0, 320, 480);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0,0,0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6);
    dl.position.set(300, 500, 200);
    scene.add(dl);

    scene.add(new THREE.GridHelper(2400, 60, 0x2C4A6E, 0x16314F));

    buildCity();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2(-10,-10);
    renderer.domElement.addEventListener('mousemove', e => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    });
    renderer.domElement.addEventListener('click', () => {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(buildingMeshes);
      if(hits.length) window.SVZ.setReadout(hits[0].object.userData.node);
    });

    const hint = document.createElement('div');
    hint.style.cssText = 'position:absolute;top:8px;left:14px;z-index:4;font-family:var(--mono);font-size:10.5px;color:var(--paper-dim);pointer-events:none;';
    hint.textContent = 'drag to orbit · scroll to zoom · each plot = a top-level section, each tower = a child page';
    container.appendChild(hint);

    function animate(){
      animId = requestAnimationFrame(animate);
      controls.update();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(buildingMeshes);
      const node = hits.length ? hits[0].object.userData.node : null;
      renderer.domElement.style.cursor = node ? 'pointer' : 'default';
      if(node !== lastHoverNode){ lastHoverNode = node; if(node) window.SVZ.setReadout(node); }
      renderer.render(scene, camera);
    }
    animate();

    resize();
    window.SVZ.renderLegend(window.SVZ.state.themeList);
  }

  function resize(){
    if(!renderer || !container) return;
    const w = container.clientWidth || 800, h = container.clientHeight || 600;
    renderer.setSize(w, h);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }

  function applySearch(){ /* city view is for spatial overview; use Outline/Tree to locate a specific page by name */ }

  window.SVZ.views.city = { init, applySearch, resize, activate: resize };
})();
