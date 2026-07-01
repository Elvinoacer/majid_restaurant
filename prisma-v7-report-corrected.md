# Prisma 7+ with Next.js: Deep Dive Report

**Executive Summary:** This report covers using Prisma v7 (with **Node 20.19+**, **TypeScript 5.4+**, Next.js 14+) to build Next.js apps. We discuss the **Prisma schema** (`schema.prisma`), the new **`prisma.config.ts`**, setting up a **singleton PrismaClient**, TypeScript types, and PostgreSQL integration (including connection pooling with `pg` and PgBouncer). We explain installation, migrations, seeding, and deployment (Vercel, Railway, Render). For each, we give code examples and compare patterns (with pros/cons). We also include a Mermaid flowchart of a request cycle. All information is from official Prisma and Next.js sources (cited).

> **⚠️ Prisma v7 Key Breaking Changes (released Nov 19, 2025):**
> - `url` (and `directUrl`) are **no longer valid** inside `schema.prisma` — doing so throws P1012. Move the URL to `prisma.config.ts`.
> - `PrismaClient` now **requires a driver adapter** (e.g. `PrismaPg`) — calling `new PrismaClient()` without one throws an error.
> - The generator provider changed from `prisma-client-js` to **`prisma-client`**, and `output` is now **required**.
> - PrismaClient must be imported from the **generated path** (e.g. `./generated/prisma/client`), not from `@prisma/client`.
> - Projects must be configured as **ESM** (`"type": "module"` in `package.json`).
> - Node.js **20.19+** and TypeScript **5.4+** are required.

## Prisma Schema (`schema.prisma`) Basics

A Prisma schema file (`schema.prisma`) defines your data models and generator configuration. In **Prisma v7**, the `datasource` block **no longer accepts a `url` field** — including one throws error `P1012: The datasource property url is no longer supported in schema files`. Connection URLs have been fully moved to `prisma.config.ts`. The schema keeps only the `provider` in the datasource block, and the generator now uses `provider = "prisma-client"` (replacing the older `prisma-client-js`) with a **required** `output` path:

```prisma
datasource db {
  provider = "postgresql"
  // ❌ DO NOT include url here in Prisma v7 — it will throw P1012
  // url = env("DATABASE_URL")  <-- REMOVE THIS
}

generator client {
  provider = "prisma-client"
  output   = "./src/generated/prisma"
}
```

> **Note:** The `output` field is now **required** in v7 — Prisma no longer generates the client into `node_modules` by default. After `npx prisma generate`, always import from your custom output path (e.g. `./generated/prisma/client`), not from `@prisma/client`.

Models are defined with `model Name { ... }`, listing fields with types and attributes. For example:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  posts     Post[]
}
```

This declares a `User` table with a primary key `id`, a unique `email`, an optional `name`, and a timestamp. Relations use the `@relation` attribute. For instance, a one-to-one relation:

```prisma
model Profile {
  id     Int   @id @default(autoincrement())
  bio    String
  user   User  @relation(fields: [userId], references: [id])
  userId Int   @unique
}
```

Here `Profile` links to `User` via `userId`. Composite and many-to-many relations follow similar patterns.

Enums are declared with `enum`:

```prisma
enum Role {
  USER
  ADMIN
}
```

and used in models (e.g. `role Role @default(USER)`). You can also define indexes or unique constraints using `@@index`, `@@unique`, etc.:

```prisma
model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String?
  @@index([title, content])
}
```

Finally, Prisma supports *Preview Features* behind flags. Check [Prisma's preview feature list](https://pris.ly/d/client-preview-features) for flags like `views`, `fullTextSearch`, etc. Enable them in the `generator` block under `previewFeatures`.

## `prisma.config.ts`: Purpose and Patterns

Prisma v7 introduced **`prisma.config.ts`** as the single source of truth for CLI configuration. **This is now where the database URL lives** — it has been completely removed from `schema.prisma`. Place this file at your **project root** (next to `package.json`). After `npx prisma init`, a `prisma.config.ts` is auto-generated using `defineConfig` from `prisma/config`:

```ts
// prisma.config.ts (at project root, next to package.json)
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

This configures where Prisma finds your schema, where to put migrations, what seed script to run, and — critically — the database URL used by all CLI commands (`prisma migrate`, `prisma db push`, `prisma studio`, etc.).

> **⚠️ v7 Removal:** `datasource.directUrl` has been **removed** from `prisma.config.ts` in v7. If you previously used `directUrl` for migrations (e.g. a direct connection bypassing PgBouncer), put that direct URL in the `url` field of `prisma.config.ts` instead — the CLI always uses `url` as a direct connection. Use the pooled URL only in the `PrismaClient` adapter at runtime (see Connection Pooling section).

**Key patterns:**
- Use `dotenv/config` and `env()` to load `DATABASE_URL` from `.env`. (Prisma v7 no longer auto-loads `.env` for the CLI.)
- Set `schema` and `migrations.path` relative to this file.
- Define a `seed` command under `migrations` if you want `npx prisma db seed` to run a script (e.g. a TS seed file).
- `prisma.config.ts` must be at the project root (where `package.json` lives). Alternatively `.config/prisma.ts` works for monorepos.
- You can also use TypeScript's `satisfies PrismaConfig` instead of `defineConfig` — both produce the same result.

## Installing Prisma and Adapters

To set up Prisma, install the CLI and client plus a DB adapter. For PostgreSQL:

```bash
npm install prisma --save-dev
npm install @prisma/client @prisma/adapter-pg pg
```

Ensure `"type": "module"` in `package.json` — **this is required in Prisma v7**, not optional. Also confirm your `tsconfig.json` targets ESM:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "strict": true,
    "esModuleInterop": true
  }
}
```

After installing, run `npx prisma init` (which creates `schema.prisma` and `prisma.config.ts`) and `npx prisma generate` to produce the typed client in your `output` directory.

> **Prisma v7 requires a driver adapter for all databases.** The old in-process Rust query engine has been replaced by a pure-TypeScript query compiler, and all database connections now go through a Node.js driver adapter. For PostgreSQL, that is `@prisma/adapter-pg` (backed by the `pg` package). Other options include `@prisma/adapter-neon` (Neon serverless), `@prisma/adapter-better-sqlite3` (SQLite), etc.

## PrismaClient Singleton in Next.js

You should only create **one PrismaClient instance** per process. Multiple instances open multiple connection pools, which can exhaust database connections. In a Node (long-running) app, the solution is to create a global singleton, often with `globalThis`. For example (in `lib/prisma.ts`):

```ts
// lib/prisma.ts (shared)
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  // In development, prevent multiple clients during hot reloads
  globalForPrisma.prisma = prisma;
}
```

This caches the client on `globalThis` in dev, ensuring a single instance. Do *not* call `prisma.$disconnect()` after each query; keep the pool open (disconnect is only needed on process exit in long-running servers).

In serverless (e.g. Vercel, AWS Lambda), each function invocation is a short-lived process. You should still instantiate *outside* the handler (so the runtime can reuse the instance across a warm invocation) and **avoid disconnecting**. You may also need to set `connection_limit=1` or use a pooler (discussed below) to avoid too many connections.

## Using Prisma in Next.js (App Router and Pages)

**App Router (Next 13+):** In server components or server actions, you can directly `await` prisma queries. A common pattern is to put the above `prisma` export in a `lib/prisma.ts` and import it. For example, a server component page:

```tsx
// app/blog/page.tsx (server component, Next.js 14+)
import PostList from './PostList';
import { prisma } from '@/lib/prisma';

export default async function BlogPage() {
  const posts = await prisma.post.findMany();
  return <PostList initialPosts={posts} />;
}
```

This is safe because it runs on the server (no client bundle). For server actions (Next 14 forms), similarly do:

```ts
// app/actions.ts (Next 14 Server Action)
'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  await prisma.post.create({ data: { title, content } });
  revalidatePath('/blog');
}
```

Again, we import the shared `prisma`. The official Prisma/Next.js guide uses this pattern in both server actions and route handlers.

**App Router API Routes (Route Handlers):** In `app/api`, Next.js uses Edge/Node functions. A typical handler file:

```ts
// app/api/posts/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const posts = await prisma.post.findMany();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const data = await request.json();
  const post = await prisma.post.create({ data });
  return NextResponse.json(post);
}
```

Again reuse `prisma`.

**Pages Router (pre-App-Router):** You can use Prisma in API routes (`pages/api/*.ts`) or `getServerSideProps`. The pattern is similar: import your singleton `prisma` and use it. For example, in `pages/api/hello.ts`:

```ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const users = await prisma.user.findMany();
  res.json(users);
}
```

Or in a page with `getServerSideProps`:

```ts
export async function getServerSideProps() {
  const posts = await prisma.post.findMany();
  return { props: { posts } };
}
```

In all cases, **do not** create a new `PrismaClient` inside the handler; always import the shared one to reuse the pool (as emphasized in the Prisma docs).

**Edge Functions:** If you use Next/React Server Components with the `"edge"` runtime (e.g. Vercel Edge Functions or Next middleware), note that Prisma Client's usual drivers (like `pg`) aren't supported in all edge environments. For example, Vercel Edge requires an HTTP-based driver. In Prisma v7, the recommended approach is to use **Prisma Postgres** (a Prisma-hosted Postgres service with HTTP API) or **Prisma Accelerate** for generic edge DB access. If you stick to `"nodejs"` runtime, you can use Prisma as above.

## TypeScript Typings

Prisma is fully TypeScript-aware. After generating the client, you import from the generated output path. For example:

```ts
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
```

The generated client provides type-safe CRUD methods. Model types and the `Prisma` utility namespace are exported from the same generated client path:

```ts
// Import PrismaClient and the Prisma namespace from the generated path
import { PrismaClient, Prisma } from './generated/prisma/client';

// Use Prisma namespace for input/output types
type UserCreateInput = Prisma.UserCreateInput;
type UserSelect = Prisma.UserSelect;

// Model types are inferred from query results
async function getUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  // user is typed as: { id: number; email: string; name: string | null; ... } | null
  return user;
}
```

> **⚠️ v7 Import Change:** Do **not** import from `@prisma/client` in v7. The old path (`import { PrismaClient } from '@prisma/client'`) no longer works with the `prisma-client` generator. Always import from your declared `output` path (e.g. `'./generated/prisma/client'`). Adjust the relative path based on the location of the importing file.

Enum values are also exported from the generated client and can be used directly:

```ts
import { Role } from './generated/prisma/client';

const adminRole: Role = Role.ADMIN; // 'ADMIN'
```

## Connection Pooling and PostgreSQL (`pg`, SSL, PgBouncer)

By default, Prisma's Postgres adapter uses the `pg` package with a connection pool. The connection string is your `DATABASE_URL`, e.g. `postgresql://user:pass@host:5432/db?schema=public`. If your database requires SSL (common on managed Postgres), include SSL parameters like `?sslmode=require` in the URL or set `PGSSLMODE=require`. Alternatively, pass SSL config to the adapter:

```ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false }, // for self-signed certs
});
```

> **⚠️ SSL Change in v7:** Prisma v7 uses `node-pg` instead of the Rust query engine, so SSL certificate validation defaults changed. Previously, invalid/self-signed certs were silently ignored. In v7 you may see `P1010: User was denied access` SSL errors — fix with `ssl: { rejectUnauthorized: false }` or properly configure your certs.

**Serverless vs Persistent:** In long-running servers, use a pool size proportional to CPUs. In serverless (each invocation gets a fresh process), set `?connection_limit=1` in the URL to keep only one connection per function instance (to avoid hitting DB limits). For example:

```
DATABASE_URL="postgres://user:pass@host:5432/db?connection_limit=1"
```

Alternatively, use an external pooler like **PgBouncer**. Prisma has a PgBouncer guide that recommends using transaction mode and (for PgBouncer <1.21) adding `?pgbouncer=true` to the URL. For example:

```
DATABASE_URL="postgres://USER:PASSWORD@HOST:6543/DATABASE?pgbouncer=true"
DIRECT_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE"
```

Here, `DATABASE_URL` points to the PgBouncer pooler (port 6543) and `DIRECT_URL` is the direct connection (port 5432). In `prisma.config.ts`, use `DIRECT_URL` in the `url` field (so the CLI uses a direct connection for migrations), but at runtime pass `DATABASE_URL` to the adapter:

```dotenv
# .env
DATABASE_URL="postgres://USER:PASSWORD@HOST:6543/DB?pgbouncer=true"
DIRECT_URL="postgres://USER:PASSWORD@HOST:5432/DB"
```

```ts
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use DIRECT_URL here so CLI migrations bypass PgBouncer
    url: env("DIRECT_URL"),
  },
});
```

```ts
// src/lib/prisma.ts
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

This way, runtime queries go through PgBouncer, but migrations (CLI) connect directly.

## Setup: Installation, Migrations, Seeding

1. **Install & init Prisma:** Install `prisma`, `@prisma/client`, `@prisma/adapter-pg`, and `pg`. Ensure `"type": "module"` in `package.json`. Then run `npx prisma init`. This creates `prisma/schema.prisma` (with a sample model) and `prisma.config.ts` at the project root.
2. **Configure `.env`:** Set `DATABASE_URL` to your Postgres connection (include SSL params if needed, e.g. `?sslmode=require`). For PgBouncer use the pattern above.
3. **Write your schema:** Define models, enums, etc. under `model`/`enum` in `schema.prisma`. **Do not** include `url` in the `datasource` block.
4. **Generate client:** Run `npx prisma generate`. This produces the client code under the `output` path (e.g. `./src/generated/prisma`).
5. **Migrations:** For development, use `npx prisma migrate dev --name init` to create migrations. For production, use `npx prisma migrate deploy`. The CLI reads the DB URL from `prisma.config.ts`.
6. **Seeding:** If you need initial data, put a script (e.g. `prisma/seed.ts`) and configure it in `prisma.config.ts` under `migrations.seed`. Then run `npx prisma db seed` to execute it. Your seed script must also import dotenv and use the adapter pattern:

```ts
// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.create({ data: { email: 'admin@example.com', name: 'Admin' } });
}

main().finally(() => prisma.$disconnect());
```

## Deployment Considerations

- **Vercel (Next.js):** Set the environment variable `DATABASE_URL` in the Vercel Dashboard or via CLI (`npx vercel env add DATABASE_URL`). If using Vercel Edge runtime, use an HTTP-compatible adapter (Prisma Postgres or adapter-neon). Include a `"postinstall": "prisma generate"` in `package.json` so the client is built after install. Vercel's 1MB size limit on free tier is much less of a concern with v7 — the new TypeScript query compiler cut bundle size by ~90% (from ~14MB to ~1.6MB).
- **Railway:** Railway has an official Next+Prisma template. You typically just connect your GitHub repo and Railway auto-provisions a Postgres. Then add a `DATABASE_URL` variable in the Railway UI under "Variables". It will redeploy with the DB. No special code changes needed beyond using `DATABASE_URL`.
- **Render:** On Render, create a **Web Service** and a **Postgres Database** (via `render.yaml` or UI). In the service settings, set a build command (e.g. `npm install --production=false`), a *pre-deploy* command (`npx prisma migrate deploy`) and a start command (e.g. `npm run start`). The example Render blueprint shows adding `npx prisma migrate deploy` so migrations run before the server starts. Also add `DATABASE_URL` in Render's Environment under the service (or via blueprint) to match the database.

Each platform has its nuances, but in all cases **ensure the DB URL is provided** as an env var before the app starts. Also remember to regenerate the client (`prisma generate`) whenever `schema.prisma` changes (usually by rebuilding/redeploying after a schema change).

## Comparison of PrismaClient Patterns

| Pattern | Example (file) | Pros | Cons | Use case |
|---|---|---|---|---|
| **Global singleton (shared lib/prisma.ts)** | See code example above (using globalThis) | Reuses one pool, avoids "too many clients" error | Must manage global cache logic (slightly verbose) | Recommended in Next.js (both API & SSR) |
| **Per-request instantiation** | `export default async function handler() { const adapter = new PrismaPg(...); const p = new PrismaClient({ adapter }); ... }` | Simpler code (no global logic) | Creates a new pool each call – quickly exhausts DB | *Not recommended* (bad for production) |
| **Serverless (pool=1 or Data Proxy)** | `DATABASE_URL=...connection_limit=1` or use Prisma Data Proxy | Keeps connections minimal (good for FaaS) | Slower if many concurrent queries; adds complexity | Use on Vercel/AWS Lambdas if no pooler |
| **Edge-compatible (HTTP adapter)** | Use `@prisma/adapter-neon` or Prisma Postgres (HTTP) | Works in Edge runtimes (Vercel Edge, Cloudflare) | Requires special adapter, limited DB support | Only if you must use Edge runtime |

Above, the **global singleton** pattern (first row) is the standard. It ensures only one PrismaClient is ever created per Node process. For **serverless**, either use a connection pooler (as above) or consider Prisma Data Proxy for managed pooling. Edge runtimes require HTTP adapters.

## Common Pitfalls & Fixes

- **`url` in `schema.prisma` (P1012):** If you upgrade from v6 and keep `url = env("DATABASE_URL")` in the `datasource` block, you'll get `P1012: The datasource property url is no longer supported in schema files`. Remove it — the URL belongs in `prisma.config.ts`.
- **Missing adapter**: In Prisma 7+, creating `new PrismaClient()` *without* an adapter throws `PrismaClientConstructorValidationError: Using engine type "client" requires either "adapter" or "accelerateUrl"`. Always import and pass the DB adapter (e.g. `const adapter = new PrismaPg(...)`).
- **Wrong import path**: `import { PrismaClient } from '@prisma/client'` no longer works with the v7 `prisma-client` generator. Import from your `output` path: `import { PrismaClient } from './generated/prisma/client'`.
- **Missing `dotenv` in scripts**: Prisma v7 no longer auto-loads `.env` files. Add `import "dotenv/config"` at the top of `prisma.config.ts` and any seed/script files that need env vars.
- **Multiple instances**: In Next dev, hot reload can re-import modules, creating extra clients. Fix by caching the client on `globalThis` in non-production.
- **Too many DB connections**: On serverless or in dev, hitting `FATAL: sorry, too many clients` means too many pools. Use the singleton pattern and/or set `connection_limit=1`, or use PgBouncer/Proxy.
- **Edge runtime errors**: If deploying to an Edge runtime, recall that `pg` is unsupported. Use an HTTP-based adapter (Prisma Postgres or similar).
- **Schema changes without regenerate**: Forgetting `npx prisma generate` after changing `schema.prisma` will cause type mismatches. Ensure your build or CI runs `prisma generate`. (On Vercel, a `"postinstall": "prisma generate"` helps.)
- **Inconsistent URLs (PgBouncer)**: For platforms with pooled vs direct URLs, use separate env vars and set the **direct** URL in `prisma.config.ts` for the CLI, while passing the **pooled** URL to `PrismaPg` at runtime. (Note: `datasource.directUrl` no longer exists in v7 config — use `url` for the CLI's direct connection.)
- **SSL errors after upgrade**: v7 no longer silently ignores invalid certs. Pass `ssl: { rejectUnauthorized: false }` to the adapter, or configure proper certs.

```mermaid
sequenceDiagram
  participant U as User
  participant N as Next.js App
  participant P as Prisma Client
  participant DB as PostgreSQL

  U->>N: HTTP request (e.g. GET /api/data)
  N->>P: import prisma (reuse global instance)
  P->>DB: Acquire connection from pool & execute query
  DB-->>P: Return query result
  P-->>N: Return data
  N->>U: Send HTTP response
```

This flowchart shows a typical request: the Next.js handler (in pages or app router) uses the cached Prisma client to query the database and returns the result to the user.

---

**Sources:** Official Prisma v7 docs and Next.js guides provided all code patterns and recommendations. Tables and examples are derived from these authoritative sources. All code samples reflect current best practices as of Prisma ORM 7.x (released November 2025).
