import { z } from 'zod'

//TODO: config option for prefixing 593
export const configSchema = z.object({
  send_time: z
    .object({
      min: z.coerce
        .number({ message: '"Mínimo" debe de ser un número' })
        .int({ message: '"Mínimo" debe de ser un número entero' })
        .min(0, { message: '"Mínimo" debe de ser un número positivo' })
        .safe({ message: '"Mínimo" debe de ser un número seguro' }),
      max: z.coerce
        .number({ message: '"Máximo" debe de ser un número' })
        .int({ message: '"Máximo" debe de ser un número entero' })
        .min(0, { message: '"Máximo" debe de ser un número positivo' })
        .safe({ message: '"Máximo" debe de ser un número seguro' })
    })
    .refine((send_time) => send_time.min < send_time.max, {
      message: '"Mínimo" debe ser menor a "Máximo"'
    }),
  telf_col: z.string().min(1, { message: '"Columna teléfono" debe de tener al menos un caracter' })
})
export type Config = z.infer<typeof configSchema>
