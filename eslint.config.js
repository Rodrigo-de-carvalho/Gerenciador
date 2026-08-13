import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Funções serverless (Vercel) rodam em Node, não no navegador.
    files: ['api/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Contextos e i18n exportam provider + hook no mesmo arquivo de propósito
    // (padrão do projeto); o aviso de Fast Refresh não se aplica aqui.
    files: ['src/context/**/*.jsx', 'src/i18n/**/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
