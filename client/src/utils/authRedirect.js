import { ROUTES, ROLES } from '../constants';

export const ROLE_HOME = {
  [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.INSTRUCTOR]: ROUTES.INSTRUCTOR_DASHBOARD,
  [ROLES.STUDENT]: ROUTES.STUDENT_DASHBOARD,
};

export const ROLE_PORTAL_PREFIX = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.INSTRUCTOR]: '/instructor',
  [ROLES.STUDENT]: '/student',
};

export const getRoleHomePath = (role) => ROLE_HOME[role] || ROUTES.HOME;

export const getRolePortalPrefix = (role) => ROLE_PORTAL_PREFIX[role] || null;

/** Only honor deep-link redirects within the user's own portal namespace. */
export const getPostLoginPath = (role, fromPath) => {
  const home = getRoleHomePath(role);
  const portalPrefix = getRolePortalPrefix(role);

  if (!fromPath || !portalPrefix) return home;
  if (fromPath.startsWith(portalPrefix)) return fromPath;

  return home;
};
