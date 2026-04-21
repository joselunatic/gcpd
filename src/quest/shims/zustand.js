import { useCallback, useRef, useSyncExternalStore } from 'react';
import createDefault from '../../../node_modules/zustand/esm/index.js';

const create = createDefault;

const useStore = (api, selector = (state) => state, equalityFn = Object.is) => {
  const cacheRef = useRef();

  const getSnapshot = useCallback(() => {
    const nextSlice = selector(api.getState());
    if (
      cacheRef.current === undefined ||
      !equalityFn(cacheRef.current, nextSlice)
    ) {
      cacheRef.current = nextSlice;
    }
    return cacheRef.current;
  }, [api, selector, equalityFn]);

  return useSyncExternalStore(api.subscribe, getSnapshot, getSnapshot);
};

export { create, create as default, useStore };
