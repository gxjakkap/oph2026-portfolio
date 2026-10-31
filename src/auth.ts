import { createAuthClient } from 'better-auth/react'

// same origin; better-auth's handler lives at /api/auth/* in the Worker
export const authClient = createAuthClient()
