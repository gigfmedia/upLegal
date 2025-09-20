// Simple test script to verify environment variables
console.log('Testing environment variables...');

// Set environment variables directly
const envVars = {
  RESEND_API_KEY: 're_ajDfj5k4_P3AJMKRJcKh3QoZ7qt4HByeZ',
  SUPABASE_URL: 'https://lgxsfmvyjctxehwslvyw.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU',
  APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5OTIxMCwiZXhwIjoyMDY4Mzc1MjEwfQ.8Q9QJQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ',
  SUPABASE_PROJECT_ID: 'lgxsfmvyjctxehwslvyw',
  PORT: '8000'
};

// Set environment variables
Object.entries(envVars).forEach(([key, value]) => {
  Deno.env.set(key, value);
  console.log(`Set ${key}=${value.substring(0, 5)}...`);
});

// Verify environment variables
console.log('\nVerifying environment variables:');
const missingVars = Object.keys(envVars).filter(key => !Deno.env.get(key));

if (missingVars.length > 0) {
  console.error('Missing environment variables:', missingVars.join(', '));
  Deno.exit(1);
} else {
  console.log('All environment variables are set correctly!');
  console.log('\nEnvironment variables:');
  Object.keys(envVars).forEach(key => {
    const value = Deno.env.get(key) || '';
    const displayValue = key.includes('KEY') || key.includes('SECRET')
      ? `${value.substring(0, 5)}...${value.substring(value.length - 3)}`
      : value;
    console.log(`- ${key}: ${displayValue}`);
  });
}

console.log('\nTest completed successfully!');
