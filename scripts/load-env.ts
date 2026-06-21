import path from "node:path";
import { loadEnvConfig } from "@next/env";

let loaded = false;

export function loadCliEnv(projectDir = process.cwd()) {
  if (loaded) {
    return;
  }

  loadEnvConfig(path.resolve(projectDir), process.env.NODE_ENV !== "production");
  loaded = true;
}

export function resetCliEnvForTests() {
  loaded = false;
}
