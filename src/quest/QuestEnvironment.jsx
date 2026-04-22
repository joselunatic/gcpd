/* eslint-disable react/no-unknown-property */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
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
const PHONE_RIG_NAME = 'QuestPhoneRig';
const PHONE_FOCUS_OFFSET = new THREE.Vector3(0.16, -0.06, -0.5);
const PHONE_FOCUS_ROTATION = new THREE.Euler(-1.08, 0, 0.06, 'YXZ');
const PHONE_FOCUS_SCALE = 4.2;

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

const collectPhoneNodes = (root) => {
  const phone = {
    keys: {},
    handset: null,
    model: null,
    rig: root.getObjectByName(PHONE_RIG_NAME),
  };

  root.traverse((node) => {
    if (!node.isMesh) return;

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
      phone.model = {
        node,
        basePosition: node.position.clone(),
        baseScale: node.scale.clone(),
      };
    }
  });

  return phone;
};

const stylePhoneNode = (node, type) => {
  cloneNodeMaterial(node);
  node.frustumCulled = false;
  node.renderOrder = 25;

  const material = Array.isArray(node.material) ? node.material[0] : node.material;
  if (!material) return;

  material.transparent = true;
  material.depthWrite = false;
  material.toneMapped = false;

  if (type === 'model') {
    material.opacity = 1;
    return;
  }

  material.opacity = 0.08;
  material.color = new THREE.Color(type === 'handset' ? '#8fdcff' : '#6ad7ff');
};

const createFocusPhone = (sourcePhone) => {
  if (!sourcePhone?.rig) return null;

  const focusRig = sourcePhone.rig.clone(true);
  focusRig.name = 'QuestPhoneFocusRig';
  focusRig.position.set(0, 0, 0);
  focusRig.quaternion.identity();
  focusRig.scale.set(1, 1, 1);

  focusRig.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;

    if (node.name.startsWith(PHONE_KEY_PREFIX)) {
      stylePhoneNode(node, 'key');
    } else if (node.name === PHONE_HANDSET_NAME) {
      stylePhoneNode(node, 'handset');
    } else if (node.name === PHONE_MODEL_NAME) {
      stylePhoneNode(node, 'model');
    } else {
      cloneNodeMaterial(node);
    }
  });

  const phone = collectPhoneNodes(focusRig);
  return {
    rig: focusRig,
    phone,
  };
};

const updatePhoneVisuals = ({ phone, hoveredTarget, phoneState, focusedView = false }) => {
  if (!phone) return;

  Object.entries(phone.keys).forEach(([keyName, entry]) => {
    const material = Array.isArray(entry.node.material)
      ? entry.node.material[0]
      : entry.node.material;
    const pressed = phoneState?.pressedKey === keyName;
    const hovered = hoveredTarget === entry.node.name;

    entry.node.position.copy(entry.basePosition);
    entry.node.scale.copy(entry.baseScale);

    if (pressed) {
      entry.node.position.z = entry.basePosition.z - 0.06;
      entry.node.scale.set(
        entry.baseScale.x * 0.98,
        entry.baseScale.y * 0.7,
        entry.baseScale.z * 0.98
      );
    }

    if (material) {
      const idleOpacity = focusedView ? 0.26 : phoneState?.focusMode ? 0 : 0.08;
      material.opacity = pressed
        ? 0.58
        : hovered
          ? focusedView ? 0.46 : 0.22
          : idleOpacity;
      material.color.set(pressed ? '#c8f6ff' : hovered ? '#9ee7ff' : '#67d7ff');
    }
  });

  if (phone.handset) {
    const { node, basePosition, baseScale } = phone.handset;
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    const hovered = hoveredTarget === PHONE_HANDSET_NAME;

    node.position.copy(basePosition);
    node.scale.copy(baseScale);

    if (phoneState?.isOffHook) {
      node.position.y = basePosition.y + 0.22;
      node.position.z = basePosition.z + 0.08;
    }

    if (material) {
      const idleOpacity = focusedView ? 0.22 : phoneState?.focusMode ? 0 : 0.08;
      material.opacity = phoneState?.isOffHook
        ? focusedView ? 0.38 : 0.3
        : hovered
          ? focusedView ? 0.34 : 0.16
          : idleOpacity;
      material.color.set(phoneState?.isOffHook ? '#c2f4ff' : '#8fdcff');
    }
  }

  if (phone.model) {
    const material = Array.isArray(phone.model.node.material)
      ? phone.model.node.material[0]
      : phone.model.node.material;
    const hovered = hoveredTarget === PHONE_MODEL_NAME;

    if (material) {
      if (focusedView) {
        material.emissive = material.emissive || new THREE.Color('#000000');
        material.emissive.set(hovered ? '#0f2434' : '#071520');
        material.emissiveIntensity = hovered ? 1.1 : 0.4;
      } else {
        material.emissive = material.emissive || new THREE.Color('#000000');
        material.emissive.set('#000000');
        material.emissiveIntensity = 0;
      }
    }
  }
};

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

    if (node.name.startsWith(PHONE_KEY_PREFIX)) {
      stylePhoneNode(node, 'key');
    } else if (node.name === PHONE_HANDSET_NAME) {
      stylePhoneNode(node, 'handset');
    } else if (node.name === PHONE_MODEL_NAME) {
      cloneNodeMaterial(node);
    }
  });

  environment.updateMatrixWorld(true);
  const phone = collectPhoneNodes(environment);
  const focusPhone = createFocusPhone(phone);

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
    focusPhone,
  };
};

const QuestEnvironment = ({
  onAnchorsChange,
  onPhoneKeyPress,
  onPhoneHandsetToggle,
  onPhoneFocusEnter,
  onPhoneFocusExit,
  phoneState,
}) => {
  const { camera } = useThree();
  const gltf = useLoader(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);
  const runtimeEnvironment = useMemo(() => prepareEnvironment(gltf), [gltf]);
  const [hoveredPhoneTarget, setHoveredPhoneTarget] = useState('');
  const focusAnchorRef = useRef(null);
  const focusBackdropRef = useRef(null);
  const wasFocusedRef = useRef(false);

  useEffect(() => {
    onAnchorsChange?.(runtimeEnvironment.anchors);
  }, [onAnchorsChange, runtimeEnvironment]);

  useFrame(() => {
    if (!phoneState?.focusMode) {
      if (focusAnchorRef.current) {
        focusAnchorRef.current.visible = false;
      }
      if (focusBackdropRef.current) {
        focusBackdropRef.current.visible = false;
      }
      wasFocusedRef.current = false;
      return;
    }

    const focusAnchor = focusAnchorRef.current;
    if (!focusAnchor) return;

    const cameraPosition = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    camera.getWorldDirection(cameraDirection);
    const focusPosition = cameraPosition.clone().add(
      PHONE_FOCUS_OFFSET.clone().applyQuaternion(camera.quaternion)
    );
    const focusQuaternion = camera.quaternion.clone().multiply(
      new THREE.Quaternion().setFromEuler(PHONE_FOCUS_ROTATION)
    );
    const baseScale = runtimeEnvironment.phone.rig?.scale || new THREE.Vector3(1, 1, 1);
    const focusScale = baseScale.clone().multiplyScalar(PHONE_FOCUS_SCALE);

    focusAnchor.visible = true;
    if (focusBackdropRef.current) {
      focusBackdropRef.current.visible = true;
    }

    if (!wasFocusedRef.current) {
      focusAnchor.position.copy(focusPosition);
      focusAnchor.quaternion.copy(focusQuaternion);
      focusAnchor.scale.copy(focusScale);
      wasFocusedRef.current = true;
      return;
    }

    focusAnchor.position.lerp(focusPosition, 0.24);
    focusAnchor.quaternion.slerp(focusQuaternion, 0.24);
    focusAnchor.scale.lerp(focusScale, 0.24);
  });

  useEffect(() => {
    updatePhoneVisuals({
      phone: runtimeEnvironment.phone,
      hoveredTarget: phoneState?.focusMode ? '' : hoveredPhoneTarget,
      phoneState,
      focusedView: false,
    });
    updatePhoneVisuals({
      phone: runtimeEnvironment.focusPhone?.phone,
      hoveredTarget: phoneState?.focusMode ? hoveredPhoneTarget : '',
      phoneState,
      focusedView: true,
    });
  }, [hoveredPhoneTarget, phoneState, runtimeEnvironment]);

  const handlePointerMove = useCallback((event) => {
    const objectName = event.object?.name || '';
    if (
      objectName === PHONE_MODEL_NAME ||
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

  const clearHover = useCallback(() => {
    setHoveredPhoneTarget('');
  }, []);

  const handleEnvironmentPointerDown = useCallback((event) => {
    const objectName = event.object?.name || '';

    if (
      objectName === PHONE_MODEL_NAME ||
      objectName === PHONE_HANDSET_NAME ||
      objectName.startsWith(PHONE_KEY_PREFIX)
    ) {
      event.stopPropagation();
      if (!phoneState?.focusMode) {
        onPhoneFocusEnter?.();
      }
      return;
    }
  }, [onPhoneFocusEnter, phoneState?.focusMode]);

  const handleFocusPointerDown = useCallback((event) => {
    const objectName = event.object?.name || '';
    event.stopPropagation();

    if (!phoneState?.focusMode) {
      return;
    }

    if (objectName === PHONE_MODEL_NAME) {
      onPhoneFocusExit?.();
      return;
    }

    if (objectName === PHONE_HANDSET_NAME) {
      onPhoneHandsetToggle?.();
      return;
    }

    if (objectName.startsWith(PHONE_KEY_PREFIX)) {
      onPhoneKeyPress?.(objectName.replace(PHONE_KEY_PREFIX, ''));
    }
  }, [onPhoneFocusExit, onPhoneHandsetToggle, onPhoneKeyPress, phoneState?.focusMode]);

  const handleFocusBackdropDown = useCallback((event) => {
    event.stopPropagation();
    clearHover();
    onPhoneFocusExit?.();
  }, [clearHover, onPhoneFocusExit]);

  return (
    <>
      <primitive
        object={runtimeEnvironment.scene}
        onPointerMove={handlePointerMove}
        onPointerOut={clearHover}
        onPointerDown={handleEnvironmentPointerDown}
      />

      {runtimeEnvironment.focusPhone?.rig ? (
        <group ref={focusAnchorRef} visible={false}>
          <mesh
            ref={focusBackdropRef}
            visible={false}
            position={[0, 0, -0.18]}
            onPointerDown={handleFocusBackdropDown}
          >
            <planeGeometry args={[0.8, 0.7]} />
            <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
          </mesh>
          <primitive
            object={runtimeEnvironment.focusPhone.rig}
            onPointerMove={handlePointerMove}
            onPointerOut={clearHover}
            onPointerDown={handleFocusPointerDown}
          />
        </group>
      ) : null}
    </>
  );
};

useLoader.preload(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);

export default QuestEnvironment;
