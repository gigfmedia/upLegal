// Only Auth server-managed app_metadata is a privileged role authority.
// profiles.role, user_metadata, request bodies and email allowlists are not.
import { isPlatformAdmin } from '../../supabase/functions/_shared/adminAuthority.mjs';
export { isPlatformAdmin };

export function createAuthorization({ supabase }) {
  async function authenticate(req, res) {
    const match = typeof req.headers.authorization === 'string'
      && /^Bearer ([^\s]+)$/i.exec(req.headers.authorization);
    if (!match) {
      res.status(401).json({ error: 'Token Bearer requerido' });
      return null;
    }
    try {
      const { data, error } = await supabase.auth.getUser(match[1]);
      if (error || !data?.user?.id) {
        res.status(401).json({ error: 'Token inválido o expirado' });
        return null;
      }
      req.authUser = data.user;
      return data.user;
    } catch {
      res.status(401).json({ error: 'No se pudo validar el token' });
      return null;
    }
  }

  async function requireAdmin(req, res, next) {
    const user = await authenticate(req, res);
    if (!user) return;
    if (!isPlatformAdmin(user)) {
      return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }
    req.adminUser = user;
    return next();
  }

  async function requireAuthentication(req, res, next) {
    if (await authenticate(req, res)) return next();
  }

  return { authenticate, requireAdmin, requireAuthentication };
}
