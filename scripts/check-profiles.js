import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';

// Simple console logger as fallback
const fallbackLogger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  debug: (msg, meta) => process.env.DEBUG && console.debug(`[DEBUG] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || '')
};

let logger = fallbackLogger;

// Try to load the actual logger if available
try {
  // First try to load the compiled version
  const loggerPath = path.resolve(__dirname, '../dist/utils/logger.js');
  const loggerModule = await import(loggerPath);
  logger = loggerModule.logger || fallbackLogger;
  logger.debug('Using compiled logger from dist');
} catch (error) {
  console.warn('Failed to load compiled logger, using fallback console logger');
  logger = fallbackLogger;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
const env = dotenv.config({ path: envPath });

if (env.error) {
  logger.error('Error loading .env file', { error: env.error.message });
  process.exit(1);
}

/**
 * Safely gets an environment variable, exits if not found
 * @param {string} varName - Name of the environment variable
 * @returns {string} The environment variable value
 */
function getRequiredEnv(varName) {
  const value = process.env[varName];
  if (!value) {
    logger.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
  return value;
}

// Get Supabase configuration from environment
const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL');
const supabaseKey = getRequiredEnv('VITE_SUPABASE_ANON_KEY');

// Log environment status (without sensitive data)
logger.info('Environment check', {
  hasSupabaseUrl: !!supabaseUrl,
  nodeEnv: process.env.NODE_ENV || 'development',
  cwd: process.cwd()
});

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetches a limited number of profiles from the database
 * @param {number} limit - Maximum number of profiles to fetch
 * @returns {Promise<Array>} Array of profile objects
 */
async function fetchProfiles(limit = 5) {
  logger.info(`Fetching up to ${limit} profiles`);
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, created_at, updated_at, full_name, role')
      .limit(limit);
      
    if (error) throw error;
    
    logger.info(`Successfully fetched ${profiles.length} profiles`, { 
      count: profiles.length 
    });
    
    return profiles;
  } catch (error) {
    logger.error('Failed to fetch profiles', {
      error: error.message,
      code: error.code,
      details: error.details
    });
    throw error;
  }
}

/**
 * Analyzes profile data for bio information
 * @param {Array} profiles - Array of profile objects
 */
function analyzeProfiles(profiles) {
  const bioFields = ['bio', 'description', 'about', 'biography', 'biografia', 'descripcion'];
  const bioStats = {
    totalProfiles: profiles.length,
    profilesWithBio: 0,
    bioFieldUsage: {}
  };

  // Initialize counters for each bio field
  bioFields.forEach(field => {
    bioStats.bioFieldUsage[field] = 0;
  });

  profiles.forEach(profile => {
    let hasBio = false;
    
    for (const field of bioFields) {
      if (profile[field] && typeof profile[field] === 'string' && profile[field].trim() !== '') {
        bioStats.bioFieldUsage[field]++;
        hasBio = true;
      }
    }
    
    if (hasBio) bioStats.profilesWithBio++;
  });

  return bioStats;
}

/**
 * Main function to check profiles
 */
async function checkProfiles() {
  try {
    const profiles = await fetchProfiles(5);
    
    if (!profiles || profiles.length === 0) {
      logger.info('No profiles found in the database');
      return [];
    }
    
    // Log summary without sensitive data
    const bioStats = analyzeProfiles(profiles);
    logger.info('Profile analysis completed', {
      totalProfiles: bioStats.totalProfiles,
      profilesWithBio: bioStats.profilesWithBio,
      bioFieldUsage: bioStats.bioFieldUsage,
      sampleIds: profiles.slice(0, 3).map(p => p.id)
    });
    
    // Log first profile structure (non-sensitive fields only)
    const { id, created_at, updated_at, full_name, role } = profiles[0];
    logger.debug('Sample profile structure', {
      id,
      created_at,
      updated_at,
      full_name,
      role
    });
    
    return profiles;
  } catch (error) {
    logger.error('Profile check failed', {
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
    throw error;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  checkProfiles()
    .then(() => {
      logger.info('Profile check completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Profile check failed with error', { 
        error: error.message 
      });
      process.exit(1);
    });
}

export {
  checkProfiles,
  fetchProfiles,
  analyzeProfiles
};
