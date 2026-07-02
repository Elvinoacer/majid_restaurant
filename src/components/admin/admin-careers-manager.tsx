"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Power, FileText, Download, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  upsertJobPosting,
  deleteJobPosting,
  toggleJobPosting,
  listApplications,
  type AdminJobPosting,
  type JobApplicationAdmin,
} from "@/lib/careers/actions";

type Props = {
  slug: string;
  restaurantName: string;
  initialPostings: AdminJobPosting[];
};

export function AdminCareersManager({ slug, restaurantName, initialPostings }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [postings, setPostings] = useState<AdminJobPosting[]>(initialPostings);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [applicationsFor, setApplicationsFor] = useState<AdminJobPosting | null>(null);
  const [applications, setApplications] = useState<JobApplicationAdmin[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const openNew = () => { setEditingId(null); setShowDialog(true); };
  const openEdit = (id: string) => { setEditingId(id); setShowDialog(true); };

  const openApplications = (p: AdminJobPosting) => {
    setApplicationsFor(p);
    setLoadingApps(true);
    setApplications([]);
    startTransition(async () => {
      const apps = await listApplications(p.id);
      setApplications(apps);
      setLoadingApps(false);
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Careers</h1>
          <p className="text-sm text-muted-foreground">{restaurantName} · job postings & applications</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New posting
        </Button>
      </header>

      {postings.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No job postings yet. Click &quot;New posting&quot; to create one.
        </p>
      ) : (
        <ul className="space-y-3">
          {postings.map((p) => (
            <li
              key={p.id}
              className={cn(
                "rounded-xl border border-border bg-card p-4",
                !p.isActive && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                    <h3 className="font-medium">{p.title}</h3>
                    {!p.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Posted {new Date(p.createdAt).toLocaleDateString()} · {p.applicationCount} application{p.applicationCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openApplications(p)}
                    className="gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {p.applicationCount}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      startTransition(async () => {
                        const res = await toggleJobPosting(p.id);
                        if (!res.ok) { toast.error(res.error); return; }
                        setPostings((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: res.data.isActive } : x));
                        toast.success(res.data.isActive ? "Posting activated." : "Posting deactivated.");
                        router.refresh();
                      });
                    }}
                    title={p.isActive ? "Deactivate" : "Activate"}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p.id)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:text-danger"
                    onClick={() => {
                      if (!confirm("Delete this posting? All applications will also be deleted.")) return;
                      startTransition(async () => {
                        const res = await deleteJobPosting(p.id);
                        if (!res.ok) { toast.error(res.error); return; }
                        setPostings((prev) => prev.filter((x) => x.id !== p.id));
                        toast.success("Posting deleted.");
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Applications drawer */}
      {applicationsFor && (
        <Dialog open={true} onOpenChange={(v) => { if (!v) setApplicationsFor(null); }}>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Applications — {applicationsFor.title}</DialogTitle>
            </DialogHeader>
            {loadingApps ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No applications yet for this position.
              </p>
            ) : (
              <ul className="space-y-3">
                {applications.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{a.applicantName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.applicantPhone}
                          {a.applicantEmail && ` · ${a.applicantEmail}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Applied {new Date(a.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {a.cvUrl && (
                        <a
                          href={a.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent/5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download CV
                        </a>
                      )}
                    </div>
                    {!a.cvUrl && (
                      <p className="mt-1 text-xs text-muted-foreground">No CV uploaded.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        </Dialog>
      )}

      <PostingDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        editing={postings.find((p) => p.id === editingId) ?? null}
        onSaved={(posting) => {
          setPostings((prev) => {
            const existing = prev.find((p) => p.id === posting.id);
            if (existing) return prev.map((p) => (p.id === posting.id ? posting : p));
            return [...prev, posting];
          });
          setShowDialog(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function PostingDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminJobPosting | null;
  onSaved: (p: AdminJobPosting) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleOpen = (open: boolean) => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setIsActive(editing?.isActive ?? true);
    }
    onOpenChange(open);
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    startTransition(async () => {
      const res = await upsertJobPosting({
        id: editing?.id,
        title: title.trim(),
        description: description.trim(),
        isActive,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(editing ? "Posting updated." : "Posting created.");
      onSaved({
        id: res.data.id,
        title: title.trim(),
        description: description.trim(),
        isActive,
        createdAt: editing?.createdAt ?? new Date().toISOString(),
        applicationCount: editing?.applicationCount ?? 0,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit posting" : "New posting"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ptitle">Title</Label>
            <Input
              id="ptitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Chef de Partie"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="pdesc">Description</Label>
            <Textarea
              id="pdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Role responsibilities, requirements, hours, compensation, how to apply..."
              className="mt-1 min-h-[180px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="pactive" />
            <Label htmlFor="pactive" className="cursor-pointer">Active (visible on the public careers page)</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {editing ? "Save changes" : "Create posting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
