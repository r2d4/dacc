import type { Config } from "@jest/types";

// Helper function to get all package names
const packages = ["dacc", "oci"];

const config: Config.InitialOptions = {
  verbose: true,
  preset: "ts-jest",
  cache: true,
  haste: {
    forceNodeFilesystemAPI: true,
  },
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  projects: packages.map(packageName => ({
    displayName: packageName,
    testMatch: [`<rootDir>/packages/${packageName}/**/__tests__/**/*.test.ts`],
    testPathIgnorePatterns: ["<rootDir>/node_modules/"],
    preset: "ts-jest",
  })),
};

export default config;
