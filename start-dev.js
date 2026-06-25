/**
 * Development Server Starter Script
 * 
 * This script starts both the frontend and backend development servers
 * for the ClinicTrust AI Platform.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Configuration
const config = {
  client: {
    directory: path.join(__dirname, 'client'),
    command: 'npm',
    args: ['start'],
    color: 'blue',
    name: 'FRONTEND'
  },
  server: {
    directory: path.join(__dirname, 'server'),
    command: 'npm',
    args: ['run', 'dev'],
    color: 'green',
    name: 'BACKEND'
  }
};

// Check if directories exist
for (const [key, value] of Object.entries(config)) {
  if (!fs.existsSync(value.directory)) {
    console.error(chalk.red(`Error: ${value.name} directory not found: ${value.directory}`));
    process.exit(1);
  }
}

// Helper function to format log output
function formatLog(name, color, data) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = chalk[color](`[${name} ${timestamp}]`);
  
  return data
    .toString()
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => `${prefix} ${line}`)
    .join('\n');
}

// Start processes
function startProcess({ directory, command, args, color, name }) {
  console.log(chalk[color](`Starting ${name} server...`));
  
  const process = spawn(command, args, {
    cwd: directory,
    shell: true
  });
  
  process.stdout.on('data', (data) => {
    console.log(formatLog(name, color, data));
  });
  
  process.stderr.on('data', (data) => {
    console.error(formatLog(name, color, data));
  });
  
  process.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`${name} process exited with code ${code}`));
    }
  });
  
  return process;
}

// Print banner
console.log(chalk.cyan('='.repeat(80)));
console.log(chalk.cyan('=') + ' '.repeat(26) + chalk.bold('ClinicTrust AI Platform') + ' '.repeat(26) + chalk.cyan('='));
console.log(chalk.cyan('=') + ' '.repeat(22) + 'Development Server Starter' + ' '.repeat(22) + chalk.cyan('='));
console.log(chalk.cyan('='.repeat(80)));
console.log('');

// Start both servers
const serverProcess = startProcess(config.server);
const clientProcess = startProcess(config.client);

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down development servers...'));
  serverProcess.kill();
  clientProcess.kill();
  process.exit(0);
});

console.log(chalk.cyan('\nPress Ctrl+C to stop all servers\n'));
