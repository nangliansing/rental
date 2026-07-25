const RUNTIME_STATES = Object.freeze({
  STARTING: "STARTING",
  READY: "READY",
  SHUTTING_DOWN: "SHUTTING_DOWN",
});

export const createRuntimeHealth = ({
  isDatabaseReady = () => true,
  isRateLimitStoreReady = () => true,
} = {}) => {
  let state = RUNTIME_STATES.STARTING;

  return {
    markReady() {
      state = RUNTIME_STATES.READY;
    },
    markShuttingDown() {
      state = RUNTIME_STATES.SHUTTING_DOWN;
    },
    isLive() {
      return true;
    },
    isReady() {
      const status = this.getStatus();
      return (
        status.state === RUNTIME_STATES.READY &&
        status.databaseReady &&
        status.rateLimitStoreReady
      );
    },
    getState() {
      return state;
    },
    getStatus() {
      let databaseReady = false;
      let rateLimitStoreReady = false;

      try {
        databaseReady = Boolean(isDatabaseReady());
        rateLimitStoreReady = Boolean(isRateLimitStoreReady());
      } catch {
        // Dependency checks are deliberately collapsed to an unready state.
      }

      return {
        state,
        databaseReady,
        rateLimitStoreReady,
      };
    },
  };
};

export const createReadyRuntimeHealth = () => {
  const runtimeHealth = createRuntimeHealth();
  runtimeHealth.markReady();
  return runtimeHealth;
};
