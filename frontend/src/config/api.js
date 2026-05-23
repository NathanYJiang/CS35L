/**
 * Centralized API configuration.
 *
 * All fetch() calls import BASE_URL from here so the hostname/port is
 * defined in exactly one place.  Changing it (e.g. for staging/production)
 * only ever requires editing this file — a classic "single point of truth"
 * complexity-management technique.
 */

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const API = {
  groups:   `${BASE_URL}/api/groups`,
  users:    `${BASE_URL}/api/users`,
  // Convenience helpers for parameterised URLs
  group:    (id)              => `${BASE_URL}/api/groups/${id}`,
  members:  (id)              => `${BASE_URL}/api/groups/${id}/members`,
  expenses: (id)              => `${BASE_URL}/api/groups/${id}/expenses`,
  expense:  (gid, eid)        => `${BASE_URL}/api/groups/${gid}/expenses/${eid}`,
  userSearch: (q)             => `${BASE_URL}/api/users/search?query=${encodeURIComponent(q)}`,
};
