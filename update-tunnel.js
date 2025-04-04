// update-tunnel.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to extract the tunnel URL from command line arguments
function getTunnelUrl() {
  const args = process.argv.slice(2);
  const tunnelArg = args.find(arg => arg.startsWith('--tunnel-url='));
  
  if (!tunnelArg) {
    console.error('No tunnel URL provided. Use --tunnel-url=https://your-tunnel-url.com');
    process.exit(1);
  }
  
  return tunnelArg.split('=')[1];
}

// Function to update the .env file with the new tunnel URL
function updateEnvFile(tunnelUrl) {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    return false;
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace or add HOST entry
  if (envContent.includes('HOST=')) {
    envContent = envContent.replace(/HOST=.*/g, `HOST=${tunnelUrl}`);
  } else {
    envContent += `\nHOST=${tunnelUrl}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env file with HOST=${tunnelUrl}`);
  return true;
}

// Main function
function main() {
  const tunnelUrl = getTunnelUrl();
  
  if (!tunnelUrl) {
    console.error('Invalid tunnel URL');
    process.exit(1);
  }
  
  console.log(`Updating configuration with tunnel URL: ${tunnelUrl}`);
  
  const envUpdated = updateEnvFile(tunnelUrl);
  
  if (envUpdated) {
    console.log('Configuration updated successfully!');
  } else {
    console.error('Failed to update some configuration files');
    process.exit(1);
  }
}

main();