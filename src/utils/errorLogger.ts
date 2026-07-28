import { supabase } from '@/lib/supabase';
import { getClientEnv } from './clientEnv';

export interface ErrorLog {
  id?: string;
  type: string;
  message: string;
  details?: Record<string, any>;
  user_id?: string;
  path?: string;
  created_at?: string;
  is_database_error?: boolean;
  build_version?: string;
  commit_hash?: string;
  browser?: string;
  os?: string;
  viewport?: string;
  anonymous_id?: string;
}

interface DatabaseErrorDetails {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
  table?: string;
  constraint?: string;
  column?: string;
  dataType?: string;
  query?: string;
  parameters?: any[];
}

function enrichWithClientEnv(log: Partial<ErrorLog>): Partial<ErrorLog> {
  if (typeof window === 'undefined') return log;
  try {
    const env = getClientEnv();
    return {
      ...log,
      browser: log.browser || env.browser,
      os: log.os || env.os,
      viewport: log.viewport || env.viewport,
      build_version: log.build_version || env.buildVersion,
      commit_hash: log.commit_hash || env.commitHash,
      anonymous_id: log.anonymous_id || env.anonymousId,
    };
  } catch {
    return log;
  }
}

export async function logError(errorLog: ErrorLog) {
  try {
    const isDbError = errorLog.type.includes('database') ||
                     errorLog.type.includes('supabase') ||
                     (errorLog.details?.error?.code && errorLog.details.error.code.startsWith('2'));

    const enriched = enrichWithClientEnv(errorLog);

    const { error } = await supabase
      .from('error_logs')
      .insert([{
        type: enriched.type,
        message: enriched.message,
        details: enriched.details || {},
        user_id: enriched.user_id,
        path: enriched.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
        created_at: new Date().toISOString(),
        is_database_error: isDbError,
        build_version: enriched.build_version,
        commit_hash: enriched.commit_hash,
        browser: enriched.browser,
        os: enriched.os,
        viewport: enriched.viewport,
        anonymous_id: enriched.anonymous_id,
      }]);

    if (error) {
      console.error('Error logging error:', error);
      console.error('Original error:', errorLog);
    }
  } catch (e) {
    console.error('Failed to log error:', e);
    console.error('Original error that failed to log:', errorLog);
  }
}

export async function logDatabaseError(error: any, context: Record<string, any> = {}) {
  const errorDetails: DatabaseErrorDetails = {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    table: error.table,
    constraint: error.constraint,
    column: error.column,
    dataType: error.dataType,
    query: error.query,
    parameters: error.parameters,
  };

  return logError({
    type: 'database_error',
    message: `Database Error: ${error.message}`,
    details: {
      ...errorDetails,
      ...context,
      error: {
        ...error,
        stack: error.stack,
      },
    },
    is_database_error: true,
  });
}

export async function logCheckoutError(error: any, context: Record<string, any> = {}) {
  return logError({
    type: 'checkout_failed',
    message: error.message || 'Error en el proceso de pago',
    details: {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }
    },
    user_id: context.userId,
    path: context.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
  });
}