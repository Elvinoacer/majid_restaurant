"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createStaffUser, deleteStaffUser } from "@/lib/menu/actions";
import type { StaffRole } from "@/generated/prisma/client";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
};

const ROLE_COLOR: Record<StaffRole, string> = {
  OWNER: "bg-primary/15 text-primary",
  MANAGER: "bg-blue-500/15 text-blue-700",
  KITCHEN: "bg-orange-500/15 text-orange-700",
  FRONT_OF_HOUSE: "bg-purple-500/15 text-purple-700",
};

export function AdminStaffList({
  staff,
  currentStaffId,
}: {
  staff: Staff[];
  currentStaffId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // New staff form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("KITCHEN");
  const [password, setPassword] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createStaffUser({ name, email, role, password });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Staff user created");
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("KITCHEN");
      router.refresh();
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete staff user "${name}"? They will lose access immediately.`)) return;
    startTransition(async () => {
      const result = await deleteStaffUser(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Staff user removed");
      router.refresh();
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who can access this admin dashboard. Only OWNER can add or remove staff.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-1 h-4 w-4" />
              Add staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a staff user</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label htmlFor="n-name">Name</Label>
                <Input id="n-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="n-email">Email</Label>
                <Input id="n-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="n-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
                  <SelectTrigger id="n-role" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner (full access)</SelectItem>
                    <SelectItem value="MANAGER">Manager (menu + orders + reservations)</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen (orders only)</SelectItem>
                    <SelectItem value="FRONT_OF_HOUSE">Front of House (orders + reservations)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="n-pass">Initial password</Label>
                <Input
                  id="n-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  At least 8 characters. The staff member should change this after first sign-in.
                </p>
              </div>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create staff user"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <ul className="space-y-2">
        {staff.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 sm:p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{s.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLOR[s.role]}`}>
                  {s.role.replace("_", " ")}
                </span>
                {s.id === currentStaffId && (
                  <span className="text-xs text-muted-foreground">(you)</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.email} · added {new Date(s.createdAt).toLocaleDateString()}
              </p>
            </div>
            {s.id !== currentStaffId && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => handleDelete(s.id, s.name)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
