import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

let isFirstTime = true
function App(): JSX.Element {
  const [qr, setQr] = useState<string>()
  const [error, setError] = useState<string>()
  const [isAuth, setIsAuth] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const [percent, setPercent] = useState<string>()
  const [loadingMessage, setLoadingMessage] = useState<string>()

  const [dataPath, setDataPath] = useState<string>()

  const form: MutableRefObject<HTMLFormElement | null> = useRef(null)

  useEffect(() => {
    if (!isFirstTime) return
    isFirstTime = false
    window.api.onQr((qr: string) => {
      setQr(qr)
    })
    window.api.onAuthFailure((message: string) => {
      setError(message)
    })
    window.api.onAuthenticated(() => {
      setIsAuth(true)
    })
    window.api.onReady(() => {
      setIsReady(true)
    })
    window.api.onLoading((percent, loadingMessage) => {
      setPercent(percent)
      setLoadingMessage(loadingMessage)
    })
  }, [])

  return (
    <>
      {!isReady && (
        <div className="mt-2 w-full self-center text-center text-4xl">
          Iniciando WhatsApp. Espere
        </div>
      )}
      <div className="flex h-screen flex-col items-center justify-center">
        {!!percent && (
          <div>
            {percent}% {loadingMessage}
          </div>
        )}

        {isAuth && (
          <div className="flex h-full w-full flex-col items-center">
            <form
              className="flex h-2/3 w-2/3 flex-col items-center space-y-2"
              onSubmit={async (event) => {
                event.preventDefault()
                // @ts-ignore Typescript doesn't know about input types
                const { message } = event.currentTarget.elements
                if (!dataPath) throw new Error('There is no data_path')
                const ok = await window.api.sendTemplate(message.value, dataPath)
                if (!ok) throw new Error('There was an error sending the template')
                if (form.current) form.current.reset()
              }}
              ref={form}
            >
              <span className="w-full">Archivo: {dataPath ?? '  '}</span>
              <button
                type="button"
                className="rounded border p-4 hover:bg-gray-200"
                onClick={async () => {
                  const path = await window.api.readFile()
                  if (!path) return
                  setDataPath(path)
                }}
              >
                Leer archivo
              </button>
              <label htmlFor="message" className="w-full">
                Plantilla:
              </label>
              <textarea id="message" className="h-2/3 w-full border"></textarea>
              <input
                type="submit"
                value="Enviar"
                className="rounded border bg-green-400 p-4 hover:cursor-pointer disabled:bg-green-200 disabled:text-gray-400"
                disabled={!dataPath}
              />
            </form>

            <button
              className="mt-2 rounded bg-red-400 p-4 hover:bg-red-600"
              onClick={() => {
                window.api.logout()
                setIsAuth(false)
                setIsReady(false)
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {error && <div>{error}</div>}
        {!isAuth && qr && (
          <div className="flex flex-col items-center">
            <div className="mb-10 text-2xl">
              Vincule su cuenta de WhatsApp utilizando el siguiente código QR:
            </div>
            <QRCodeSVG value={qr} level="L" size={500} />
          </div>
        )}
      </div>
    </>
  )
}

export default App
