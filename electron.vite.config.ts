import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, './src/renderer/src')
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, './src/renderer/src')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, './src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
