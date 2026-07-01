/**
 * NextAuth v5 catch-all route handler (PRD §5.13).
 *
 * `handlers` is `{ GET, POST }` — destructure and re-export.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
