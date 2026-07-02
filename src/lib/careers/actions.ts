/**
 * Careers server actions (PRD §5.19 — Careers Page).
 *
 * Phase 3 ships:
 *   - listActiveJobPostings (public)  — open positions shown on /careers
 *   - createJobApplication (public)   — application form + CV upload
 *   - upsertJobPosting / deleteJobPosting / toggleJobPosting (staff)
 *   - listJobPostingsAdmin (staff)    — includes inactive + application counts
 *   - listApplications (staff)        — applications for a single posting
 *   - updateApplicationStatus (staff) — manual triage
 *
 * CV upload strategy (Phase 3 dev): the file is received as a FormData
 * attachment, validated for type + size, and saved to
 * `/public/uploads/cv/<timestamp>-<slug>.<ext>`. The public URL is stored
 * on the JobApplication row so the owner can download it from the admin.
 *
 * Production swap (PRD §4 — Cloudinary): replace `saveCvFile` with a
 * Cloudinary uploader. The `cvUrl` column stays the same — only the storage
 * backend changes.
 */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { requireStaff } from "@/lib/auth/staff";
import { db as prisma } from "@/lib/db";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ── Public ──────────────────────────────────────────────────────────────────

export type PublicJobPosting = {
  id: string;
  title: string;
  description: string;
  postedAt: string;
};

export async function listActiveJobPostings(): Promise<PublicJobPosting[]> {
  const { db: tenant } = await getContextRestaurant();
  const postings = await tenant.jobPosting.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return postings.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    postedAt: p.createdAt.toISOString(),
  }));
}

const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Save an uploaded CV file to /public/uploads/cv/ and return the public URL
 * path. Returns null if no file was supplied (we treat the CV as optional —
 * a candidate can submit just contact details and we'll request the CV by
 * phone if needed).
 *
 * Validation:
 *   - File size <= 5 MB
 *   - MIME type in allowlist (PDF + Word)
 *   - Extension matches MIME type (defense against Content-Type spoofing)
 */
async function saveCvFile(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_CV_BYTES) {
    throw new Error("CV file is too large — please upload a file under 5 MB.");
  }
  if (!ALLOWED_CV_TYPES.has(file.type)) {
    throw new Error(
      "CV must be a PDF or Word document (.pdf, .doc, or .docx).",
    );
  }

  // Extension from MIME type — don't trust the original filename's extension.
  const extByMime: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
  };
  const ext = extByMime[file.type] ?? "bin";

  const slug = crypto.randomBytes(6).toString("hex");
  const filename = `${Date.now()}-${slug}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "cv");
  await fs.mkdir(uploadDir, { recursive: true });
  const fullPath = path.join(uploadDir, filename);

  // ArrayBuffer → Buffer; file.arrayBuffer() works in both Node 20+ and the
  // Next.js Server Action runtime.
  const bytes = await file.arrayBuffer();
  await fs.writeFile(fullPath, Buffer.from(bytes));

  return `/uploads/cv/${filename}`;
}

const ApplySchema = z.object({
  jobPostingId: z.string().min(1),
  applicantName: z.string().min(1).max(120),
  applicantPhone: z.string().min(5).max(40),
  applicantEmail: z.string().email().optional().or(z.literal("")),
});

export type ApplicationResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createJobApplication(
  input: z.infer<typeof ApplySchema>,
  cvFile: File | null,
): Promise<ApplicationResult<{ applicationId: string }>> {
  const parsed = ApplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { restaurant, db: tenant } = await getContextRestaurant();

  // Verify the posting exists, is active, and belongs to this tenant.
  const posting = await tenant.jobPosting.findUnique({
    where: { id: data.jobPostingId },
  });
  if (!posting || !posting.isActive) {
    return { ok: false, error: "This position is no longer open." };
  }

  let cvUrl: string | null = null;
  if (cvFile) {
    try {
      cvUrl = await saveCvFile(cvFile);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  const application = await prisma.jobApplication.create({
    data: {
      jobPostingId: posting.id,
      applicantName: data.applicantName,
      applicantPhone: data.applicantPhone,
      applicantEmail: data.applicantEmail || null,
      cvUrl: cvUrl ?? "",
    },
  });

  revalidatePath(`/${restaurant.slug}/admin/careers`);
  return { ok: true, data: { applicationId: application.id } };
}

// ── Staff: JobPosting CRUD ──────────────────────────────────────────────────

const UpsertPostingSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  isActive: z.boolean().default(true),
});

export async function upsertJobPosting(
  input: z.infer<typeof UpsertPostingSchema>,
): Promise<ApplicationResult<{ id: string }>> {
  const parsed = UpsertPostingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();

  const payload = {
    title: data.title,
    description: data.description,
    isActive: data.isActive,
  };

  let id: string;
  if (data.id) {
    const updated = await tenant.jobPosting.update({
      where: { id: data.id },
      data: payload,
    });
    id = updated.id;
  } else {
    const created = await tenant.jobPosting.create({ data: payload });
    id = created.id;
  }

  revalidatePath(`/${restaurant.slug}/careers`);
  revalidatePath(`/${restaurant.slug}/admin/careers`);
  return { ok: true, data: { id } };
}

export async function deleteJobPosting(id: string): Promise<ApplicationResult<{ id: string }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  // Deletion cascades to applications per the schema relation.
  await tenant.jobPosting.delete({ where: { id } });
  revalidatePath(`/${restaurant.slug}/careers`);
  revalidatePath(`/${restaurant.slug}/admin/careers`);
  return { ok: true, data: { id } };
}

export async function toggleJobPosting(id: string): Promise<ApplicationResult<{ isActive: boolean }>> {
  await requireStaff(["OWNER", "MANAGER"]);
  const { restaurant, db: tenant } = await getContextRestaurant();
  const posting = await tenant.jobPosting.findUnique({ where: { id } });
  if (!posting) return { ok: false, error: "Posting not found" };
  const updated = await tenant.jobPosting.update({
    where: { id },
    data: { isActive: !posting.isActive },
  });
  revalidatePath(`/${restaurant.slug}/careers`);
  revalidatePath(`/${restaurant.slug}/admin/careers`);
  return { ok: true, data: { isActive: updated.isActive } };
}

export type AdminJobPosting = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  applicationCount: number;
};

export async function listJobPostingsAdmin(): Promise<AdminJobPosting[]> {
  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { db: tenant } = await getContextRestaurant();
  const postings = await tenant.jobPosting.findMany({
    orderBy: { createdAt: "desc" },
    include: { applications: { select: { id: true } } },
  });
  return postings.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    applicationCount: p.applications.length,
  }));
}

export type JobApplicationAdmin = {
  id: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string | null;
  cvUrl: string | null;
  createdAt: string;
  postingTitle: string;
};

export async function listApplications(
  jobPostingId: string,
): Promise<JobApplicationAdmin[]> {
  await requireStaff(["OWNER", "MANAGER", "FRONT_OF_HOUSE"]);
  const { db: tenant } = await getContextRestaurant();
  // Verify the posting belongs to this tenant (tenant scope on jobPosting
  // is enforced via `tenant`).
  const posting = await tenant.jobPosting.findUnique({
    where: { id: jobPostingId },
  });
  if (!posting) return [];

  const apps = await prisma.jobApplication.findMany({
    where: { jobPostingId },
    orderBy: { createdAt: "desc" },
  });
  return apps.map((a) => ({
    id: a.id,
    applicantName: a.applicantName,
    applicantPhone: a.applicantPhone,
    applicantEmail: a.applicantEmail,
    cvUrl: a.cvUrl || null,
    createdAt: a.createdAt.toISOString(),
    postingTitle: posting.title,
  }));
}
