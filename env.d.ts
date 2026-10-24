/// <reference types="vite/client" />

interface EnvironmentVariables {
  readonly NODE_ENV?: 'development' | 'production' | 'test'
  readonly PORT?: string
}

declare namespace NodeJS {
  interface ProcessEnv extends EnvironmentVariables {}
}

declare namespace Bun {
  interface Env extends EnvironmentVariables {}
}
