export function withMiddleware(handler, options = {}) {
  const { label = 'DB Operation', validate } = options;

  return async (event, ...args) => {
    const start = performance.now();

    try {

      const result = await handler(event, ...args);

      const duration = (performance.now() - start).toFixed(2);
      console.log(`${label} succeeded (${duration}ms)`);

      return result;
    } catch (error) {
      console.error(`${label} failed:`, error.message);
      throw error;
    }
  };
}
