import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Toaster } from '@renderer/components/ui/toaster'
import { useToast } from '@renderer/components/ui/use-toast'
import { Button } from '@renderer/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'

let isFirstTime = true
function App(): JSX.Element {
  const [qr, setQr] = useState<string>()
  const [isAuth, setIsAuth] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const [dataPath, setDataPath] = useState<string>()
  const [preview, setPreview] = useState<Record<string, string | number>>()

  const form: MutableRefObject<HTMLFormElement | null> = useRef(null)

  const { toast } = useToast()

  useEffect(() => {
    if (!dataPath || dataPath === '') return setPreview({})
    window.api.sheetPreview(dataPath).then((preview) => {
      if (!preview) return
      setPreview(preview)
    })
  }, [dataPath])

  useEffect(() => {
    if (!isFirstTime) return
    isFirstTime = false
    window.api.onQr((qr: string) => {
      setQr(qr)
    })
    window.api.onAuthFailure((message: string) => {
      toast({ title: 'Error de autenticación', description: message, variant: 'destructive' })
    })
    window.api.onError((error: string) => {
      toast({ title: 'Error', description: error, variant: 'destructive' })
    })
    window.api.onAuthenticated(() => {
      setIsAuth(true)
    })
    window.api.onReady(() => {
      setIsReady(true)
    })
    window.api.onLoading((percent, loadingMessage) => {
      toast({
        title: 'Progreso',
        description: `${percent}% ${loadingMessage}`
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
            <form
              className="my-2 flex h-2/3 w-2/3 flex-col items-center space-y-2"
              onSubmit={async (event) => {
                event.preventDefault()
                //TODO: what is the default value for an emtpy textarea?
                // @ts-ignore Typescript doesn't know about input types
                const { message } = event.currentTarget.elements
                if (!dataPath) throw new Error('There is no data_path')
                const ok = await window.api.sendTemplate(message.value, dataPath)
                if (!ok) throw new Error('There was an error sending the template')
                if (form.current) form.current.reset()
              }}
              ref={form}
            >
              <div className="flex w-full flex-col space-y-4 border p-2">
                <div className="w-full text-center">
                  <div className="w-full text-center font-bold">Archivo:</div>
                  <div>{dataPath}</div>
                </div>

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

                <div className="flex flex-row justify-center space-x-2">
                  <Button
                    type="button"
                    onClick={async () => {
                      const path = await window.api.sheetRead()
                      if (!path) return
                      setDataPath(path)
                    }}
                  >
                    Leer archivo
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      setDataPath('')
                    }}
                  >
                    Cerrar archivo
                  </Button>
                </div>
              </div>
              <label htmlFor="message" className="w-full">
                Plantilla:
              </label>
              <textarea
                id="message"
                className="h-2/3 w-full border"
                placeholder="Hola, {{nombre}}"
                required={true}
              ></textarea>
              <Button type="submit" disabled={!dataPath}>
                Enviar
              </Button>
            </form>

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
            <QRCodeSVG value={qr} level="L" size={500} />
          </div>
        )}
      </div>
      <Toaster />
    </>
  )
}

export default App
