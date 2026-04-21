import { useEffect, useState } from 'react';

const fetchJson = async (url, fallbackUrl) => {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.debug('[Quest] primary fetch failed', url, error);
  }

  const fallbackResponse = await fetch(fallbackUrl, { cache: 'no-store' });
  return fallbackResponse.json();
};

const normalizeList = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const useQuestData = () => {
  const [state, setState] = useState({
    loading: true,
    error: '',
    cases: [],
    pois: [],
    villains: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [casesPayload, poisPayload, villainsPayload] = await Promise.all([
          fetchJson('/api/cases-data', '/data/cases/cases.json'),
          fetchJson('/api/pois-data', '/data/map/pois.json'),
          fetchJson('/api/villains-data', '/data/villains/gallery.json'),
        ]);

        if (cancelled) return;

        setState({
          loading: false,
          error: '',
          cases: normalizeList(casesPayload, 'cases'),
          pois: normalizeList(poisPayload, 'pois'),
          villains: normalizeList(villainsPayload, 'villains'),
        });
      } catch (error) {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load quest data.',
        }));
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

export { useQuestData };
