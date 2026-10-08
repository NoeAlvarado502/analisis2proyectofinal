import React from 'react';
import { useAuth } from '../auth/AuthContext';

export default function PermissionGate({ permission, children, fallback = null }) {
  const { can } = useAuth();

  if (!permission || can(permission)) {
    return <>{children}</>;
  }

  return fallback;
}
