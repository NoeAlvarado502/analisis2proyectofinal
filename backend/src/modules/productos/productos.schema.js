import { z } from 'zod';

const NIVELES_PERMITIDOS = [1, 3, 6, 12, 25, 50, 100, 500, 1000, 10000];

export const escalaItemSchema = z.object({
  cantidad_minima: z.coerce.number().int().refine(
    val => NIVELES_PERMITIDOS.includes(val),
    { message: 'El nivel de cantidad mínima debe ser uno de: 1, 3, 6, 12, 25, 50, 100, 500, 1000 o 10000' }
  ),
  precio_unitario: z.coerce.number().positive('El precio unitario debe ser mayor a 0')
});

const validateEscalasArray = (escalas) => {
  // 1. Nivel 1 obligatorio (menudeo)
  const tieneNivel1 = escalas.some(e => e.cantidad_minima === 1);
  if (!tieneNivel1) {
    return false;
  }

  // 2. Sin niveles duplicados
  const niveles = escalas.map(e => e.cantidad_minima);
  const nivelesUnicos = new Set(niveles);
  if (niveles.length !== nivelesUnicos.size) {
    return false;
  }

  // 3. Monotonía decreciente: al ordenar por cantidad ascendente, el precio unitario no puede subir
  const ordenados = [...escalas].sort((a, b) => a.cantidad_minima - b.cantidad_minima);
  for (let i = 0; i < ordenados.length - 1; i++) {
    if (ordenados[i + 1].precio_unitario > ordenados[i].precio_unitario) {
      return false;
    }
  }

  return true;
};

export const createProductoSchema = z.object({
  codigo_sku: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform(val => (val && val.length > 0 ? val.toUpperCase() : undefined)),
  nombre: z.string().trim().min(2, 'El nombre es obligatorio').max(150),
  descripcion: z.string().nullish().transform(val => val?.trim() || null),
  id_categoria: z.coerce.number().int().positive('La categoría es obligatoria'),
  id_marca: z.coerce.number().int().positive().nullish().transform(val => val || null),
  edad_minima_meses: z.coerce.number().int().min(0).nullish().transform(val => (val !== undefined && val !== null ? val : 36)),
  advertencia_seguridad: z.string().nullish().transform(val => val?.trim() || null),
  stock_minimo: z.coerce.number().int().min(0).default(5),
  escalas: z
    .array(escalaItemSchema)
    .min(1, 'Debe especificar al menos la escala de menudeo (cantidad 1)')
    .refine(
      escalas => escalas.some(e => e.cantidad_minima === 1),
      { message: 'El nivel 1 es obligatorio (precio de menudeo)' }
    )
    .refine(
      validateEscalasArray,
      { message: 'El precio de un nivel mayor no puede superar al de un nivel menor o hay niveles duplicados' }
    )
});

export const updateProductoSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio').max(150),
  descripcion: z.string().nullish().transform(val => val?.trim() || null),
  id_categoria: z.coerce.number().int().positive('La categoría es obligatoria'),
  id_marca: z.coerce.number().int().positive().nullish().transform(val => val || null),
  edad_minima_meses: z.coerce.number().int().min(0).nullish().transform(val => (val !== undefined && val !== null ? val : 36)),
  advertencia_seguridad: z.string().nullish().transform(val => val?.trim() || null),
  stock_minimo: z.coerce.number().int().min(0).default(5),
  escalas: z
    .array(escalaItemSchema)
    .min(1, 'Debe especificar al menos la escala de menudeo (cantidad 1)')
    .refine(
      escalas => escalas.some(e => e.cantidad_minima === 1),
      { message: 'El nivel 1 es obligatorio (precio de menudeo)' }
    )
    .refine(
      validateEscalasArray,
      { message: 'El precio de un nivel mayor no puede superar al de un nivel menor o hay niveles duplicados' }
    )
});

export const updateEstadoProductoSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' })
});

export const createCategoriaSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre de categoría es obligatorio').max(80),
  descripcion: z.string().nullish().transform(val => val?.trim() || null)
});

export const createMarcaSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre de marca es obligatorio').max(100)
});
