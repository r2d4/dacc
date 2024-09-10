#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectName = process.argv[2];

if (!projectName) {
    console.error('Please specify the project name');
    process.exit(1);
}

const currentDir = process.cwd();
const projectDir = path.resolve(currentDir, projectName);
const templateDir = path.resolve(__dirname, 'template');

const ourPackageJson = fs.readJsonSync(path.join(currentDir, 'package.json'));

try {
    // Copy template to new project directory
    fs.copySync(templateDir, projectDir);

    // Change to project directory
    process.chdir(projectDir);

    // Update project name in package.json
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageJson = fs.readJsonSync(packageJsonPath);
    packageJson.name = projectName;
    packageJson.dependencies['dacc'] = '^' + ourPackageJson.version;
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });

    // Install dependencies
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    console.log(`Project ${projectName} created successfully!`);
    console.log('To get started, run:');
    console.log(`  cd ${projectName}`);
    console.log('  npm start');
} catch (err) {
    console.error('An error occurred:', err);
}