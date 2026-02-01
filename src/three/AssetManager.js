let threeModulesPromise = null;

const loadThreeModules = async () => {
  if (!threeModulesPromise) {
    threeModulesPromise = Promise.all([
      import("three"),
      import("three/examples/jsm/effects/AsciiEffect.js"),
      import("three/examples/jsm/loaders/STLLoader.js"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]).then(([threeModule, asciiModule, loaderModule, controlsModule]) => ({
      THREE: threeModule,
      AsciiEffect: asciiModule?.AsciiEffect,
      STLLoader: loaderModule?.STLLoader,
      OrbitControls: controlsModule?.OrbitControls,
    }));
  }
  return threeModulesPromise;
};

const preloadThreeModules = () => {
  loadThreeModules().catch(() => {});
};

export { loadThreeModules, preloadThreeModules };
