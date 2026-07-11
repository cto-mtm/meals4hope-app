import { z } from 'zod'

/** POST /users — create an M4H member (admin only).
 * Password is optional: members without one sign in with Google
 * (same email → same uid via Firebase's one-account-per-email). */
export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'member']),
})
export type CreateUserInput = z.infer<typeof createUserSchema>

/** PATCH /users/:uid — update role and/or active flag (admin only). */
export const updateUserSchema = z
  .object({
    role: z.enum(['admin', 'member']).optional(),
    activo: z.boolean().optional(),
    name: z.string().min(1).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'empty update' })
export type UpdateUserInput = z.infer<typeof updateUserSchema>
