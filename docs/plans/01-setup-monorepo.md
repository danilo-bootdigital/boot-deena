# Plano 01 — Setup do Monorepo

## Objetivo
Criar a estrutura base do monorepo com Turborepo, configurações compartilhadas de TypeScript, ESLint e Prettier, e os workspaces para cada app/package.

## Pré-requisitos
- Node.js >= 20 instalado
- pnpm >= 9 instalado (`corepack enable && corepack prepare pnpm@latest --activate`)

## Estrutura de Arquivos Criados

```
/
├── package.json                  (root workspace)
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .nvmrc
├── .env.example
├── tsconfig.base.json
├── .eslintrc.base.js
├── .prettierrc
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── main.ts
│   ├── worker/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── main.ts
│   └── dashboard/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── app/
│               └── layout.tsx
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   ├── database/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   └── ai/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
└── docker/
    └── (vazio por agora, plano 02)
```

## Steps

### 1. Inicializar o repositório

```bash
cd /caminho/do/projeto
git init
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. Criar package.json root

```json
{
  "name": "agente-ia",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.4.0",
    "eslint": "^9.16.0",
    "typescript": "^5.7.0"
  }
}
```

### 3. Criar pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 4. Criar turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 5. Criar tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "exclude": ["node_modules", "dist"]
}
```

### 6. Criar .eslintrc.base.js

```js
/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '.next/'],
};
```

### 7. Criar .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### 8. Criar .nvmrc

```
20
```

### 9. Criar .gitignore

```
node_modules/
dist/
.next/
.turbo/
.env
.env.local
.env.*.local
*.log
coverage/
.DS_Store
```

### 10. Criar .env.example

```env
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key

# AI Providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# App
NODE_ENV=development
PORT=3001
WORKER_CONCURRENCY=5
```

### 11. Setup apps/api

**apps/api/package.json:**
```json
{
  "name": "@agente-ia/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\""
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-fastify": "^10.4.0",
    "@nestjs/config": "^3.3.0",
    "@nestjs/bullmq": "^10.2.0",
    "@agente-ia/shared": "workspace:*",
    "@agente-ia/database": "workspace:*",
    "bullmq": "^5.30.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.16.0",
    "eslint-config-prettier": "^9.1.0"
  }
}
```

**apps/api/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "declaration": false,
    "declarationMap": false,
    "composite": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**apps/api/src/main.ts:**
```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
```

### 12. Setup apps/worker

**apps/worker/package.json:**
```json
{
  "name": "@agente-ia/worker",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\""
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/config": "^3.3.0",
    "@nestjs/bullmq": "^10.2.0",
    "@agente-ia/shared": "workspace:*",
    "@agente-ia/database": "workspace:*",
    "@agente-ia/ai": "workspace:*",
    "bullmq": "^5.30.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.16.0",
    "eslint-config-prettier": "^9.1.0"
  }
}
```

**apps/worker/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "declaration": false,
    "declarationMap": false,
    "composite": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**apps/worker/src/main.ts:**
```typescript
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log('Worker started and processing jobs...');
}

bootstrap();
```

### 13. Setup apps/dashboard

**apps/dashboard/package.json:**
```json
{
  "name": "@agente-ia/dashboard",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "@supabase/ssr": "^0.5.0",
    "@agente-ia/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.1.0"
  }
}
```

**apps/dashboard/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "declaration": false,
    "declarationMap": false,
    "composite": false,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 14. Setup packages/shared

**packages/shared/package.json:**
```json
{
  "name": "@agente-ia/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint \"src/**/*.ts\"",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**packages/shared/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**packages/shared/src/index.ts:**
```typescript
export * from './types';
export * from './constants';
```

### 15. Setup packages/database

**packages/database/package.json:**
```json
{
  "name": "@agente-ia/database",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint \"src/**/*.ts\"",
    "clean": "rm -rf dist",
    "generate-types": "supabase gen types typescript --local > src/types/supabase.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.47.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "supabase": "^2.0.0"
  }
}
```

**packages/database/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 16. Setup packages/ai

**packages/ai/package.json:**
```json
{
  "name": "@agente-ia/ai",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint \"src/**/*.ts\"",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "ai": "^4.1.0",
    "@ai-sdk/openai": "^1.1.0",
    "@ai-sdk/anthropic": "^1.1.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**packages/ai/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 17. Instalar dependências e verificar

```bash
pnpm install
pnpm build
pnpm lint
```

## Dependências Externas
- Nenhuma (este plano é auto-contido)

## Critérios de Conclusão
- [ ] `pnpm install` roda sem erros
- [ ] `pnpm build` compila todos os workspaces
- [ ] `pnpm lint` passa sem erros
- [ ] Estrutura de pastas conforme especificado
- [ ] Imports entre packages funcionam (ex: `@agente-ia/shared` importável no api)
- [ ] `turbo dev` inicia todos os apps em paralelo
