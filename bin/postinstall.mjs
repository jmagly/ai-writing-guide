#!/usr/bin/env node
/**
 * AIWG Post-install Script
 * Checks if aiwg is accessible in PATH and provides helpful guidance
 */

import { execSync } from 'child_process';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function checkPath() {
  try {
    // Try to run aiwg --version
    execSync('aiwg --version', { stdio: 'ignore' });

    // Success - aiwg is in PATH
    console.log('');
    console.log(`${GREEN}✓${RESET} aiwg installed successfully!`);
    console.log('');
    console.log(`  ${CYAN}aiwg demo${RESET}       Create a demo project to try it out`);
    console.log(`  ${CYAN}aiwg doctor${RESET}     Check installation health`);
    console.log(`  ${CYAN}aiwg -help${RESET}      Show all commands`);
    console.log('');
  } catch {
    // aiwg not in PATH
    console.log('');
    console.log(`${YELLOW}⚠${RESET}  aiwg installed but may not be in your PATH`);
    console.log('');
    console.log('   If you get "command not found", add npm global bin to PATH:');
    console.log('');

    // Detect shell and provide appropriate instructions
    const shell = process.env.SHELL || '';

    if (shell.includes('zsh')) {
      console.log(`   ${CYAN}echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc${RESET}`);
      console.log(`   ${CYAN}source ~/.zshrc${RESET}`);
    } else if (shell.includes('bash')) {
      console.log(`   ${CYAN}echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc${RESET}`);
      console.log(`   ${CYAN}source ~/.bashrc${RESET}`);
    } else {
      console.log(`   ${CYAN}npm config get prefix${RESET}    # Find your npm global bin directory`);
      console.log(`   Add that path + /bin to your shell's PATH`);
    }

    console.log('');
    console.log('   Or run directly with npx:');
    console.log(`   ${CYAN}npx aiwg demo${RESET}`);
    console.log('');
  }
}

// Only run check if this is a global install
// Local installs (devDependencies) don't need PATH
if (!process.env.npm_config_save_dev && !process.env.npm_config_save) {
  checkPath();
}
