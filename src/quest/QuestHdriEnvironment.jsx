import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const QUEST_HDRI_URL = '/assets/quest/hdri/empty_warehouse_01_1k.exr';
const QUEST_HDRI_INTENSITY = 0.22;

const QuestHdriEnvironment = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    let disposed = false;
    let hdriTexture = null;
    let environmentTexture = null;

    const previousEnvironment = scene.environment;
    const previousIntensity = scene.environmentIntensity;

    const loader = new RGBELoader();
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    loader.load(
      QUEST_HDRI_URL,
      (texture) => {
        if (disposed) {
          texture.dispose();
          pmremGenerator.dispose();
          return;
        }

        hdriTexture = texture;
        hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
        environmentTexture = pmremGenerator.fromEquirectangular(hdriTexture).texture;

        scene.environment = environmentTexture;
        scene.environmentIntensity = QUEST_HDRI_INTENSITY;

        hdriTexture.dispose();
        pmremGenerator.dispose();
      },
      undefined,
      () => {
        pmremGenerator.dispose();
      }
    );

    return () => {
      disposed = true;
      scene.environment = previousEnvironment;
      scene.environmentIntensity = previousIntensity;
      environmentTexture?.dispose?.();
      hdriTexture?.dispose?.();
      pmremGenerator.dispose();
    };
  }, [gl, scene]);

  return null;
};

export default QuestHdriEnvironment;
