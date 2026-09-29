// eslint-config-next 16 exporteert al een native flat-config array (zie
// node_modules/eslint-config-next/dist/index.js) — geen FlatCompat/legacy
// `extends`-omweg meer nodig zoals de oudere codemod-template die genereert.
import nextConfig from 'eslint-config-next'

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '.claude/worktrees/**',
    ],
  },
]

export default eslintConfig
