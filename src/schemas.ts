import { z } from 'zod'

export const configSchema = z.object({
  send_time: z
    .object({
      min: z.coerce
        .number({ message: '"Mínimo" debe de ser un número' })
        .int({ message: '"Mínimo" debe de ser un número entero' })
        .min(0, { message: '"Mínimo" debe de ser un número positivo' }),
      max: z.coerce
        .number({ message: '"Máximo" debe de ser un número' })
        .int({ message: '"Máximo" debe de ser un número entero' })
        .min(0, { message: '"Máximo" debe de ser un número positivo' })
    })
    .refine((send_time) => send_time.min < send_time.max, {
      message: '"Mínimo" debe ser menor a "Máximo"'
    }),
  telf_col: z.string().min(1, { message: '"Columna teléfono" debe de tener al menos un caracter' }),
  prepend_593: z.boolean().default(true)
})
export type Config = z.infer<typeof configSchema>
