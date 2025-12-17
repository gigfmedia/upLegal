import { supabase } from '@/lib/supabase';

export interface ErrorLog {
  id?: string;
  type: string;
  message: string;
  details?: Record<string, any>;
  user_id?: string;
  path?: string;
  created_at?: string;
  is_database_error?: boolean;
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

export async function logError(errorLog: ErrorLog) {
  try {
    // Check if this is a database error
    const isDbError = errorLog.type.includes('database') || 
                     errorLog.type.includes('supabase') ||
                     (errorLog.details?.error?.code && errorLog.details.error.code.startsWith('2'));

    const { error } = await supabase
      .from('error_logs')
      .insert([{
        type: errorLog.type,
        message: errorLog.message,
        details: errorLog.details || {},
        user_id: errorLog.user_id,
        path: errorLog.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
        created_at: new Date().toISOString(),
        is_database_error: isDbError
      }]);

    if (error) {
      console.error('Error logging error:', error);
      // Try to log to console as fallback
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
    path: context.path || window.location.pathname
  });
}
