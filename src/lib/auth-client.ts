import { createAuthClient } from 'better-auth/react';

// No baseURL: better-auth uses window.location.origin automatically in the browser,
// avoiding cross-domain cookie/CORS issues on any deployment domain.
export const authClient = createAuthClient();
