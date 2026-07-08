import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleHomePath, getRolePortalPrefix } from '../../utils/authRedirect';

/**
 * After a fresh login, ensure the user lands on their primary portal.
 * Prevents stale /instructor URLs from showing the wrong portal after account switches.
 */
const AuthPortalGuard = () => {
  const { user, loading, postLoginRole, clearPostLoginRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !postLoginRole) return;

    const portalPrefix = getRolePortalPrefix(user.role);
    const home = getRoleHomePath(user.role);

    if (portalPrefix && !location.pathname.startsWith(portalPrefix)) {
      navigate(home, { replace: true });
    }

    clearPostLoginRole();
  }, [user, loading, postLoginRole, location.pathname, navigate, clearPostLoginRole]);

  return null;
};

export default AuthPortalGuard;
