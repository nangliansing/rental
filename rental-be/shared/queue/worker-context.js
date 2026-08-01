let workerContext = null;

export const setWorkerRuntimeContext = (context) => {
  if (!context || typeof context !== "object") {
    throw new TypeError("Worker runtime context must be an object");
  }

  workerContext = context;
};

export const getWorkerRuntimeContext = () => workerContext;

export const resetWorkerRuntimeContextForTests = () => {
  workerContext = null;
};
