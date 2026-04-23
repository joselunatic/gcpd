/* eslint-disable react/no-unknown-property */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { PHONE_MODE_CALL, PHONE_MODE_TRACER } from './hooks/useQuestSession';

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
const PHONE_HIT_AREA_NAME = 'QuestPhoneHitArea';
const PHONE_KEY_HIT_PREFIX = 'QuestPhoneKeyHit_';
const PHONE_FOCUS_OFFSET = new THREE.Vector3(0, -0.3, -1.35);
const PHONE_FOCUS_TILT = -0.42;
const PHONE_FOCUS_ROLL = 0.03;
const PHONE_FOCUS_SCALE = 1.85;
const PHONE_HIT_AREA_COLOR = '#79dcff';
const PHONE_FOCUS_CONTROL_TARGET = 'QuestPhoneModeControl';
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };

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

const createPhoneLabelTexture = ({ title, subtitle = '', active = false, width = 640, height = 180 }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, active ? '#144960' : '#071823');
  background.addColorStop(1, active ? '#0b2b3d' : '#030b12');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = active ? '#d9f8ff' : '#4a8eaa';
  context.lineWidth = active ? 8 : 5;
  context.strokeRect(12, 12, width - 24, height - 24);

  context.fillStyle = active ? '#e8fbff' : '#a9d8e8';
  context.font = 'bold 54px monospace';
  context.textBaseline = 'top';
  context.fillText(title, 38, 34);

  if (subtitle) {
    context.fillStyle = active ? '#9ee7ff' : '#6ea8bc';
    context.font = '28px monospace';
    context.fillText(subtitle, 40, 106);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const collectPhoneNodes = (root) => {
  const phone = {
    keys: {},
    handset: null,
    model: null,
    hitArea: null,
    rig: root.getObjectByName(PHONE_RIG_NAME),
  };

  root.traverse((node) => {
    if (!node.isMesh) return;

    if (node.name === PHONE_HIT_AREA_NAME) {
      phone.hitArea = {
        node,
      };
      return;
    }

    if (node.name.startsWith(PHONE_KEY_PREFIX)) {
      const keyName = node.name.replace(PHONE_KEY_PREFIX, '');
      phone.keys[keyName] = {
        node,
        basePosition: node.position.clone(),
        baseScale: node.scale.clone(),
      };
      return;
    }

    if (node.name.startsWith(PHONE_KEY_HIT_PREFIX)) {
      const keyName = node.name.replace(PHONE_KEY_HIT_PREFIX, '');
      phone.keys[keyName] = {
        ...phone.keys[keyName],
        hitArea: node,
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

const isPhoneTargetName = (name = '') =>
  name === PHONE_FOCUS_CONTROL_TARGET ||
  name === PHONE_MODEL_NAME ||
  name === PHONE_HANDSET_NAME ||
  name === PHONE_HIT_AREA_NAME ||
  name.startsWith(PHONE_KEY_HIT_PREFIX) ||
  name.startsWith(PHONE_KEY_PREFIX);

const getPhoneTargetName = (object) => {
  let current = object;
  while (current) {
    if (isPhoneTargetName(current.name)) return current.name;
    if (current.name === PHONE_RIG_NAME || current.name === 'QuestPhoneFocusRig') {
      return PHONE_HIT_AREA_NAME;
    }
    current = current.parent;
  }
  return '';
};

const addPhoneHitArea = (phone) => {
  if (!phone?.rig || phone.rig.getObjectByName(PHONE_HIT_AREA_NAME)) return;

  phone.rig.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(phone.rig);
  if (bounds.isEmpty()) return;

  const worldCenter = new THREE.Vector3();
  const worldSize = new THREE.Vector3();
  const worldScale = new THREE.Vector3();
  bounds.getCenter(worldCenter);
  bounds.getSize(worldSize);
  phone.rig.getWorldScale(worldScale);

  const localCenter = phone.rig.worldToLocal(worldCenter.clone());
  const localSize = new THREE.Vector3(
    worldSize.x / Math.max(worldScale.x, 0.0001),
    worldSize.y / Math.max(worldScale.y, 0.0001),
    worldSize.z / Math.max(worldScale.z, 0.0001)
  );
  localSize.multiplyScalar(1.35);
  localSize.z = Math.max(localSize.z, 8);

  const geometry = new THREE.BoxGeometry(localSize.x, localSize.y, localSize.z);
  const material = new THREE.MeshBasicMaterial({
    color: PHONE_HIT_AREA_COLOR,
    transparent: true,
    opacity: 0.001,
    depthWrite: false,
    toneMapped: false,
  });
  const hitArea = new THREE.Mesh(geometry, material);
  hitArea.name = PHONE_HIT_AREA_NAME;
  hitArea.pointerEventsType = XR_RAY_POINTER_EVENTS;
  hitArea.pointerEventsOrder = 40;
  hitArea.position.copy(localCenter);
  hitArea.frustumCulled = false;
  hitArea.renderOrder = 30;
  phone.rig.add(hitArea);
  phone.hitArea = {
    node: hitArea,
  };
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

  if (type === 'hitArea') {
    material.opacity = 0.001;
    material.color = new THREE.Color(PHONE_HIT_AREA_COLOR);
    return;
  }

  material.opacity = 0.08;
  material.color = new THREE.Color(type === 'handset' ? '#8fdcff' : '#6ad7ff');
};

const addFocusKeyHitAreas = (focusRig) => {
  if (!focusRig) return;

  const rigScale = new THREE.Vector3();
  focusRig.getWorldScale(rigScale);
  const keyMeshes = [];

  focusRig.traverse((node) => {
    if (node.isMesh && node.name.startsWith(PHONE_KEY_PREFIX)) {
      keyMeshes.push(node);
    }
  });

  keyMeshes.forEach((keyNode) => {
    const keyName = keyNode.name.replace(PHONE_KEY_PREFIX, '');
    const bounds = new THREE.Box3().setFromObject(keyNode);
    if (bounds.isEmpty()) return;

    const worldCenter = new THREE.Vector3();
    const worldSize = new THREE.Vector3();
    bounds.getCenter(worldCenter);
    bounds.getSize(worldSize);

    const localCenter = focusRig.worldToLocal(worldCenter.clone());
    const localSize = new THREE.Vector3(
      worldSize.x / Math.max(rigScale.x, 0.0001),
      worldSize.y / Math.max(rigScale.y, 0.0001),
      worldSize.z / Math.max(rigScale.z, 0.0001)
    );

    localSize.x = Math.max(localSize.x * 2.1, 0.08);
    localSize.y = Math.max(localSize.y * 2.1, 0.08);
    localSize.z = Math.max(localSize.z * 3.2, 0.08);

    const hitArea = new THREE.Mesh(
      new THREE.BoxGeometry(localSize.x, localSize.y, localSize.z),
      new THREE.MeshBasicMaterial({
        color: '#d9f8ff',
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
        toneMapped: false,
      })
    );
    hitArea.name = `${PHONE_KEY_HIT_PREFIX}${keyName}`;
    hitArea.position.copy(localCenter);
    hitArea.pointerEventsType = XR_RAY_POINTER_EVENTS;
    hitArea.pointerEventsOrder = 80;
    hitArea.renderOrder = 80;
    hitArea.frustumCulled = false;
    focusRig.add(hitArea);
  });
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
      node.pointerEvents = 'none';
    } else if (node.name === PHONE_MODEL_NAME) {
      stylePhoneNode(node, 'model');
      node.pointerEvents = 'none';
    } else if (node.name === PHONE_HIT_AREA_NAME) {
      node.visible = false;
      node.pointerEvents = 'none';
    } else {
      cloneNodeMaterial(node);
    }
  });

  focusRig.updateMatrixWorld(true);
  addFocusKeyHitAreas(focusRig);
  focusRig.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(focusRig);
  if (!bounds.isEmpty()) {
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    focusRig.worldToLocal(center);
    focusRig.children.forEach((child) => {
      child.position.sub(center);
    });
    focusRig.updateMatrixWorld(true);
  }

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
    const hovered =
      hoveredTarget === entry.node.name ||
      hoveredTarget === `${PHONE_KEY_HIT_PREFIX}${keyName}`;

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

    if (entry.hitArea?.material) {
      entry.hitArea.material.opacity = hovered ? 0.1 : 0.001;
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
    const hovered = hoveredTarget === PHONE_MODEL_NAME || hoveredTarget === PHONE_HIT_AREA_NAME;

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

  if (phone.hitArea) {
    const material = Array.isArray(phone.hitArea.node.material)
      ? phone.hitArea.node.material[0]
      : phone.hitArea.node.material;
    if (material) {
      const hovered = hoveredTarget === PHONE_HIT_AREA_NAME || hoveredTarget === PHONE_MODEL_NAME;
      material.opacity = hovered ? 0.08 : 0.001;
      material.color.set(hovered ? '#9ee7ff' : PHONE_HIT_AREA_COLOR);
    }
  }
};

const PhoneFocusModeButton = ({
  mode,
  title,
  subtitle,
  active,
  disabled,
  position,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);
  const texture = useMemo(
    () => createPhoneLabelTexture({ title, subtitle, active: active || hovered }),
    [active, hovered, subtitle, title]
  );

  useEffect(() => {
    return () => texture?.dispose?.();
  }, [texture]);

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();
    if (!disabled) {
      onSelect?.(mode);
    }
  }, [disabled, mode, onSelect]);

  return (
    <mesh
      name={PHONE_FOCUS_CONTROL_TARGET}
      position={position}
      pointerEventsType={XR_RAY_POINTER_EVENTS}
      pointerEventsOrder={120}
      renderOrder={120}
      onPointerDown={handlePointerDown}
      onPointerEnter={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <planeGeometry args={[0.66, 0.2]} />
      <meshBasicMaterial
        map={texture || null}
        transparent
        opacity={disabled ? 0.42 : 0.94}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
};

const PhoneFocusControls = ({ phoneState, onPhoneModeSelect }) => {
  if (!phoneState?.focusMode) return null;

  const modeLocked = Boolean(phoneState.activeMode);

  return (
    <group position={[0, -0.48, 0.34]} scale={1.55}>
      <mesh
        name={PHONE_FOCUS_CONTROL_TARGET}
        position={[0, 0.08, -0.01]}
        pointerEventsType={XR_RAY_POINTER_EVENTS}
        pointerEventsOrder={110}
        renderOrder={118}
      >
        <planeGeometry args={[1.48, 0.42]} />
        <meshBasicMaterial
          color="#041019"
          transparent
          opacity={0.86}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <PhoneFocusModeButton
        mode={PHONE_MODE_CALL}
        title="LLAMADA"
        subtitle="DIAL"
        active={phoneState.mode === PHONE_MODE_CALL}
        disabled={modeLocked}
        position={[-0.38, 0.08, 0]}
        onSelect={onPhoneModeSelect}
      />
      <PhoneFocusModeButton
        mode={PHONE_MODE_TRACER}
        title="TRAZA"
        subtitle="TRACE"
        active={phoneState.mode === PHONE_MODE_TRACER}
        disabled={modeLocked}
        position={[0.38, 0.08, 0]}
        onSelect={onPhoneModeSelect}
      />
    </group>
  );
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
  addPhoneHitArea(phone);
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
  onPhoneModeSelect,
  phoneState,
}) => {
  const { camera } = useThree();
  const gltf = useLoader(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);
  const runtimeEnvironment = useMemo(() => prepareEnvironment(gltf), [gltf]);
  const [hoveredPhoneTarget, setHoveredPhoneTarget] = useState('');
  const focusAnchorRef = useRef(null);
  const focusBackdropRef = useRef(null);
  const wasFocusedRef = useRef(false);
  const focusLookHelperRef = useRef(new THREE.Object3D());
  const focusTargetPositionRef = useRef(new THREE.Vector3());
  const focusTargetQuaternionRef = useRef(new THREE.Quaternion());
  const focusTargetScaleRef = useRef(new THREE.Vector3());

  useEffect(() => {
    onAnchorsChange?.(runtimeEnvironment.anchors);
  }, [onAnchorsChange, runtimeEnvironment]);

  useEffect(() => {
    if (runtimeEnvironment.phone.rig) {
      runtimeEnvironment.phone.rig.visible = !phoneState?.focusMode;
    }
  }, [phoneState?.focusMode, runtimeEnvironment]);

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
    camera.getWorldPosition(cameraPosition);
    const focusPosition = focusTargetPositionRef.current
      .copy(cameraPosition)
      .add(
      PHONE_FOCUS_OFFSET.clone().applyQuaternion(camera.quaternion)
    );
    const focusHelper = focusLookHelperRef.current;
    focusHelper.position.copy(focusPosition);
    focusHelper.quaternion.identity();
    focusHelper.lookAt(cameraPosition);
    focusHelper.rotateX(PHONE_FOCUS_TILT);
    focusHelper.rotateZ(PHONE_FOCUS_ROLL);

    const focusQuaternion = focusTargetQuaternionRef.current.copy(focusHelper.quaternion);
    const baseScale = runtimeEnvironment.phone.rig?.scale || new THREE.Vector3(1, 1, 1);
    const focusScale = focusTargetScaleRef.current.copy(baseScale).multiplyScalar(PHONE_FOCUS_SCALE);

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
    const objectName = getPhoneTargetName(event.object);
    if (objectName) {
      event.stopPropagation();
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
    const objectName = getPhoneTargetName(event.object);

    if (objectName) {
      event.stopPropagation();
      if (!phoneState?.focusMode) {
        onPhoneFocusEnter?.();
      }
      return;
    }
  }, [onPhoneFocusEnter, phoneState?.focusMode]);

  const handleFocusPointerDown = useCallback((event) => {
    const objectName = getPhoneTargetName(event.object);
    event.stopPropagation();

    if (!phoneState?.focusMode) {
      return;
    }

    if (
      objectName === PHONE_MODEL_NAME ||
      objectName === PHONE_HIT_AREA_NAME ||
      objectName === PHONE_FOCUS_CONTROL_TARGET
    ) {
      onPhoneFocusExit?.();
      return;
    }

    if (objectName === PHONE_HANDSET_NAME) {
      onPhoneHandsetToggle?.();
      return;
    }

    if (objectName.startsWith(PHONE_KEY_HIT_PREFIX)) {
      onPhoneKeyPress?.(objectName.replace(PHONE_KEY_HIT_PREFIX, ''));
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
        pointerEventsType={XR_RAY_POINTER_EVENTS}
        onPointerMove={handlePointerMove}
        onPointerOut={clearHover}
        onPointerDown={handleEnvironmentPointerDown}
      />

      {runtimeEnvironment.focusPhone?.rig ? (
        <group ref={focusAnchorRef} visible={false}>
          <PhoneFocusControls
            phoneState={phoneState}
            onPhoneModeSelect={onPhoneModeSelect}
          />
          <mesh
            ref={focusBackdropRef}
            visible={false}
            position={[0, 0, -0.12]}
            pointerEventsType={XR_RAY_POINTER_EVENTS}
            pointerEventsOrder={10}
            onPointerDown={handleFocusBackdropDown}
          >
            <planeGeometry args={[1.1, 0.95]} />
            <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
          </mesh>
          <primitive
            object={runtimeEnvironment.focusPhone.rig}
            pointerEventsType={XR_RAY_POINTER_EVENTS}
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
