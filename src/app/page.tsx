import { redirect } from "next/navigation";
import { DEFAULT_TENANT_SLUG } from "@/proxy";

/**
 * Root route — redirects to the default tenant's home.
 * In production with multi-tenant subdomain routing, this would resolve the
 * tenant from the subdomain instead. For Phase 0/1 the path-based approach
 * (/{slug}) is in use per PRD §5.1 fast-path.
 */
export default function Home() {
  redirect(`/${DEFAULT_TENANT_SLUG}`);
}
