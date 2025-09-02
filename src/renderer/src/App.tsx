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

const templateSchema = z.object({
  template: z.string().min(1),
  media: z.string(),
  data: z.string().min(1)
})

type TemplateSchema = z.infer<typeof templateSchema>

function TemplateForm() {
  const [preview, setPreview] = useState<Record<string, string | number>>()

  const form = useForm<TemplateSchema>({
    resolver: zodResolver(templateSchema) as Resolver<TemplateSchema>,
    defaultValues: {
      template: '',
      data: '',
      media: ''
    }
  })

  async function onSubmit(values: TemplateSchema) {
    const { template, data, media } = values
    const ok = await window.api.sendTemplate(template, data, media)
    if (!ok) throw new Error('There was an error sending the template')
    form.reset()
  }

  const data = form.watch('data')
  useEffect(() => {
    if (!data || data === '') return setPreview({})
    window.api.sheetPreview(data).then((preview) => {
      if (!preview) return
      setPreview(preview)
    })
  }, [data])
  const media = form.watch('media')

  return (
    <Form {...form}>
      <form
        className="my-2 flex h-full w-2/3 flex-col items-center space-y-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="data"
          render={({ field }) => (
            <FormItem className="h-fit w-full">
              <FormLabel>Datos:</FormLabel>
              <FormControl>
                <div className="space-y-2 space-x-2">
                  <span>{data == '' ? 'Ningún archivo seleccionado' : data}</span>
                  <Button
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
                    variant="secondary"
                    type="button"
                    onClick={async () => {
                      form.setValue('data', '')
                    }}
                  >
                    Cerrar archivo
                  </Button>

                  <Table>
                    <TableCaption>Valores encontrados en la primera columna</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="border">Encabezados</TableHead>
                        <TableHead className="border">Valores</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview &&
                        Object.entries(preview).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell className="border">{key}</TableCell>
                            <TableCell className="border">{value}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </FormControl>
              <FormDescription>Datos para la plantilla</FormDescription>
            </FormItem>
          )}
        />

        <div className="flex w-full flex-row space-x-2">
          <FormField
            control={form.control}
            name="template"
            render={({ field }) => (
              <FormItem className="h-fit w-full">
                <FormLabel>Plantilla:</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Hola, {{nombre}}"
                    {...field}
                    className="h-96 resize-none border"
                    required
                  ></Textarea>
                </FormControl>
                <FormDescription>Plantilla del mensaje a enviar</FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="media"
            render={({ field }) => (
              <FormItem className="h-fit w-full">
                <FormLabel>Multimedia:</FormLabel>
                <FormControl>
                  <div className="space-y-2 space-x-2">
                    <div>{media == '' ? 'Ningún archivo seleccionado' : media}</div>
                    <Button
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
                      variant="secondary"
                      type="button"
                      onClick={async () => {
                        form.setValue('media', '')
                      }}
                    >
                      Cerrar archivo
                    </Button>
                    {!!media && (
                      <>
                        {/jpeg$|jgp$|png$|webm$/.test(media) && (
                          <img className="max-h-64" src={`media://${encodeURIComponent(media)}`} />
                        )}
                        {/mp4$|avi$|3gp$|wmv$|mov$|mkv$/.test(media) && (
                          <video className="max-h-64" controls>
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

        <Button type="submit">Enviar</Button>
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

let isFirstTime = true
function App(): React.ReactNode {
  const [qr, setQr] = useState<string>()
  const [isAuth, setIsAuth] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isFirstTime) return
    isFirstTime = false
    window.api.onQr((qr: string) => {
      setQr(qr)
    })
    window.api.onAuthFailure((message: string) => {
      toast.error('Error de autenticación', { description: message })
    })
    window.api.onError((error: string) => {
      toast.error('Error', { description: error })
    })
    window.api.onAuthenticated(() => {
      setIsAuth(true)
    })
    window.api.onReady(() => {
      setIsReady(true)
    })
    window.api.onLoading((percent, loadingMessage) => {
      toast('Progreso', {
        id: 'progress',
        description: `${percent}% ${loadingMessage}`
      })
    })
    window.api.onTemplateProgress((id, current, total) => {
      toast('Enviar progreso', {
        id: 'sending-progress',
        description: `id: ${id} ${current}/${total}`
      })
    })
  }, [])

  return (
    <>
      <div className="flex h-screen flex-col items-center justify-center">
        {!isReady && (
          <div className="mt-2 w-full self-center text-center text-4xl">
            Iniciando WhatsApp. Espere
          </div>
        )}
        {isAuth && (
          <div className="flex h-full w-full flex-col items-center">
            <Tabs className="mt-2 flex h-fit w-full flex-col items-center" defaultValue="template">
              <TabsList>
                <TabsTrigger value="template">Enviar plantilla</TabsTrigger>
                <TabsTrigger value="configuration">Configuración</TabsTrigger>
                <TabsTrigger value="errors">Errores</TabsTrigger>
              </TabsList>
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
            <Button
              variant="destructive"
              onClick={() => {
                window.api.logout()
                setIsAuth(false)
                setIsReady(false)
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        )}

        {!isAuth && qr && (
          <div className="flex flex-col items-center">
            <div className="mb-10 text-2xl">
              Vincule su cuenta de WhatsApp utilizando el siguiente código QR:
            </div>
            <QRCodeSVG value={qr} level="L" className="h-64 w-64 lg:h-96 lg:w-96" />
          </div>
        )}
      </div>
      <Toaster />
    </>
  )
}

export default App
