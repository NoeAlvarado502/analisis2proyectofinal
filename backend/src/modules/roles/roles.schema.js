import { z } from 'zod';

export const updateRolPermisosSchema = z.object({
  permisos: z.array(z.string().min(1), {
    required_error: 'La lista de permisos es obligatoria'
  })
});
