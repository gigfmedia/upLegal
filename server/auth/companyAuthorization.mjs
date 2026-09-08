const reference = (table, location, key, optional = false) => ({ table, location, key, optional });
const company = (location = 'query') => reference('companies', location, 'companyId');
const request = (location = 'params', key = 'id') => reference('company_requests', location, key);
const budget = () => reference('company_budgets', 'params', 'id');
const document = () => reference('legal_documents', 'params', 'id');
const folder = () => reference('legal_folders', 'params', 'id');

// Explicit route allowlist: no wildcard interception, including subscription/payment routes.
export const COMPANY_ROUTE_POLICIES = {
  'POST /api/empresas/subscription/create': { resource: company('body'), action: 'manage' },
  'GET /api/empresas/subscription/:companyId': { resource: company('params'), action: 'manage' },
  'POST /api/empresas/subscription/:subscriptionId/cancel': {
    resource: reference('company_subscriptions', 'params', 'subscriptionId'), action: 'manage',
  },
  'POST /api/empresas/requests': { resource: company('body'), action: 'write' },
  'POST /api/empresas/requests/:requestId/documents': { resource: request('params', 'requestId'), action: 'write' },
  'POST /api/empresas/requests/:id/first-response': { resource: request(), action: 'respond' },
  'GET /api/empresas/requests/:id/timeline': { resource: request(), action: 'read' },
  'GET /api/empresas/requests/:id/conversation': { resource: request(), action: 'read' },
  'POST /api/empresas/requests/:id/messages': { resource: request(), action: 'write' },
  'GET /api/empresas/budgets': {
    resource: company(), action: 'read',
    related: [reference('company_requests', 'query', 'requestId', true)],
  },
  'POST /api/empresas/budgets/auto-generate': { resource: request('body', 'requestId'), action: 'manage' },
  'POST /api/empresas/budgets/manual': { resource: request('body', 'requestId'), action: 'quote' },
  'POST /api/empresas/budgets/:id/approve': { resource: budget(), action: 'manage' },
  'POST /api/empresas/budgets/:id/reject': { resource: budget(), action: 'manage' },
  'GET /api/empresas/sla-metrics': { resource: company(), action: 'read' },
  'GET /api/empresas/activity-log': { resource: company(), action: 'read' },
  'GET /api/empresas/ratings': { resource: request('query', 'requestId'), action: 'read' },
  'POST /api/empresas/legal-center/seed': { resource: company('body'), action: 'manage' },
  'GET /api/empresas/legal-folders': { resource: company(), action: 'read' },
  'POST /api/empresas/legal-folders': {
    resource: company('body'), action: 'write',
    related: [reference('legal_folders', 'body', 'parentId', true)],
  },
  'PUT /api/empresas/legal-folders/:id': {
    resource: folder(), action: 'write',
    related: [reference('legal_folders', 'body', 'parent_id', true)],
  },
  'DELETE /api/empresas/legal-folders/:id': { resource: folder(), action: 'manage' },
  'GET /api/empresas/legal-documents': {
    resource: company(), action: 'read',
    related: [reference('legal_folders', 'query', 'folderId', true)],
  },
  'GET /api/empresas/legal-documents/:id': { resource: document(), action: 'read' },
  'POST /api/empresas/legal-documents': {
    resource: company('body'), action: 'write',
    related: [reference('legal_folders', 'body', 'folderId', true)],
  },
  'POST /api/empresas/legal-documents/:id/versions': { resource: document(), action: 'write' },
  'GET /api/empresas/legal-documents/:id/versions': { resource: document(), action: 'read' },
  'DELETE /api/empresas/legal-documents/:id': { resource: document(), action: 'manage' },
  'POST /api/empresas/legal-documents/:id/link-request': {
    resource: document(), action: 'write', related: [request('body', 'requestId')],
  },
  'DELETE /api/empresas/legal-documents/:id/link-request/:requestId': {
    resource: document(), action: 'write', related: [request('params', 'requestId')],
  },
  'GET /api/empresas/legal-documents/:id/requests': { resource: document(), action: 'read' },
};

const allowedRoles = {
  read: ['owner', 'admin', 'member', 'viewer', 'assigned_lawyer'],
  write: ['owner', 'admin', 'member', 'assigned_lawyer'],
  manage: ['owner', 'admin'],
  quote: ['owner', 'admin', 'assigned_lawyer'],
  respond: ['assigned_lawyer'],
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failure = (status, message) => Object.assign(new Error(message), { status });

export function createCompanyAuthorization({ supabase, authenticate }) {
  async function lookup(table, id) {
    if (typeof id !== 'string' || !uuid.test(id)) throw failure(400, 'Identificador inválido');
    const columns = table === 'companies' ? 'id, user_id'
      : table === 'company_requests' ? 'id, company_id, lawyer_id'
      : table === 'company_budgets' ? 'id, company_id, request_id'
      : 'id, company_id';
    // Read only ownership metadata until authorization has succeeded.
    const { data, error } = await supabase.from(table).select(columns).eq('id', id).maybeSingle();
    if (error) throw failure(503, 'No se pudo verificar el acceso');
    if (!data) throw failure(404, 'Recurso no encontrado');
    return data;
  }

  function forRoute(route) {
    const policy = COMPANY_ROUTE_POLICIES[route];
    if (!policy) throw new Error(`Missing company authorization policy: ${route}`);
    return async (req, res, next) => {
      const user = await authenticate(req, res);
      if (!user) return;
      try {
        const ref = policy.resource;
        const resource = await lookup(ref.table, req[ref.location]?.[ref.key]);
        const companyId = ref.table === 'companies' ? resource.id : resource.company_id;
        const owner = ref.table === 'companies' ? resource : await lookup('companies', companyId);

        // A body/query ID selects a resource; it never proves membership.
        // Conflicting company IDs are rejected, not used to move/re-parent a resource.
        for (const claimedId of [req.body?.companyId, req.body?.company_id, req.query?.companyId, req.query?.company_id]) {
          if (claimedId !== undefined && claimedId !== companyId) throw failure(403, 'Empresa no autorizada');
        }

        let role = owner.user_id === user.id ? 'owner' : null;
        if (!role) {
          const { data: member, error } = await supabase.from('company_members')
            .select('role, joined_at').eq('company_id', companyId).eq('user_id', user.id).maybeSingle();
          if (error) throw failure(503, 'No se pudo verificar la membresía');
          if (member?.joined_at && ['admin', 'member', 'viewer'].includes(member.role)) role = member.role;
        }

        let assignedRequest = ref.table === 'company_requests' ? resource : null;
        if (ref.table === 'company_budgets' && resource.request_id) {
          assignedRequest = await lookup('company_requests', resource.request_id);
          if (assignedRequest.company_id !== companyId) throw failure(403, 'Solicitud de otra empresa');
        }
        // Assignment is a resource-scoped professional relationship, not access to the whole company.
        if (assignedRequest?.lawyer_id === user.id && (!role || policy.action === 'respond')) role = 'assigned_lawyer';
        if (!role || !allowedRoles[policy.action].includes(role)) throw failure(403, 'Permisos insuficientes para esta empresa');

        for (const related of policy.related || []) {
          const id = req[related.location]?.[related.key];
          if (related.optional && (id === undefined || id === null || id === '')) continue;
          const row = await lookup(related.table, id);
          if (row.company_id !== companyId) throw failure(403, 'Recurso relacionado de otra empresa');
        }

        req.companyAuthorization = { userId: user.id, companyId, role, resource, assignedRequest };
        return next();
      } catch (error) {
        return res.status(error.status || 503).json({ error: error.status ? error.message : 'No se pudo verificar el acceso' });
      }
    };
  }
  return { forRoute };
}
