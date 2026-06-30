import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sendWelcomeEmail } from './email';

// Only set baseURL if explicitly configured — avoids http://localhost:3000 fallback
// in production which would cause wrong cookie names/Secure attributes.
// better-auth auto-detects the URL from requests when baseURL is not set.
const appURL = process.env.BETTER_AUTH_URL || undefined;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  ...(appURL ? { baseURL: appURL } : {}),
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://sonelyx.fr',
    'http://www.sonelyx.fr',
    'https://sonelyx.fr',
    'https://www.sonelyx.fr',
  ],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await sendWelcomeEmail(user.email, user.name);
          } catch (e) {
            console.error('Error sending welcome email:', e);
          }
        },
      },
    },
  },
});
