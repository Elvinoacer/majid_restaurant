"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus, KeyRound, Power, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  createStaffUser,
  deleteStaffUser,
  updateStaffRole,
  setStaffActive,
  resetStaffPassword,
} from "@/lib/menu/actions";
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

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner (full access)",
  MANAGER: "Manager (menu + orders + reservations)",
  KITCHEN: "Kitchen (kitchen dashboard)",
  FRONT_OF_HOUSE: "Front of House (orders + reservations + customers)",
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
    if (!confirm(`Delete staff user "${name}"? They will lose access immediately. This cannot be undone.`)) return;
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

  const handleRoleChange = (id: string, newRole: StaffRole, oldRole: StaffRole) => {
    if (newRole === oldRole) return;
    startTransition(async () => {
      const result = await updateStaffRole({ staffId: id, role: newRole });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Role updated to ${newRole.replace("_", " ")}`);
      router.refresh();
    });
  };

  const handleToggleActive = (id: string, currentlyActive: boolean) => {
    const verb = currentlyActive ? "Deactivate" : "Activate";
    if (!confirm(`${verb} this staff user? ${currentlyActive ? "They will lose access immediately." : "They will be able to sign in again."}`)) return;
    startTransition(async () => {
      const result = await setStaffActive(id, !currentlyActive);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Staff user ${verb.toLowerCase()}d`);
      router.refresh();
    });
  };

  const handleResetPassword = (id: string, name: string) => {
    const newPass = prompt(`Enter a new password for ${name} (min 8 characters):`);
    if (!newPass) return;
    if (newPass.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    startTransition(async () => {
      const result = await resetStaffPassword(id, newPass);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Password reset. Tell the staff member to sign in with the new password.");
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who can access this admin dashboard. Only OWNER can add, remove, or change staff roles.
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

      {staff.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No staff users yet. Click &quot;Add staff&quot; to create one.
        </p>
      ) : (
        <ul className="space-y-2">
          {staff.map((s) => {
            const isSelf = s.id === currentStaffId;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 sm:p-4",
                  !s.isActive && "opacity-60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", ROLE_COLOR[s.role])}>
                      {s.role.replace("_", " ")}
                    </span>
                    {isSelf && (
                      <span className="text-xs text-muted-foreground">(you)</span>
                    )}
                    {!s.isActive && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.email} · added {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Inline role switcher — disabled for self */}
                  <Select
                    value={s.role}
                    onValueChange={(v) => handleRoleChange(s.id, v as StaffRole, s.role)}
                    disabled={pending || isSelf}
                  >
                    <SelectTrigger className="h-9 w-44 text-xs" aria-label={`Role for ${s.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Activate / deactivate toggle — disabled for self */}
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={(v) => handleToggleActive(s.id, s.isActive)}
                    disabled={pending || isSelf}
                    aria-label={s.isActive ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                  />

                  {/* More actions: reset password, delete */}
                  {!isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          disabled={pending}
                          aria-label="More actions"
                        >
                          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleResetPassword(s.id, s.name)}>
                          <KeyRound className="mr-2 h-3.5 w-3.5" />
                          Reset password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => handleToggleActive(s.id, s.isActive)}
                        >
                          <Power className="mr-2 h-3.5 w-3.5" />
                          {s.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => handleDelete(s.id, s.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
