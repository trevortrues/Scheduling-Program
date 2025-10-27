export function withMiddleware(handler, options = {}) {
  const { label = 'DB Operation', format } = options;

  return async (event, ...args) => {
    const start = performance.now();

    try {
      
      let result = await handler(event, ...args);

      // Apply format function
      if (format && typeof format === 'function') {
        result = format(result);
        console.log(`${label} formatted result:`, result);
      } else {
        console.log(`${label} no format function provided, returning raw data`);
      }

      const duration = (performance.now() - start).toFixed(2);
      console.log(`${label} succeeded (${duration}ms)`);

      return result;
    } catch (error) {
      console.error(`${label} failed:`, error.message);
      throw error;
    }
  };
}