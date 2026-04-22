/* eslint-disable react/no-unknown-property */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
const PHONE_KEY_PREFIX = 'QuestPhoneKey_';
const PHONE_HANDSET_NAME = 'QuestPhoneHandset';
const PHONE_MODEL_NAME = 'QuestPhoneModel';

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

const cloneNodeMaterial = (node) => {
  if (!node?.material) return;

  if (Array.isArray(node.material)) {
    node.material = node.material.map((material) => material?.clone?.() || material);
    return;
  }

  node.material = node.material.clone();
};

const prepareEnvironment = (gltf) => {
  const environment = gltf.scene.clone(true);
  const phone = {
    keys: {},
    handset: null,
    model: null,
  };

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

    if (node.name.startsWith(PHONE_KEY_PREFIX) || node.name === PHONE_HANDSET_NAME) {
      cloneNodeMaterial(node);
      node.renderOrder = 25;

      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material) {
        material.transparent = true;
        material.opacity = 0.08;
        material.depthWrite = false;
        material.toneMapped = false;
        material.color = new THREE.Color(node.name === PHONE_HANDSET_NAME ? '#8fdcff' : '#6ad7ff');
      }
    }

    if (node.name.startsWith(PHONE_KEY_PREFIX)) {
      phone.keys[node.name.replace(PHONE_KEY_PREFIX, '')] = {
        node,
        basePosition: node.position.clone(),
        baseScale: node.scale.clone(),
      };
    }

    if (node.name === PHONE_HANDSET_NAME) {
      phone.handset = {
        node,
        basePosition: node.position.clone(),
        baseScale: node.scale.clone(),
      };
    }

    if (node.name === PHONE_MODEL_NAME) {
      phone.model = node;
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
    phone,
  };
};

const QuestEnvironment = ({ onAnchorsChange, onPhoneKeyPress, onPhoneHandsetToggle, phoneState }) => {
  const gltf = useLoader(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);
  const runtimeEnvironment = useMemo(() => prepareEnvironment(gltf), [gltf]);
  const [hoveredPhoneTarget, setHoveredPhoneTarget] = useState('');

  useEffect(() => {
    onAnchorsChange?.(runtimeEnvironment.anchors);
  }, [onAnchorsChange, runtimeEnvironment]);

  useEffect(() => {
    Object.entries(runtimeEnvironment.phone.keys).forEach(([keyName, entry]) => {
      const material = Array.isArray(entry.node.material)
        ? entry.node.material[0]
        : entry.node.material;
      const normalizedPressedKey = phoneState?.pressedKey === keyName;
      const hovered = hoveredPhoneTarget === entry.node.name;

      entry.node.position.copy(entry.basePosition);
      entry.node.scale.copy(entry.baseScale);

      if (normalizedPressedKey) {
        entry.node.position.z = entry.basePosition.z - 0.06;
        entry.node.scale.set(
          entry.baseScale.x * 0.98,
          entry.baseScale.y * 0.7,
          entry.baseScale.z * 0.98
        );
      }

      if (material) {
        material.opacity = normalizedPressedKey ? 0.42 : hovered ? 0.22 : 0.08;
        material.color.set(
          normalizedPressedKey ? '#c8f6ff' : hovered ? '#8fe5ff' : '#67d7ff'
        );
      }
    });

    if (runtimeEnvironment.phone.handset) {
      const { node, basePosition, baseScale } = runtimeEnvironment.phone.handset;
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      const hovered = hoveredPhoneTarget === PHONE_HANDSET_NAME;

      node.position.copy(basePosition);
      node.scale.copy(baseScale);

      if (phoneState?.isOffHook) {
        node.position.y = basePosition.y + 0.22;
        node.position.z = basePosition.z + 0.08;
      }

      if (material) {
        material.opacity = phoneState?.isOffHook ? 0.24 : hovered ? 0.16 : 0.08;
        material.color.set(phoneState?.isOffHook ? '#c2f4ff' : '#8fdcff');
      }
    }
  }, [hoveredPhoneTarget, phoneState, runtimeEnvironment]);

  const handlePointerMove = useCallback((event) => {
    const objectName = event.object?.name || '';
    if (
      objectName.startsWith(PHONE_KEY_PREFIX) ||
      objectName === PHONE_HANDSET_NAME
    ) {
      setHoveredPhoneTarget(objectName);
      return;
    }

    if (hoveredPhoneTarget) {
      setHoveredPhoneTarget('');
    }
  }, [hoveredPhoneTarget]);

  const handlePointerMiss = useCallback(() => {
    setHoveredPhoneTarget('');
  }, []);

  const handlePointerDown = useCallback((event) => {
    const objectName = event.object?.name || '';

    if (objectName === PHONE_HANDSET_NAME) {
      event.stopPropagation();
      onPhoneHandsetToggle?.();
      return;
    }

    if (!objectName.startsWith(PHONE_KEY_PREFIX)) return;

    event.stopPropagation();
    onPhoneKeyPress?.(objectName.replace(PHONE_KEY_PREFIX, ''));
  }, [onPhoneHandsetToggle, onPhoneKeyPress]);

  return (
    <primitive
      object={runtimeEnvironment.scene}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerMiss}
      onPointerMissed={handlePointerMiss}
      onPointerDown={handlePointerDown}
    />
  );
};

useLoader.preload(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);

export default QuestEnvironment;
