/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const QUEST_ENVIRONMENT_MODEL_URL = '/assets/quest/quest_base_scene_v1.glb';

const PANEL_ANCHOR_NAME = 'MainPanelScreen';
const VIEWER_ANCHOR_NAME = 'UserFootMarker';

const RUNTIME_HIDDEN_NAMES = new Set([
  PANEL_ANCHOR_NAME,
  VIEWER_ANCHOR_NAME,
  'RearHalo',
]);

const RUNTIME_HIDDEN_PREFIXES = ['StatusNib_'];

const snapshotTransform = (object) => {
  if (!object) return null;

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();

  object.getWorldPosition(position);
  object.getWorldQuaternion(quaternion);

  return {
    position: position.toArray(),
    quaternion: quaternion.toArray(),
  };
};

const snapshotPosition = (object) => {
  if (!object) return null;

  const position = new THREE.Vector3();
  object.getWorldPosition(position);
  return position.toArray();
};

const snapshotBounds = (object) => {
  if (!object) return null;

  const bounds = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  bounds.getSize(size);

  return size.toArray();
};

const shouldHideNode = (name = '') =>
  RUNTIME_HIDDEN_NAMES.has(name) ||
  RUNTIME_HIDDEN_PREFIXES.some((prefix) => name.startsWith(prefix));

const prepareEnvironment = (gltf) => {
  const environment = gltf.scene.clone(true);

  environment.traverse((node) => {
    if (!node.isMesh) return;

    node.castShadow = false;
    node.receiveShadow =
      node.name === 'BasePlatform' ||
      node.name === 'InnerPlatform' ||
      node.name === 'LeftPlinth' ||
      node.name === 'RightPlinth';
    node.frustumCulled = true;

    if (shouldHideNode(node.name)) {
      node.visible = false;
    }
  });

  environment.updateMatrixWorld(true);

  return {
    scene: environment,
    anchors: {
      panel: {
        ...snapshotTransform(environment.getObjectByName(PANEL_ANCHOR_NAME)),
        size: snapshotBounds(environment.getObjectByName(PANEL_ANCHOR_NAME)),
      },
      viewerPosition: snapshotPosition(
        environment.getObjectByName(VIEWER_ANCHOR_NAME)
      ),
    },
  };
};

const QuestEnvironment = ({ onAnchorsChange }) => {
  const gltf = useLoader(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);
  const runtimeEnvironment = useMemo(() => prepareEnvironment(gltf), [gltf]);

  useEffect(() => {
    onAnchorsChange?.(runtimeEnvironment.anchors);
  }, [onAnchorsChange, runtimeEnvironment]);

  return <primitive object={runtimeEnvironment.scene} />;
};

useLoader.preload(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);

export default QuestEnvironment;
