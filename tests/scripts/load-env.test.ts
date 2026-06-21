import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEnvConfigMock = vi.hoisted(() => vi.fn());

vi.mock("@next/env", () => ({
  loadEnvConfig: loadEnvConfigMock
}));

import { loadCliEnv, resetCliEnvForTests } from "../../scripts/load-env";

describe("loadCliEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    loadEnvConfigMock.mockClear();
    resetCliEnvForTests();
  });

  it("loads Next-style env files for CLI scripts once", () => {
    loadCliEnv("C:\\RepoRadar");
    loadCliEnv("C:\\RepoRadar");

    expect(loadEnvConfigMock).toHaveBeenCalledTimes(1);
    expect(loadEnvConfigMock).toHaveBeenCalledWith("C:\\RepoRadar", true);
  });

  it("uses production env loading when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");

    loadCliEnv("C:\\RepoRadar");

    expect(loadEnvConfigMock).toHaveBeenCalledWith("C:\\RepoRadar", false);
  });
});
