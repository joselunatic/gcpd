import { useEffect } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const QUEST_HDRI_URL = '/assets/quest/hdri/empty_warehouse_01_1k.exr';

const QuestHdriEnvironment = () => {
  const { gl, scene } = useThree();
  const hdriTexture = useLoader(RGBELoader, QUEST_HDRI_URL);

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    const environmentMap = pmremGenerator.fromEquirectangular(hdriTexture).texture;
    const previousEnvironment = scene.environment;
    const previousBackground = scene.background;

    scene.environment = environmentMap;
    scene.background = null;
    scene.environmentIntensity = 0.35;
    scene.backgroundIntensity = 0;

    hdriTexture.dispose();

    return () => {
      scene.environment = previousEnvironment;
      scene.background = previousBackground;
      environmentMap.dispose();
      pmremGenerator.dispose();
    };
  }, [gl, hdriTexture, scene]);

  return null;
};

export default QuestHdriEnvironment;
