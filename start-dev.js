// start-dev.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';

async function main() {
  console.log('Starting Cloudflare tunnel...');
  
  // Start cloudflared in the background
  const cloudflared = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3000']);
  
  // Extract the tunnel URL from cloudflared output
  let tunnelUrl = null;
  
  // Handle standard output
  cloudflared.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    checkForTunnelUrl(output);
  });
  
  // Handle error output - IMPORTANT: cloudflared outputs the URL to stderr
  cloudflared.stderr.on('data', (data) => {
    const output = data.toString();
    console.log(`cloudflared: ${output}`);
    checkForTunnelUrl(output);
  });
  
  function checkForTunnelUrl(output) {
    // Look for the tunnel URL in the output
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      console.log(`\n>>> Detected tunnel URL: ${tunnelUrl}\n`);
      
      // Update the .env file
      updateEnvFile(tunnelUrl);
      
      // Start the development server using a direct approach
      console.log('Starting development server...');
      
      // Use npm.cmd on Windows, npm otherwise
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';
      
      // Run shopify dev without any special flags - use the simplest approach
      const shopify = spawn(npmCmd, ['run', 'dev'], { 
        stdio: 'inherit',
        shell: true,
        env: { 
          ...process.env,
          HOST: tunnelUrl,
          // Ensure PostgreSQL environment variables are passed through
          PG_HOST: process.env.PG_HOST,
          PG_PORT: process.env.PG_PORT,
          PG_DATABASE: process.env.PG_DATABASE,
          PG_USER: process.env.PG_USER,
          PG_PASSWORD: process.env.PG_PASSWORD,
          PG_SSL: process.env.PG_SSL
        }
      });
      
      // Handle dev server exit
      shopify.on('close', (code) => {
        console.log(`Development server exited with code ${code}`);
        // Kill the cloudflared process when the dev server exits
        cloudflared.kill();
        process.exit(code);
      });
      
      // Handle errors
      shopify.on('error', (err) => {
        console.error('Failed to start development server:', err);
        cloudflared.kill();
        process.exit(1);
      });
    }
  }
  
  // Handle process exit
  cloudflared.on('close', (code) => {
    if (!tunnelUrl) {
      console.error('Failed to start Cloudflare tunnel');
      process.exit(1);
    }
  });
  
  // Listen for CTRL+C to clean up both processes
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    cloudflared.kill();
    process.exit();
  });
}

// Function to update the .env file with the new tunnel URL
function updateEnvFile(tunnelUrl) {
  if (!tunnelUrl) {
    console.log('No tunnel URL to update');
    return false;
  }
  
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
  
  // Also update shopify.app.toml
  updateAppToml(tunnelUrl);
  
  return true;
}

// Function to update shopify.app.toml
function updateAppToml(tunnelUrl) {
  const tomlPath = path.join(__dirname, 'shopify.app.toml');
  
  if (!fs.existsSync(tomlPath)) {
    console.log('shopify.app.toml not found, skipping');
    return false;
  }
  
  let tomlContent = fs.readFileSync(tomlPath, 'utf8');
  
  // Update application_url
  tomlContent = tomlContent.replace(
    /application_url = ".*"/,
    `application_url = "${tunnelUrl}"`
  );
  
  // Update redirect_urls
  const redirectPattern = /redirect_urls = \[([\s\S]*?)\]/;
  const redirectMatch = tomlContent.match(redirectPattern);
  
  if (redirectMatch) {
    const newRedirects = `\n  "${tunnelUrl}/auth/callback",\n  "${tunnelUrl}/auth/shopify/callback",\n  "${tunnelUrl}/api/auth/callback"\n`;
    tomlContent = tomlContent.replace(redirectPattern, `redirect_urls = [${newRedirects}]`);
  }
  
  fs.writeFileSync(tomlPath, tomlContent);
  console.log(`Updated shopify.app.toml with tunnel URL=${tunnelUrl}`);
  return true;
}

main().catch(console.error);