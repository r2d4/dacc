import type { Config } from "@jest/types";
import { resolve } from "path";
const packages = [
  "packages/dacc",
  "packages/oci",
  "packages/common",
  "examples"
];

const config: Config.InitialOptions = {
  verbose: true,
  preset: "ts-jest",
  haste: {
    forceNodeFilesystemAPI: true,
  },
  maxWorkers: 8,
  maxConcurrency: 8,
  testEnvironment: "node",
  projects: packages.map(packageName => ({
    displayName: packageName,
    rootDir: resolve(__dirname, packageName),
    preset: "ts-jest",
    testMatch: [`<rootDir>/**/__tests__/**/*.test.ts`],
    transform: {
      "^.+\\.ts$": "ts-jest",
    },
    testPathIgnorePatterns: ["<rootDir>/node_modules/"],
  })),
};

export default config;
