import { createAuthClient } from 'better-auth/react';

// En navigateur, utiliser window.location.origin pour que l'auth client
// pointe toujours vers le même domaine que la page (évite les erreurs CORS
// et les problèmes de cookie en production).
// En SSR (server), utiliser la variable d'env.
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
