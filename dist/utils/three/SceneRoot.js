function createSceneRoot({
  THREE,
  container,
  camera,
  fov = 45,
  near = 0.1,
  far = 2000,
  pixelRatioMax = 2,
  antialias = false,
  alpha = true,
} = {}) {
  if (!container) {
    throw new Error("createSceneRoot requires a container");
  }
  if (!THREE) {
    throw new Error("createSceneRoot requires THREE");
  }
  const scene = new THREE.Scene();
  const activeCamera = camera || new THREE.PerspectiveCamera(fov, 1, near, far);
  const renderer = new THREE.WebGLRenderer({ antialias, alpha });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioMax));

  const resize = () => {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    activeCamera.aspect = width / height;
    activeCamera.updateProjectionMatrix();
    renderer.setSize(width, height);
    return { width, height };
  };

  const observeResize = () => {
    if (typeof ResizeObserver === "undefined") return null;
    const observer = new ResizeObserver(() => resize());
    observer.observe(container);
    return observer;
  };

  const dispose = () => {
    renderer.dispose();
  };

  return {
    scene,
    camera: activeCamera,
    renderer,
    resize,
    observeResize,
    dispose,
  };
}

export { createSceneRoot };
