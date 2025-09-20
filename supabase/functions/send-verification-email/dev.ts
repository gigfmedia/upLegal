// @deno-types="./deno.d.ts"
// @ts-expect-error - Deno is available at runtime
const { serve, env, addSignalListener, exit } = Deno;

// Import the handler from the TypeScript file
import { handler } from './index.ts';

// Start the server
const startServer = (port: number): void => {
  console.log(`🚀 Starting server on port ${port}...`);
  
  const server = serve((req: Request) => {
    console.log(`\n📨 New request: ${req.method} ${new URL(req.url).pathname}`);
    return handler(req);
  }, { port });
  
  // Handle graceful shutdown
  const handleShutdown = (): void => {
    console.log('\n🛑 Shutting down server...');
    server.close();
    exit(0);
  };
  
  addSignalListener('SIGINT', handleShutdown);
  addSignalListener('SIGTERM', handleShutdown);
};

// Main function
const main = (): void => {
  try {
    // Set environment variables directly
    const envVars = {
      RESEND_API_KEY: 're_ajDfj5k4_P3AJMKRJcKh3QoZ7qt4HByeZ',
      SUPABASE_URL: 'https://lgxsfmvyjctxehwslvyw.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU',
      APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5OTIxMCwiZXhwIjoyMDY4Mzc1MjEwfQ.8Q9QJQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ',
      SUPABASE_PROJECT_ID: 'lgxsfmvyjctxehwslvyw',
      PORT: '8000'
    };

    // Set environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      env.set(key, value);
      console.log(`Set ${key}=${value.substring(0, 5)}...`);
    });

    // Verify environment variables
    const missingVars = Object.keys(envVars).filter(key => !env.get(key));
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:');
      missingVars.forEach(varName => console.error(`- ${varName}`));
      exit(1);
    }
    
    // Log loaded environment variables (masking sensitive ones)
    console.log('\nEnvironment variables loaded successfully:');
    Object.entries(envVars).forEach(([key, value]) => {
      const displayValue = key.includes('KEY') || key.includes('SECRET')
        ? `${value.substring(0, 5)}...${value.substring(value.length - 3)}`
        : value;
      console.log(`- ${key}: ${displayValue}`);
    });
    
    // Start the server
    const port = parseInt(env.get('PORT') || '8000', 10);
    startServer(port);
    
    console.log('\nServer is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    console.error('Failed to start server:', error);
    exit(1);
  }
};

// Run the application
main();
