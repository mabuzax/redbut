const { spawn } = require('child_process');
const fetch = require('node-fetch'); // Using node-fetch for HTTP requests

async function testBackend() {
  console.log('Starting backend for testing...');

  // Set environment variables for the child process
  const env = {
    ...process.env,
    DATABASE_URL: 'file:./prisma/dev.db',
    NODE_ENV: 'development',
    PORT: '3001',
    CORS_ORIGINS: 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: 'http://localhost:3001/chat',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-test-key', // Use actual key if set, otherwise a dummy
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  };

  // Start the backend in a child process
  const backendProcess = spawn('npm', ['run', 'dev', '--workspace=apps/api'], {
    cwd: process.cwd(),
    env: env,
    shell: true, // Use shell to allow npm commands
  });

  backendProcess.stdout.on('data', (data) => {
    process.stdout.write(`[BACKEND-OUT] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    process.stderr.write(`[BACKEND-ERR] ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  // Wait for the backend to start
  console.log('Waiting for backend to start (15 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  console.log('Attempting to connect to backend health endpoint...');
  try {
    const response = await fetch('http://localhost:3001/api/v1/hello');
    const data = await response.json();
    if (response.ok) {
      console.log('Backend is running and responding:', data);
    } else {
      console.error('Backend responded with an error:', data);
    }
  } catch (error) {
    console.error('Failed to connect to backend:', error.message);
  } finally {
    // Kill the backend process
    console.log('Killing backend process...');
    backendProcess.kill('SIGTERM'); // Use SIGTERM for graceful shutdown
  }
}

testBackend();