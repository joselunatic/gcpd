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
const PHONE_FOCUS_MODEL_OFFSET = [-0.32, 0, 0];
const PHONE_HIT_AREA_COLOR = '#79dcff';
const PHONE_FOCUS_CONTROL_TARGET = 'QuestPhoneModeControl';
const PHONE_FOCUS_CONTROL_LEFT = 'QuestPhoneModeControl_Call';
const PHONE_FOCUS_CONTROL_RIGHT = 'QuestPhoneModeControl_Tracer';
const PHONE_FOCUS_KEY_OFFSET = new THREE.Vector3(0, 0, 0);
const PHONE_FOCUS_KEY_SCALE = 1;
const PHONE_FOCUS_KEY_HIT_SCALE = 2.15;
const PHONE_FOCUS_KEY_FALLBACK_DISTANCE = 0.09;
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };
const PHONE_KEY_VALUE_MAP = {
  9: '1',
  8: '2',
  7: '3',
  6: '4',
  5: '5',
  4: '6',
  3: '7',
  2: '8',
  1: '9',
};

const getPhoneKeyValue = (keyName = '') => PHONE_KEY_VALUE_MAP[keyName] || keyName;

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

const createPhoneStatusTexture = ({
  modeLabel,
  digits,
  activeKey,
  lineStatus,
  lastAction,
  width = 1100,
  height = 360,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#06131c');
  background.addColorStop(1, '#02070d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = '#7edcff';
  context.lineWidth = 8;
  context.strokeRect(14, 14, width - 28, height - 28);

  context.fillStyle = 'rgba(126, 220, 255, 0.12)';
  context.fillRect(34, 34, width - 68, 8);

  context.textBaseline = 'top';
  context.fillStyle = '#84cce4';
  context.font = 'bold 34px monospace';
  context.fillText(`MODO ${modeLabel}`, 48, 58);
  context.fillText(`LINEA ${String(lineStatus || 'colgada').toUpperCase()}`, 610, 58);

  context.fillStyle = '#e8fbff';
  context.font = 'bold 82px monospace';
  context.fillText(digits || '----', 48, 122);

  context.fillStyle = activeKey ? '#fff2b6' : '#7ba9bb';
  context.font = 'bold 42px monospace';
  context.fillText(`TECLA ${activeKey || '--'}`, 48, 232);

  context.fillStyle = '#8bbace';
  context.font = '28px monospace';
  const action = String(lastAction || 'CALL inicia o cuelga. CLEAR limpia.').slice(0, 62);
  context.fillText(action, 48, 292);

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
  name === PHONE_FOCUS_CONTROL_LEFT ||
  name === PHONE_FOCUS_CONTROL_RIGHT ||
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

  const keyMeshes = [];

  focusRig.traverse((node) => {
    if (
      node.isMesh &&
      node.name.startsWith(PHONE_KEY_PREFIX) &&
      !node.parent?.getObjectByName(`${PHONE_KEY_HIT_PREFIX}${node.name.replace(PHONE_KEY_PREFIX, '')}`)
    ) {
      keyMeshes.push(node);
    }
  });

  keyMeshes.forEach((keyNode) => {
    const keyName = keyNode.name.replace(PHONE_KEY_PREFIX, '');
    if (!keyNode.geometry) return;

    const hitArea = new THREE.Mesh(
      keyNode.geometry.clone(),
      new THREE.MeshBasicMaterial({
        color: '#d9f8ff',
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
        toneMapped: false,
      })
    );
    hitArea.name = `${PHONE_KEY_HIT_PREFIX}${keyName}`;
    hitArea.position.copy(keyNode.position);
    hitArea.quaternion.copy(keyNode.quaternion);
    hitArea.scale.copy(keyNode.scale).multiplyScalar(PHONE_FOCUS_KEY_HIT_SCALE);
    hitArea.position.y += 0.035;
    hitArea.pointerEventsType = XR_RAY_POINTER_EVENTS;
    hitArea.pointerEventsOrder = 80;
    hitArea.renderOrder = 80;
    hitArea.frustumCulled = false;
    hitArea.userData.basePosition = hitArea.position.clone();
    hitArea.userData.baseScale = hitArea.scale.clone();
    keyNode.parent?.add(hitArea);
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
      node.pointerEventsType = XR_RAY_POINTER_EVENTS;
      node.pointerEventsOrder = 100;
    } else if (node.name === PHONE_HANDSET_NAME) {
      stylePhoneNode(node, 'handset');
      node.pointerEvents = 'none';
    } else if (node.name === PHONE_MODEL_NAME) {
      stylePhoneNode(node, 'model');
      node.pointerEventsType = XR_RAY_POINTER_EVENTS;
      node.pointerEventsOrder = 30;
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
    const keyValue = getPhoneKeyValue(keyName);
    const pressed = phoneState?.pressedKey === keyValue;
    const hovered =
      hoveredTarget === entry.node.name ||
      hoveredTarget === `${PHONE_KEY_HIT_PREFIX}${keyName}`;

    entry.node.position.copy(entry.basePosition);
    entry.node.scale.copy(entry.baseScale);

    if (focusedView) {
      entry.node.position.add(PHONE_FOCUS_KEY_OFFSET);
      entry.node.scale.multiplyScalar(PHONE_FOCUS_KEY_SCALE);
    }

    if (entry.hitArea) {
      entry.hitArea.position.copy(
        focusedView
          ? entry.basePosition.clone().add(PHONE_FOCUS_KEY_OFFSET)
          : entry.hitArea.userData.basePosition || entry.hitArea.position
      );
      entry.hitArea.scale.copy(entry.baseScale).multiplyScalar(
        focusedView ? PHONE_FOCUS_KEY_HIT_SCALE : 1
      );
    }

    if (pressed) {
      entry.node.position.y -= 0.06;
      entry.node.scale.set(
        entry.node.scale.x * 0.98,
        entry.node.scale.y * 0.7,
        entry.node.scale.z * 0.98
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

const findNearestPhoneKey = (phone, point) => {
  if (!phone || !point) return '';

  let nearestKey = '';
  let nearestDistance = Infinity;
  const position = new THREE.Vector3();

  Object.entries(phone.keys).forEach(([keyName, entry]) => {
    entry.node.getWorldPosition(position);
    const distance = position.distanceTo(point);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestKey = keyName;
    }
  });

  return nearestDistance <= PHONE_FOCUS_KEY_FALLBACK_DISTANCE ? nearestKey : '';
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
      name={mode === PHONE_MODE_CALL ? PHONE_FOCUS_CONTROL_LEFT : PHONE_FOCUS_CONTROL_RIGHT}
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
      <planeGeometry args={[0.95, 0.46]} />
      <meshBasicMaterial
        map={texture || null}
        transparent
        opacity={disabled ? 0.42 : 0.94}
        depthTest={false}
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
    <group position={[0, 0, 7.8]} scale={11.25}>
      <mesh
        name={PHONE_FOCUS_CONTROL_TARGET}
        position={[-1.22, 0, -0.02]}
        pointerEventsType={XR_RAY_POINTER_EVENTS}
        pointerEventsOrder={110}
        renderOrder={118}
      >
        <planeGeometry args={[1.06, 0.56]} />
        <meshBasicMaterial
          color="#041019"
          transparent
          opacity={0.86}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh
        name={PHONE_FOCUS_CONTROL_TARGET}
        position={[1.22, 0, -0.02]}
        pointerEventsType={XR_RAY_POINTER_EVENTS}
        pointerEventsOrder={110}
        renderOrder={118}
      >
        <planeGeometry args={[1.06, 0.56]} />
        <meshBasicMaterial
          color="#041019"
          transparent
          opacity={0.86}
          depthTest={false}
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
        position={[-1.22, 0, 0]}
        onSelect={onPhoneModeSelect}
      />
      <PhoneFocusModeButton
        mode={PHONE_MODE_TRACER}
        title="TRAZA"
        subtitle="TRACE"
        active={phoneState.mode === PHONE_MODE_TRACER}
        disabled={modeLocked}
        position={[1.22, 0, 0]}
        onSelect={onPhoneModeSelect}
      />
    </group>
  );
};

const getPhoneKeyDisplay = (targetName = '') => {
  if (targetName.startsWith(PHONE_KEY_HIT_PREFIX)) {
    return getPhoneKeyValue(targetName.replace(PHONE_KEY_HIT_PREFIX, ''));
  }
  if (targetName.startsWith(PHONE_KEY_PREFIX)) {
    return getPhoneKeyValue(targetName.replace(PHONE_KEY_PREFIX, ''));
  }
  return '';
};

const PhoneFocusStatus = ({ phoneState, hoveredPhoneTarget }) => {
  const hoveredKey = getPhoneKeyDisplay(hoveredPhoneTarget);
  const activeKey = phoneState.pressedKey || hoveredKey;
  const digits = phoneState.dialedDigits || phoneState.lastDialedNumber || '';
  const modeLabel = phoneState.mode === PHONE_MODE_TRACER ? 'TRAZA' : 'LLAMADA';
  const texture = useMemo(
    () => createPhoneStatusTexture({
      modeLabel,
      digits,
      activeKey,
      lineStatus: phoneState.lineStatus,
      lastAction: phoneState.lastAction,
    }),
    [activeKey, digits, modeLabel, phoneState.lastAction, phoneState.lineStatus]
  );

  useEffect(() => {
    return () => texture?.dispose?.();
  }, [texture]);

  if (!phoneState?.focusMode) return null;

  return (
    <group position={[0, 5.2, 8.4]} scale={10.5}>
      <mesh renderOrder={130}>
        <planeGeometry args={[1.62, 0.52]} />
        <meshBasicMaterial
          map={texture || null}
          transparent
          opacity={0.96}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
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
    let objectName = getPhoneTargetName(event.object);
    if (
      phoneState?.focusMode &&
      (objectName === PHONE_MODEL_NAME || objectName === PHONE_HANDSET_NAME)
    ) {
      const nearestKey = findNearestPhoneKey(runtimeEnvironment.focusPhone?.phone, event.point);
      if (nearestKey) {
        objectName = `${PHONE_KEY_HIT_PREFIX}${nearestKey}`;
      }
    }

    if (objectName) {
      event.stopPropagation();
      setHoveredPhoneTarget(objectName);
      return;
    }

    if (hoveredPhoneTarget) {
      setHoveredPhoneTarget('');
    }
  }, [hoveredPhoneTarget, phoneState?.focusMode, runtimeEnvironment.focusPhone?.phone]);

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

    if (objectName === PHONE_MODEL_NAME || objectName === PHONE_HANDSET_NAME) {
      const nearestKey = findNearestPhoneKey(runtimeEnvironment.focusPhone?.phone, event.point);
      if (nearestKey) {
        onPhoneKeyPress?.(getPhoneKeyValue(nearestKey));
      }
      return;
    }

    if (objectName === PHONE_HIT_AREA_NAME) {
      onPhoneFocusExit?.();
      return;
    }

    if (objectName === PHONE_HANDSET_NAME) {
      onPhoneHandsetToggle?.();
      return;
    }

    if (objectName.startsWith(PHONE_KEY_HIT_PREFIX)) {
      onPhoneKeyPress?.(getPhoneKeyValue(objectName.replace(PHONE_KEY_HIT_PREFIX, '')));
      return;
    }

    if (objectName.startsWith(PHONE_KEY_PREFIX)) {
      onPhoneKeyPress?.(getPhoneKeyValue(objectName.replace(PHONE_KEY_PREFIX, '')));
    }
  }, [
    onPhoneFocusExit,
    onPhoneHandsetToggle,
    onPhoneKeyPress,
    phoneState?.focusMode,
    runtimeEnvironment.focusPhone?.phone,
  ]);

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
          <PhoneFocusControls
            phoneState={phoneState}
            onPhoneModeSelect={onPhoneModeSelect}
          />
          <PhoneFocusStatus
            phoneState={phoneState}
            hoveredPhoneTarget={hoveredPhoneTarget}
          />
          <mesh
            ref={focusBackdropRef}
            visible={false}
            position={[0, 0, -0.62]}
            pointerEventsType={XR_RAY_POINTER_EVENTS}
            pointerEventsOrder={1}
            onPointerDown={handleFocusBackdropDown}
          >
            <planeGeometry args={[9.5, 6.5]} />
            <meshBasicMaterial
              transparent
              opacity={0.001}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <group position={PHONE_FOCUS_MODEL_OFFSET}>
            <primitive
              object={runtimeEnvironment.focusPhone.rig}
              onPointerMove={handlePointerMove}
              onPointerOut={clearHover}
              onPointerDown={handleFocusPointerDown}
            />
          </group>
        </group>
      ) : null}
    </>
  );
};

useLoader.preload(GLTFLoader, QUEST_ENVIRONMENT_MODEL_URL);

export default QuestEnvironment;
