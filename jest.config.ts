import type { Config } from "@jest/types";
import { readdirSync } from 'fs';
import { join } from 'path';

// Helper function to get all package names
const getPackages = () => {
  const packagesPath = join(__dirname, 'packages');
  return readdirSync(packagesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
};

const packages = getPackages();

const config: Config.InitialOptions = {
  verbose: true,
  preset: "ts-jest",
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
