import React from 'react';
import { useRecoilValue } from 'recoil';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { authState } from 'store';

interface ProtectedRouteProps {
  isRegisteredGuard?: boolean;
  redirectTo?: string;
  inverse?: boolean;
}

const UNPROTECTED_ROUTES = new Map<string, string>([
  ['home', '/'],
  ['searchPage', '/search'],
  ['register', '/registration-form'],
  ['resetPassword', '/reset-password'],
  ['waitlist', '/join-waitlist'],
]);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isRegisteredGuard = false,
  redirectTo,
  inverse = false,
}) => {
  const [searchParams] = useSearchParams();
  const auth = useRecoilValue(authState);

  console.log('ProtectedRoute Auth State:', auth);

  // If not inverse and not logged in, redirect to auth or unprotected route
  if (!inverse && !auth.isLoggedIn) {
    const redirectParam = searchParams.get('redirect');
    if (redirectParam && UNPROTECTED_ROUTES.get(redirectParam)) {
      return <Navigate to={UNPROTECTED_ROUTES.get(redirectParam)!} />;
    }
    return <Navigate to={redirectTo ?? '/auth'} />;
  }

  // For routes requiring full registration and verification
  if (isRegisteredGuard) {
    if (!auth.user?.signup_completed) {
      return <Navigate to="/registration-form" />;
    }
    if (!auth.user?.verified) {
      return <Navigate to="/email-verification" state={{ email: auth.user?.email }} />;
    }
    return <Outlet />;
  }

  // Inverse case: redirect logged-in users away from unprotected routes
  if (inverse) {
    if (auth.isLoggedIn && auth.user?.signup_completed && auth.user?.verified) {
      return <Navigate to={redirectTo ?? '/dashboard'} />;
    }
    return <Outlet />;
  }

  // Default case: allow access if logged in
  return <Outlet />;
};

export default ProtectedRoute;