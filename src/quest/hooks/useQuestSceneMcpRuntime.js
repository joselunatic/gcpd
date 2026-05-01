import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const RUNTIME_MARKER = '__gcpdQuestR3fMcpRuntime';
const SUPPORTED_METHODS = new Set(['get_scene_hierarchy', 'get_object_transform']);
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_CHILDREN = 50;

const shouldInstallSceneRuntime = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(import.meta.env.DEV || window.IWER_DEVICE);
};

const clampPositiveInteger = (value, fallback) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(1, Math.floor(numberValue));
};

const serializeHierarchy = (object, depth, maxDepth, maxChildren) => {
  const node = {
    name: object.name || '(unnamed)',
    uuid: object.uuid,
    type: object.type,
  };

  if (typeof object.entityIdx === 'number') {
    node.entityIndex = object.entityIdx;
  }

  if (depth < maxDepth && object.children.length > 0) {
    const children = object.children.slice(0, maxChildren);
    node.children = children.map((child) =>
      serializeHierarchy(child, depth + 1, maxDepth, maxChildren)
    );

    if (object.children.length > maxChildren) {
      node.truncatedChildren = object.children.length - maxChildren;
    }
  }

  return node;
};

const toArray3 = (value) => value.toArray().map((item) => Number(item.toFixed(5)));
const toArray4 = (value) => value.toArray().map((item) => Number(item.toFixed(5)));

const createSceneRuntime = (scene, previousRuntime) => ({
  [RUNTIME_MARKER]: true,
  handles(method) {
    return SUPPORTED_METHODS.has(method) || Boolean(previousRuntime?.handles?.(method));
  },
  async dispatch(method, params = {}) {
    if (method === 'get_scene_hierarchy') {
      const maxDepth = clampPositiveInteger(params.maxDepth, DEFAULT_MAX_DEPTH);
      const maxChildren = clampPositiveInteger(params.maxChildren, DEFAULT_MAX_CHILDREN);
      const root = params.parentId
        ? scene.getObjectByProperty('uuid', params.parentId)
        : scene;

      if (!root) {
        throw new Error(
          `Object not found with UUID '${params.parentId}'. Use get_scene_hierarchy without parentId to inspect the scene root.`
        );
      }

      return serializeHierarchy(root, 0, maxDepth, maxChildren);
    }

    if (method === 'get_object_transform') {
      if (!params.uuid) {
        throw new Error(
          'uuid parameter is required. Use get_scene_hierarchy to discover Object3D UUIDs.'
        );
      }

      const object = scene.getObjectByProperty('uuid', params.uuid);
      if (!object) {
        throw new Error(
          `Object not found with UUID '${params.uuid}'. Use get_scene_hierarchy to discover available objects.`
        );
      }

      object.updateWorldMatrix(true, false);

      const globalPosition = new THREE.Vector3();
      const globalQuaternion = new THREE.Quaternion();
      const globalScale = new THREE.Vector3();
      object.matrixWorld.decompose(globalPosition, globalQuaternion, globalScale);

      return {
        localPosition: toArray3(object.position),
        localQuaternion: toArray4(object.quaternion),
        localScale: toArray3(object.scale),
        globalPosition: toArray3(globalPosition),
        globalQuaternion: toArray4(globalQuaternion),
        globalScale: toArray3(globalScale),
        positionRelativeToXROrigin: null,
      };
    }

    if (previousRuntime?.handles?.(method)) {
      return previousRuntime.dispatch(method, params);
    }

    throw new Error(`Unsupported FRAMEWORK_MCP_RUNTIME method '${method}'.`);
  },
});

const useQuestSceneMcpRuntime = () => {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!shouldInstallSceneRuntime()) return undefined;

    const previousRuntime = window.FRAMEWORK_MCP_RUNTIME;
    const runtime = createSceneRuntime(scene, previousRuntime);
    window.FRAMEWORK_MCP_RUNTIME = runtime;

    return () => {
      if (window.FRAMEWORK_MCP_RUNTIME === runtime) {
        if (previousRuntime) {
          window.FRAMEWORK_MCP_RUNTIME = previousRuntime;
        } else {
          delete window.FRAMEWORK_MCP_RUNTIME;
        }
      }
    };
  }, [scene]);
};

export { useQuestSceneMcpRuntime };
