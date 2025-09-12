import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Toaster } from '@renderer/components/ui/sonner'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { Checkbox } from '@renderer/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Textarea } from '@renderer/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'

import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import type { Config } from '../../schemas'
import { configSchema } from '../../schemas'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const templateSchema = z.object({
  template: z.string().min(1),
  media: z.string(),
  data: z.string().min(1)
})

type TemplateSchema = z.infer<typeof templateSchema>

function TemplateForm() {
  const form = useForm<TemplateSchema>({
    resolver: zodResolver(templateSchema) as Resolver<TemplateSchema>,
    defaultValues: {
      template: '',
      data: '',
      media: ''
    }
  })
  const queryClient = useQueryClient()

  const data = form.watch('data')
  const { data: dataPreview } = useQuery({
    queryKey: ['sheetPreview'],
    queryFn: async () => {
      return await window.api.sheetPreview(data)
    },
    enabled: !!data
  })
  useEffect(() => {
    if (data) return

    queryClient.setQueryData(['sheetPreview'], () => null)
  }, [data])

  const template = form.watch('template')
  const { data: templatePreview } = useQuery({
    queryKey: ['templatePreview', template, dataPreview],
    queryFn: async () => {
      if (!dataPreview) return

      return await window.api.templatePreview(template, dataPreview)
    },
    enabled: !!template && !!dataPreview
  })
  const media = form.watch('media')

  return (
    <Form {...form}>
      <form
        className="my-2 flex h-full w-full flex-col space-y-2 p-1"
        onSubmit={form.handleSubmit(async ({ template, data, media }: TemplateSchema) => {
          const ok = await window.api.sendTemplate(template, data, media)
          if (!ok) throw new Error('There was an error sending the template')
          form.reset()
        })}
      >
        <div className="flex space-x-2">
          <div className="flex max-w-1/2 grow flex-col gap-2">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Datos:</FormLabel>
                  <FormControl>
                    <div className="flex h-109 flex-col space-y-2">
                      <div className="flex space-x-2">
                        <div className="grow truncate">{data || 'Ningún archivo seleccionado'}</div>
                        <Button
                          className="grow"
                          type="button"
                          onClick={async () => {
                            const path = await window.api.sheetRead()
                            if (!path) return
                            form.setValue('data', path)
                          }}
                          {...field}
                        >
                          Leer archivo
                        </Button>
                        <Button
                          className="grow"
                          variant="secondary"
                          type="button"
                          onClick={async () => {
                            form.setValue('data', '')
                          }}
                        >
                          Cerrar archivo
                        </Button>
                      </div>

                      <Table>
                        <TableCaption>Valores encontrados en la primera columna</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/3 border">Encabezados</TableHead>
                            <TableHead className="w-2/3 border">Valores</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dataPreview &&
                            Object.entries(dataPreview).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell className="border">{key}</TableCell>
                                <TableCell className="border">{value}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="font-medium">
              Enviar
            </Button>
          </div>

          <div className="flex max-w-1/2 grow flex-col">
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem className="flex grow flex-col">
                  <FormLabel>Plantilla:</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hola, {{nombre}}"
                      {...field}
                      className="h-44 resize-none border"
                      required
                    ></Textarea>
                  </FormControl>
                  <FormDescription>Plantilla del mensaje a enviar</FormDescription>

                  <div className="text-sm font-medium">Vista previa:</div>
                  <div className="h-44 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    {templatePreview}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="media"
              render={({ field }) => (
                <FormItem className="flex h-64 grow flex-col pt-2">
                  <FormLabel>Multimedia:</FormLabel>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <div className="grow truncate">
                          {media || 'Ningún archivo seleccionado'}
                        </div>
                        <Button
                          className="grow"
                          type="button"
                          onClick={async () => {
                            const path = await window.api.imageRead()
                            if (!path) return
                            form.setValue('media', path)
                          }}
                          {...field}
                        >
                          Leer archivo
                        </Button>
                        <Button
                          className="grow"
                          variant="secondary"
                          type="button"
                          onClick={async () => {
                            form.setValue('media', '')
                          }}
                        >
                          Cerrar archivo
                        </Button>
                      </div>

                      {!!media && (
                        <>
                          {/jpeg$|jpg$|png$|webm$/.test(media) && (
                            <img
                              className="max-h-64 max-w-64"
                              src={`media://${encodeURIComponent(media)}`}
                            />
                          )}
                          {/mp4$|avi$|3gp$|wmv$|mov$|mkv$/.test(media) && (
                            <video className="max-h-64 max-w-64" controls>
                              <source src={`media://${encodeURIComponent(media)}`} />
                            </video>
                          )}
                        </>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Archivo multimedia a enviar con el mensaje</FormDescription>
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  )
}

function Configuration() {
  const form = useForm<Config>({
    resolver: zodResolver(configSchema) as Resolver<Config>,
    defaultValues: {
      send_time: {
        min: 0,
        max: 1000
      },
      telf_col: 'telf',
      prepend_593: true
    }
  })
  const errors = form.formState.errors

  async function onSubmit(config: Config) {
    const maybe_err = await window.api.configSet(config)
    if (maybe_err) throw maybe_err
    toast('Configuración', { description: 'La configuración fue modificada exitosamente' })
  }

  useEffect(() => {
    window.api.configGet().then((config) => {
      form.reset(config)
    })
  }, [])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="m-2">
        <FormField
          control={form.control}
          name="send_time.min"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mínimo (ms):</FormLabel>
              <FormControl>
                <Input type="number" {...field}></Input>
              </FormControl>
              {errors.send_time?.min && <FormMessage>{errors.send_time.min.message}</FormMessage>}
            </FormItem>
          )}
        ></FormField>
        <FormField
          control={form.control}
          name="send_time.max"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Máximo (ms):</FormLabel>
              <FormControl>
                <Input type="number" {...field}></Input>
              </FormControl>
              {errors.send_time?.max && <FormMessage>{errors.send_time.max.message}</FormMessage>}
            </FormItem>
          )}
        ></FormField>
        {errors.send_time?.root && <FormMessage>{errors.send_time.root.message}</FormMessage>}
        <FormDescription>
          Rango aleatorio de tiempo a esperar entre mensajes (por defecto, entre 0 y 1 segundos)
        </FormDescription>

        <FormField
          control={form.control}
          name="telf_col"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Columna teléfono:</FormLabel>
              <FormControl>
                <Input type="tel" {...field}></Input>
              </FormControl>
              <FormDescription>
                Nombre de la columna en el archivo de Excel que contiene el número de teléfono de
                los contactos
              </FormDescription>
              {errors.telf_col && <FormMessage>{errors.telf_col.message}</FormMessage>}
            </FormItem>
          )}
        ></FormField>

        <FormField
          control={form.control}
          name="prepend_593"
          render={({ field }) => (
            <FormItem>
              <FormLabel>¿Usar prefijo 593?:</FormLabel>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormDescription>
                ¿Usar prefixo 593 antes de un número de teléfono si este consta de 9 dígitos?
              </FormDescription>
              {errors.prepend_593 && <FormMessage>{errors.prepend_593.message}</FormMessage>}
            </FormItem>
          )}
        ></FormField>

        <div className="mt-2 flex flex-row space-x-2">
          <Button type="submit">Guardar</Button>
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              const config = await window.api.configGet()
              form.reset(config)
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  )
}

function Errors() {
  const [telfs, setTelfs] = useState<string[]>()
  useEffect(() => {
    window.api.errorTelfsGet().then((telfs) => setTelfs(telfs))
  }, [])
  return (
    <div className="h-96 overflow-y-auto">
      <ul>{telfs && telfs.map((telf, i) => <li key={i}>{telf}</li>)}</ul>
    </div>
  )
}

function App(): React.ReactNode {
  const queryClient = useQueryClient()
  const { data: qr } = useQuery({
    queryKey: ['qr'],
    queryFn: async () => {
      return await window.api.qrGet()
    }
  })
  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: async () => {
      return await window.api.isAuthenticatedGet()
    }
  })
  const { data: clientInfo } = useQuery({
    queryKey: ['clientInfo'],
    queryFn: async () => {
      return await window.api.clientInfoGet()
    }
  })
  const { data: profilePicUrl } = useQuery({
    queryKey: ['profilePicUrl'],
    queryFn: async () => {
      if (!clientInfo) return

      return await window.api.profilePicUrlGet(clientInfo.wid.user)
    },
    enabled: !!clientInfo
  })

  useEffect(() => {
    const offQr = window.api.onQr(async (qr) => {
      await queryClient.cancelQueries({ queryKey: ['qr'] })
      queryClient.setQueryData(['qr'], () => qr)
    })
    const offAuthFailure = window.api.onAuthFailure((message: string) => {
      toast.error('Error de autenticación', { description: message })
    })
    const offError = window.api.onError((error) => {
      toast.error('Error', { description: error })
    })
    const offAuthenticated = window.api.onAuthenticated(async (isAuthenticated) => {
      await queryClient.cancelQueries({ queryKey: ['isAuthenticated'] })
      queryClient.setQueryData(['isAuthenticated'], () => isAuthenticated)
    })
    const offReady = window.api.onReady(async (info) => {
      await queryClient.cancelQueries({ queryKey: ['clientInfo'] })
      queryClient.setQueryData(['clientInfo'], () => info)
    })
    const offLoading = window.api.onLoading((percent, loadingMessage) => {
      toast('Progreso', {
        id: 'progress',
        description: `${percent}% ${loadingMessage}`
      })
    })
    const offTemplateProgress = window.api.onTemplateProgress((id, current, total) => {
      toast('Enviar progreso', {
        id: 'sending-progress',
        description: `id: ${id} ${current}/${total}`
      })
    })

    return () => {
      offQr()
      offAuthFailure()
      offError()
      offAuthenticated()
      offReady()
      offLoading()
      offTemplateProgress()
    }
  }, [])

  return (
    <>
      <div className="flex h-screen flex-col items-center justify-center">
        {!clientInfo && (
          <div className="mt-2 w-full self-center text-center text-4xl">
            Iniciando WhatsApp. Espere
          </div>
        )}

        {clientInfo && isAuthenticated && (
          <div className="h-full w-full">
            <Tabs className="mt-2 flex w-full flex-col items-center" defaultValue="template">
              <div className="flex w-full max-w-9/10 items-center justify-between">
                <div className="flex h-16">
                  <div className="overflow-hidden rounded-full">
                    {profilePicUrl ? (
                      <img className="h-16" src={profilePicUrl} />
                    ) : (
                      <div className="flex size-16 items-center justify-center bg-slate-200 text-xl font-bold">
                        {clientInfo.pushname[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center ps-2">
                    <div>
                      <span className="font-bold">Nombre</span>: {clientInfo.pushname}
                    </div>
                    <div>
                      <span className="font-bold">Teléfono</span>: {clientInfo.wid.user}
                    </div>
                  </div>
                </div>

                <TabsList>
                  <TabsTrigger value="template">Enviar plantilla</TabsTrigger>
                  <TabsTrigger value="configuration">Configuración</TabsTrigger>
                  <TabsTrigger value="errors">Errores</TabsTrigger>
                </TabsList>

                <Button
                  variant="destructive"
                  onClick={() => {
                    window.api.logout()
                  }}
                >
                  Cerrar sesión
                </Button>
              </div>

              <TabsContent
                value="template"
                className="flex h-full w-full flex-col items-center justify-center"
              >
                <TemplateForm />
              </TabsContent>
              <TabsContent value="configuration">
                <Configuration />
              </TabsContent>
              <TabsContent value="errors">
                <Errors />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!isAuthenticated && qr && (
          <div className="flex flex-col items-center">
            <div className="mb-10 text-2xl">
              Vincule su cuenta de WhatsApp utilizando el siguiente código QR:
            </div>
            <QRCodeSVG value={qr} level="L" className="size-64 lg:size-96" />
          </div>
        )}
      </div>
      <Toaster />
    </>
  )
}

export default App
