import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// This component handles the URL parsing and redirection for lawyer profiles
export default function RouteHandler({ children }: { children: React.ReactNode }) {
  const { path } = useParams<{ path: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!path) return;

    // Extract the UUID from the path (should be the last part after the last hyphen)
    const parts = path.split('-');
    const possibleUuid = parts[parts.length - 1];

    // Check if the last part looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(possibleUuid)) {
      // If the current URL doesn't end with the UUID, redirect to the canonical URL
      if (!location.pathname.endsWith(possibleUuid)) {
        const canonicalPath = `/abogado/${path}`;
        navigate(canonicalPath, { replace: true });
      }
    }
  }, [path, navigate, location.pathname]);

  return <>{children}</>;
}
