import { useEffect, useRef } from 'react';
import { createMetricsScope } from '../js/metrics.js';
import { loadThreeModules } from '../three/AssetManager.js';
import { createSceneRoot } from '../three/SceneRoot.js';

import '../css/BootAscii.styles.css';

const DEFAULT_DURATION_MS = 9000;
const ASCII_CHARS = ' .:-+*=%@#';
const EFFECT_RESOLUTION = 0.2;
const BOOT_ASCII_FILTER = 'contrast(1.28) brightness(1.18) saturate(1.08)';
const SHOW_LOGO = false;
const LOGO_TEXT = String.raw`
  _      _______  ___  ______  _____  _____  __  _______________  ____________
 | | /| / / _ \ \/ / |/ / __/ /  _/ |/ / _ \/ / / / __/_  __/ _ \/  _/ __/ __/
 | |/ |/ / __ |\  /    / _/  _/ //    / // / /_/ /\ \  / / / , _// // _/_\ \  
 |__/|__/_/ |_|/_/_/|_/___/ /___/_/|_/____/\____/___/ /_/ /_/|_/___/___/___/  
                                                                              `;

const BootAscii = ({ onDone, durationMs = DEFAULT_DURATION_MS, modelUrl = '' }) => {
  const containerRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const metrics = createMetricsScope('BootAscii');
    const bootStart = performance.now();
    console.log('[BootAscii]', new Date().toISOString(), 'start', bootStart);
    metrics.mark('boot_start', { modelUrl, durationMs });
    const container = containerRef.current;
    if (!container) return undefined;

    const skipBoot =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 639px)').matches;
    if (skipBoot) {
      console.log('[BootAscii]', new Date().toISOString(), 'skip boot (mobile)');
      if (typeof onDone === 'function') onDone();
      return undefined;
    }

    let disposed = false;
    let cleanup = () => {};
    const removeListeners = () => {
      window.removeEventListener('keydown', handleSkip, { capture: true });
      window.removeEventListener('pointerdown', handleSkip, { capture: true });
    };

    const run = async () => {
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const threeStart = performance.now();
      const stopImport = metrics.start('import_three');
      console.log('[BootAscii]', new Date().toISOString(), 'import three start', threeStart);
      const { THREE, AsciiEffect, STLLoader } = await loadThreeModules();
      console.log('[BootAscii]', new Date().toISOString(), 'import three done', performance.now(), 'dt', performance.now() - threeStart);
      stopImport({ modules: ['three', 'AsciiEffect', 'STLLoader'] });

      if (disposed) return;

    const sceneRoot = createSceneRoot({
      THREE,
      container,
      antialias: false,
      alpha: true,
      fov: 45,
      near: 0.1,
      far: 2000,
      pixelRatioMax: 2,
    });
    const { scene, camera, renderer } = sceneRoot;
    const themeSource =
      document.getElementById('terminal-container') ||
      document.documentElement ||
      document.body;
    const themeStyles = themeSource ? getComputedStyle(themeSource) : null;
    const themeFg =
      themeStyles?.getPropertyValue('--fg-primary')?.trim() ||
      themeStyles?.getPropertyValue('--color')?.trim() ||
      '#ffffff';
    const bootBackground = '#010101'; // force pure dark baseline to avoid tinted noise
    scene.background = new THREE.Color(bootBackground);

      camera.position.set(0, 0, 160);

    const outputMode = 'ascii';
    let effect = null;
    if (outputMode === 'ascii') {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        if (type === '2d' && !options) {
          return originalGetContext.call(this, type, { willReadFrequently: true });
        }
        return originalGetContext.call(this, type, options);
      };
      effect = new AsciiEffect(renderer, ASCII_CHARS, {
        invert: true,
        resolution: EFFECT_RESOLUTION,
      });
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      effect.domElement.classList.add('boot-ascii__effect');
      effect.domElement.style.color = themeFg || '#ffffff';
      effect.domElement.style.backgroundColor = bootBackground;
      effect.domElement.style.mixBlendMode = 'normal'; // keep renderer from lifting background tone
      effect.domElement.style.filter = BOOT_ASCII_FILTER; // brighter glyph pass while preserving dark baseline
      effect.domElement.style.pointerEvents = 'none';
      effect.domElement.style.width = '100%';
      effect.domElement.style.height = '100%';
      effect.domElement.style.display = 'block';
      container.appendChild(effect.domElement);
    } else {
      renderer.setClearColor(themeBg || '#000000', 1);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);
    }
    document.body.classList.add('boot-ascii-active');

    const hud = document.createElement('div');
    hud.className = 'boot-ascii__hud';
    container.appendChild(hud);
    let logo = null;
    if (SHOW_LOGO) {
      logo = document.createElement('pre');
      logo.className = 'boot-ascii__logo';
      logo.textContent = LOGO_TEXT;
      logo.style.color = themeFg || '#ffffff';
      container.appendChild(logo);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.78);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(120, 160, 200);
    scene.add(keyLight);

      const fillLight = new THREE.PointLight(0xffffff, 1.25);
      fillLight.position.set(-120, -80, 100);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xb6ffe5, 1.35);
      rimLight.position.set(-160, 60, -120);
      scene.add(rimLight);

      let mesh = null;
      const material = new THREE.MeshStandardMaterial({
        color: 0xf2fff8,
        roughness: 0.28,
        metalness: 0.18,
        emissive: 0x56dba8,
        emissiveIntensity: 0.22,
        flatShading: true,
        side: THREE.DoubleSide,
      });

      const frameBounds = () => {
        if (!mesh || !mesh.geometry || !mesh.geometry.boundingBox) return;
        const bbox = mesh.geometry.boundingBox;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.2;
        camera.position.set(0, size.y * 0.15, distance);
        camera.lookAt(0, 0, 0);
      };

      const useGeometry = (geometry) => {
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
        }
        geometry.computeVertexNormals();
        geometry.center();
        geometry.computeBoundingBox();
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.set(Math.PI, 0, 0);
        mesh.scale.set(1, 1, 1);
        scene.add(mesh);
        frameBounds();
      };

      if (modelUrl) {
        const loader = new STLLoader();
        const stopStl = metrics.start('stl_load');
        loader.load(
          modelUrl,
          (geometry) => {
            stopStl({ ok: true });
            useGeometry(geometry);
          },
          undefined,
          () => {
            stopStl({ ok: false });
            const fallback = new THREE.TorusKnotGeometry(28, 9, 120, 16);
            useGeometry(fallback);
          }
        );
      } else {
        const fallback = new THREE.TorusKnotGeometry(28, 9, 120, 16);
        useGeometry(fallback);
      }

      let rafId = null;

    const adjustAsciiWidth = () => {
      if (!effect?.domElement) return;
      const table = effect.domElement.querySelector('table');
      if (!table) return;
      const tableWidth = table.offsetWidth;
      if (!tableWidth) return;
      const containerWidth = container.clientWidth || 1;
      const scaleX = containerWidth / tableWidth;
      effect.domElement.style.transform = `scaleX(${scaleX})`;
      effect.domElement.style.transformOrigin = 'top left';
    };

    const resize = () => {
      const { width, height } = sceneRoot.resize();
      if (effect) effect.setSize(width, height);
      adjustAsciiWidth();
    };

    resize();

    const resizeObserver = sceneRoot.observeResize();

    const render = () => {
      if (mesh && !reducedMotion) {
        mesh.rotation.y += 0.01;
      }
      if (effect) {
        effect.render(scene, camera);
        adjustAsciiWidth();
      } else {
        renderer.render(scene, camera);
      }
      hud.textContent = `CAM X:${camera.position.x.toFixed(1)} Y:${camera.position.y.toFixed(1)} Z:${camera.position.z.toFixed(1)}  LIGHT X:${keyLight.position.x.toFixed(1)} Y:${keyLight.position.y.toFixed(1)} Z:${keyLight.position.z.toFixed(1)}`;
      rafId = window.requestAnimationFrame(render);
    };

      render();
      metrics.mark('render_start');
      console.log('[BootAscii]', new Date().toISOString(), 'render started', performance.now(), 'dt', performance.now() - bootStart);

      let cleanedUp = false;
      cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        if (resizeObserver) resizeObserver.disconnect();
        if (rafId) window.cancelAnimationFrame(rafId);
        if (mesh) {
          mesh.geometry.dispose();
        }
        material.dispose();
        sceneRoot.dispose();
        if (effect?.domElement && effect.domElement.parentNode) {
          effect.domElement.parentNode.removeChild(effect.domElement);
        }
        if (renderer?.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        document.body.classList.remove('boot-ascii-active');
        if (hud.parentNode) {
          hud.parentNode.removeChild(hud);
        }
        if (logo && logo.parentNode) {
          logo.parentNode.removeChild(logo);
        }
      };
    };

    run();

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      console.log('[BootAscii]', new Date().toISOString(), 'finish', performance.now(), 'dt', performance.now() - bootStart);
      metrics.mark('boot_finish', { dt: performance.now() - bootStart });
      removeListeners();
      cleanup();
      if (typeof onDone === 'function') onDone();
    };

    const handleSkip = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      finish();
    };

    window.addEventListener('keydown', handleSkip, { capture: true });
    window.addEventListener('pointerdown', handleSkip, { capture: true });

    const timeoutId = window.setTimeout(finish, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
      removeListeners();
      cleanup();
    };
  }, [durationMs, modelUrl, onDone]);

  return <div className="boot-ascii" ref={containerRef} />;
};

export default BootAscii;
