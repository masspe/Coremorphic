const DEFAULT_SANDBOX_STATUS = "idle";

export const getSandboxStatus = (sandpack) => sandpack?.status ?? DEFAULT_SANDBOX_STATUS;

export const canRunSandboxPreview = (status, runSandpack) =>
  typeof runSandpack === "function" && status !== "running";

export const runSandboxPreviewSafely = async (runSandpack) => {
  if (typeof runSandpack !== "function") {
    return undefined;
  }

  return runSandpack();
};

export const __TEST_ONLY__ = {
  DEFAULT_SANDBOX_STATUS
};
