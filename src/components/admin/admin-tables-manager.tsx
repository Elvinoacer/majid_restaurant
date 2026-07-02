"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Printer, QrCode as QrIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { upsertTable, deleteTable, generateQrPrintSheet, type AdminTable } from "@/lib/tables/actions";

type Props = {
  slug: string;
  staffRole: "OWNER" | "MANAGER" | "KITCHEN" | "FRONT_OF_HOUSE";
  initialTables: AdminTable[];
};

export function AdminTablesManager({ slug, staffRole, initialTables }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tables, setTables] = useState<AdminTable[]>(initialTables);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const canEdit = staffRole === "OWNER" || staffRole === "MANAGER" || staffRole === "FRONT_OF_HOUSE";

  const openNew = () => { setEditingId(null); setShowDialog(true); };
  const openEdit = (id: string) => { setEditingId(id); setShowDialog(true); };

  const handlePrintSheet = () => {
    setPrinting(true);
    startTransition(async () => {
      const res = await generateQrPrintSheet();
      if (!res.ok) {
        toast.error(res.error);
        setPrinting(false);
        return;
      }
      // Open the printable HTML in a new tab.
      const blob = new Blob([res.data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        toast.error("Please allow popups to print the QR sheet.");
        URL.revokeObjectURL(url);
        setPrinting(false);
        return;
      }
      // Give the new tab a moment to load, then trigger print.
      setTimeout(() => {
        w.focus();
        w.print();
        URL.revokeObjectURL(url);
        setPrinting(false);
      }, 800);
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Tables &amp; QR codes</h1>
          <p className="text-sm text-muted-foreground">
            Print a QR code per table — customers scan to view the menu and place a dine-in order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrintSheet} variant="outline" disabled={printing || tables.length === 0} className="gap-1.5">
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Print QR sheet
          </Button>
          {canEdit && (
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New table
            </Button>
          )}
        </div>
      </header>

      {tables.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No tables yet. Add tables here, then print their QR codes to laminate.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <li
              key={t.id}
              className={cn(
                "rounded-xl border border-border bg-card p-4",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-semibold">{t.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    Capacity: {t.capacity} · {t.location ?? "—"}
                  </p>
                  {t.branchName && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Branch: {t.branchName}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Short code: <code className="rounded bg-muted px-1 py-0.5">{t.shortCode}</code>
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t.id)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:text-danger"
                      onClick={() => {
                        if (!confirm(`Delete ${t.label}? Existing orders will keep their table reference.`)) return;
                        startTransition(async () => {
                          const res = await deleteTable(t.id);
                          if (!res.ok) { toast.error(res.error); return; }
                          setTables((prev) => prev.filter((x) => x.id !== t.id));
                          toast.success("Table deleted.");
                          router.refresh();
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-center rounded-lg bg-white p-3">
                {t.qrDataUrl ? (
                  <img
                    src={t.qrDataUrl}
                    alt={`QR code for ${t.label}`}
                    className="h-40 w-40"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center text-muted-foreground">
                    <QrIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <a
                href={`/${slug}/table/${t.shortCode}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-center text-[11px] text-primary underline"
              >
                Open table page →
              </a>
            </li>
          ))}
        </ul>
      )}

      <TableDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        editing={tables.find((t) => t.id === editingId) ?? null}
        slug={slug}
        onSaved={(table) => {
          // The new table won't have a qrDataUrl from the upsert action —
          // re-fetch via router.refresh() and let the page reload.
          setTables((prev) => {
            const existing = prev.find((t) => t.id === table.id);
            if (existing) return prev.map((t) => (t.id === table.id ? { ...t, ...table } : t));
            return [...prev, table];
          });
          setShowDialog(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function TableDialog({
  open,
  onOpenChange,
  editing,
  slug,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminTable | null;
  slug: string;
  onSaved: (t: AdminTable) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [location, setLocation] = useState<"indoor" | "outdoor" | "">("");

  const handleOpen = (open: boolean) => {
    if (open) {
      setLabel(editing?.label ?? "");
      setCapacity(editing ? String(editing.capacity) : "4");
      setLocation((editing?.location as "indoor" | "outdoor" | null) ?? "");
    }
    onOpenChange(open);
  };

  const handleSave = () => {
    if (!label.trim()) { toast.error("Label is required."); return; }
    const cap = parseInt(capacity, 10);
    if (Number.isNaN(cap) || cap < 1) { toast.error("Capacity must be at least 1."); return; }
    startTransition(async () => {
      const res = await upsertTable({
        id: editing?.id,
        label: label.trim(),
        capacity: cap,
        location: location || null,
        branchId: null,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(editing ? "Table updated." : "Table created.");
      // The router.refresh in parent will reload with the new QR. For now,
      // optimistically patch the existing row.
      onSaved({
        id: res.data.id,
        label: label.trim(),
        capacity: cap,
        location: location || null,
        shortCode: res.data.id.slice(-8),
        branchName: editing?.branchName ?? null,
        qrDataUrl: editing?.qrDataUrl ?? null,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit table" : "New table"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="tlabel">Label</Label>
            <Input
              id="tlabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Table 4, Patio 2"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tcap">Capacity</Label>
              <Input
                id="tcap"
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tloc">Location</Label>
              <select
                id="tloc"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value as "indoor" | "outdoor" | "")}
              >
                <option value="">— None —</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The QR code is generated automatically — print it from the table card or the &quot;Print QR sheet&quot; button.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {editing ? "Save changes" : "Create table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
