const isMetricsEnabled = () => Boolean(window.__woprMetrics);

function createMetricsScope(scope = "metrics") {
  const prefix = `[METRIC][${scope}]`;
  const mark = (label, data = {}) => {
    if (!isMetricsEnabled()) return;
    console.log(prefix, label, data);
  };
  const start = (label) => {
    if (!isMetricsEnabled()) {
      return () => {};
    }
    const t0 = performance.now();
    return (data = {}) => {
      const dt = performance.now() - t0;
      console.log(prefix, label, { dt, ...data });
    };
  };
  return { mark, start, enabled: isMetricsEnabled };
}

export { createMetricsScope };
