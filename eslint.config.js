import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  
  // Configuración general (Frontend)
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser, // Define globales del navegador (window, document, etc.)
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // === AGREGA ESTO AL FINAL ===
  // Configuración específica para Backend (API/Node)
  {
    files: ['api/**/*.js'], // Solo aplica a archivos dentro de 'api'
    languageOptions: {
      globals: globals.node, // Habilita 'process', 'Buffer', 'require', etc.
    },
  },
])