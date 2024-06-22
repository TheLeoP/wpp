import { z } from 'zod'

//TODO: config option for prefixing 593
export const configSchema = z.object({
  send_time: z.object({
    min: z.coerce.number().int().min(0).safe(),
    max: z.coerce.number().int().min(1).safe()
  }),
  telf_col: z.string().min(1)
})
export type Config = z.infer<typeof configSchema>
