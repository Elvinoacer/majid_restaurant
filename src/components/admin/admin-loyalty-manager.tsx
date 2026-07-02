"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Power, Search, Gift, Coins, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  upsertLoyaltyRule,
  deleteLoyaltyRule,
  toggleLoyaltyRule,
  searchCustomersForLoyalty,
  redeemReward,
  adjustCustomerPoints,
  updateLoyaltyAccrualRatio,
  type CustomerLoyaltyAdmin,
} from "@/lib/loyalty/actions";
import { formatKsh } from "@/lib/whatsapp/order";

type Rule = {
  id: string;
  description: string;
  pointsRequired: number | null;
  spendThreshold: number | null;
  rewardDescription: string;
  isActive: boolean;
};

type Props = {
  slug: string;
  restaurantName: string;
  staffRole: "OWNER" | "MANAGER" | "FRONT_OF_HOUSE";
  spendPerPoint: number;
  initialRules: Rule[];
};

export function AdminLoyaltyManager({
  slug,
  restaurantName,
  staffRole,
  spendPerPoint,
  initialRules,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [spendPerPointState, setSpendPerPointState] = useState(spendPerPoint);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerLoyaltyAdmin[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLoyaltyAdmin | null>(null);

  const canEditRules = staffRole === "OWNER" || staffRole === "MANAGER";
  const canAdjust = staffRole === "OWNER" || staffRole === "MANAGER";
  const canRedeem = staffRole === "OWNER" || staffRole === "MANAGER" || staffRole === "FRONT_OF_HOUSE";

  const openNewRule = () => {
    setEditingRule(null);
    setShowRuleDialog(true);
  };

  const openEditRule = (r: Rule) => {
    setEditingRule(r);
    setShowRuleDialog(true);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    startTransition(async () => {
      const results = await searchCustomersForLoyalty(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info("No customers matched that search.");
      }
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Loyalty</h1>
          <p className="text-sm text-muted-foreground">{restaurantName}</p>
        </div>
        {canEditRules && (
          <Button onClick={openNewRule} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New reward
          </Button>
        )}
      </header>

      {/* Accrual ratio */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Accrual ratio
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Customers earn <strong>1 loyalty point</strong> for every{" "}
          <strong>KSh {formatKsh(spendPerPointState)}</strong> spent on a
          completed, paid order.
        </p>
        {staffRole === "OWNER" ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="ratio" className="text-xs">KSh per point</Label>
              <Input
                id="ratio"
                type="number"
                min={1}
                step={1}
                value={spendPerPointState}
                onChange={(e) => setSpendPerPointState(parseFloat(e.target.value) || 0)}
                className="mt-1 w-32"
              />
            </div>
            <Button
              size="sm"
              disabled={pending || spendPerPointState === spendPerPoint || spendPerPointState <= 0}
              onClick={() => {
                startTransition(async () => {
                  const r = await updateLoyaltyAccrualRatio({ spendPerPoint: spendPerPointState });
                  if (!r.ok) {
                    toast.error(r.error);
                    setSpendPerPointState(spendPerPoint);
                    return;
                  }
                  toast.success("Accrual ratio updated.");
                  router.refresh();
                });
              }}
            >
              Save ratio
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Only the owner can change the accrual ratio.
          </p>
        )}
      </section>

      {/* Rules list */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reward rules ({rules.length})
        </h2>
        {rules.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No rewards configured yet. Click &quot;New reward&quot; to create one.
          </p>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "rounded-xl border border-border bg-card p-4",
                  !r.isActive && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary flex-shrink-0" />
                      <h3 className="font-medium">{r.description}</h3>
                      {!r.isActive && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">
                      Reward: <strong>{r.rewardDescription}</strong>
                    </p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.pointsRequired != null && <>Requires {r.pointsRequired} points · </>}
                      {r.spendThreshold != null && <>Or KSh {formatKsh(r.spendThreshold)} spend</>}
                      {!r.pointsRequired && !r.spendThreshold && <>Manual redemption</>}
                    </div>
                  </div>
                  {canEditRules && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          startTransition(async () => {
                            const res = await toggleLoyaltyRule(r.id);
                            if (!res.ok) { toast.error(res.error); return; }
                            setRules((prev) => prev.map((x) => x.id === r.id ? { ...x, isActive: res.data.isActive } : x));
                            toast.success(res.data.isActive ? "Rule activated." : "Rule deactivated.");
                          });
                        }}
                        title={r.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditRule(r)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (!confirm("Delete this reward rule? This cannot be undone.")) return;
                          startTransition(async () => {
                            const res = await deleteLoyaltyRule(r.id);
                            if (!res.ok) { toast.error(res.error); return; }
                            setRules((prev) => prev.filter((x) => x.id !== r.id));
                            toast.success("Rule deleted.");
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Customer lookup + redemption */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Customer lookup
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name, email, or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          />
          <Button onClick={handleSearch} disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {searchResults.length > 0 && (
          <ul className="mt-3 space-y-2">
            {searchResults.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:bg-accent/5",
                  selectedCustomer?.id === c.id && "border-primary ring-1 ring-primary/20",
                )}
                onClick={() => setSelectedCustomer(c)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{c.name ?? "(no name)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.email} · {c.phone ?? "no phone"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.orderCount} completed order{c.orderCount === 1 ? "" : "s"} · KSh {formatKsh(c.totalSpent)} lifetime
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-primary">{c.loyaltyPoints}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">points</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {selectedCustomer && (
          <CustomerLoyaltyActions
            customer={selectedCustomer}
            rules={rules.filter((r) => r.isActive)}
            canRedeem={canRedeem}
            canAdjust={canAdjust}
            onUpdated={(updated) => setSelectedCustomer(updated)}
          />
        )}
      </section>

      <RuleDialog
        open={showRuleDialog}
        onOpenChange={setShowRuleDialog}
        rule={editingRule}
        onSaved={(rule) => {
          setRules((prev) => {
            const existing = prev.find((r) => r.id === rule.id);
            if (existing) return prev.map((r) => (r.id === rule.id ? rule : r));
            return [...prev, rule];
          });
          setShowRuleDialog(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function CustomerLoyaltyActions({
  customer,
  rules,
  canRedeem,
  canAdjust,
  onUpdated,
}: {
  customer: CustomerLoyaltyAdmin;
  rules: Rule[];
  canRedeem: boolean;
  canAdjust: boolean;
  onUpdated: (c: CustomerLoyaltyAdmin) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [redeemPoints, setRedeemPoints] = useState("0");
  const [redeemDesc, setRedeemDesc] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  return (
    <div className="mt-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-semibold">{customer.name ?? customer.email}</h3>
        <span className="text-sm text-muted-foreground">
          Balance: <strong className="text-primary text-base">{customer.loyaltyPoints}</strong> points
        </span>
      </div>

      {canRedeem && (
        <div className="mt-4 border-t border-border pt-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Redeem reward
          </h4>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Pick a reward (or set custom points)</Label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={selectedRuleId ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setSelectedRuleId(v);
                  const rule = rules.find((r) => r.id === v);
                  if (rule?.pointsRequired) setRedeemPoints(String(rule.pointsRequired));
                  if (rule) setRedeemDesc(`${rule.description} → ${rule.rewardDescription}`);
                }}
              >
                <option value="">— Custom —</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.description} ({r.pointsRequired ?? "manual"} pts) → {r.rewardDescription}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Points to redeem</Label>
                <Input
                  type="number"
                  min={1}
                  max={customer.loyaltyPoints}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Description (shown to customer)</Label>
                <Input
                  value={redeemDesc}
                  onChange={(e) => setRedeemDesc(e.target.value)}
                  placeholder="e.g. Free mango lassi"
                />
              </div>
            </div>
            <Button
              size="sm"
              disabled={pending || !redeemPoints || !redeemDesc || parseInt(redeemPoints, 10) <= 0}
              onClick={() => {
                startTransition(async () => {
                  const res = await redeemReward({
                    customerId: customer.id,
                    ruleId: selectedRuleId,
                    pointsToRedeem: parseInt(redeemPoints, 10),
                    description: redeemDesc,
                  });
                  if (!res.ok) { toast.error(res.error); return; }
                  toast.success(`Redeemed ${redeemPoints} points. New balance: ${res.data.balanceAfter}.`);
                  onUpdated({ ...customer, loyaltyPoints: res.data.balanceAfter });
                  setRedeemPoints("0");
                  setRedeemDesc("");
                  setSelectedRuleId(null);
                });
              }}
              className="gap-1.5"
            >
              <Gift className="h-4 w-4" />
              Redeem
            </Button>
          </div>
          {selectedRule && selectedRule.pointsRequired && selectedRule.pointsRequired > customer.loyaltyPoints && (
            <p className="mt-1 text-xs text-red-600">
              Customer needs {selectedRule.pointsRequired - customer.loyaltyPoints} more points to claim this reward.
            </p>
          )}
        </div>
      )}

      {canAdjust && (
        <div className="mt-4 border-t border-border pt-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Manual adjustment
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Points (+/-)</Label>
              <Input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                placeholder="e.g. 100 or -50"
              />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Input
                value={adjustDesc}
                onChange={(e) => setAdjustDesc(e.target.value)}
                placeholder="e.g. Signup bonus, fix mistake"
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !adjustDelta || !adjustDesc}
            className="mt-2 gap-1.5"
            onClick={() => {
              startTransition(async () => {
                const res = await adjustCustomerPoints({
                  customerId: customer.id,
                  pointsDelta: parseInt(adjustDelta, 10),
                  description: adjustDesc,
                });
                if (!res.ok) { toast.error(res.error); return; }
                toast.success(`Adjusted ${adjustDelta} points. New balance: ${res.data.balanceAfter}.`);
                onUpdated({ ...customer, loyaltyPoints: res.data.balanceAfter });
                setAdjustDelta("");
                setAdjustDesc("");
              });
            }}
          >
            <Coins className="h-4 w-4" />
            Apply adjustment
          </Button>
        </div>
      )}
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  rule,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: Rule | null;
  onSaved: (rule: Rule) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [pointsRequired, setPointsRequired] = useState("");
  const [spendThreshold, setSpendThreshold] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset fields whenever the dialog opens (with a fresh rule or null).
  useState(() => {});
  // useEffect-equivalent: since the dialog is conditionally rendered, the
  // initial state above runs once; we sync via key prop trick — see below.

  const handleOpen = (open: boolean) => {
    if (open) {
      setDescription(rule?.description ?? "");
      setPointsRequired(rule?.pointsRequired != null ? String(rule.pointsRequired) : "");
      setSpendThreshold(rule?.spendThreshold != null ? String(rule.spendThreshold) : "");
      setRewardDescription(rule?.rewardDescription ?? "");
      setIsActive(rule?.isActive ?? true);
    }
    onOpenChange(open);
  };

  const handleSave = () => {
    if (!description.trim() || !rewardDescription.trim()) {
      toast.error("Description and reward are required.");
      return;
    }
    startTransition(async () => {
      const res = await upsertLoyaltyRule({
        id: rule?.id,
        description: description.trim(),
        pointsRequired: pointsRequired ? parseInt(pointsRequired, 10) : null,
        spendThreshold: spendThreshold ? parseFloat(spendThreshold) : null,
        rewardDescription: rewardDescription.trim(),
        isActive,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(rule ? "Rule updated." : "Rule created.");
      onSaved({
        id: res.data.id,
        description: description.trim(),
        pointsRequired: pointsRequired ? parseInt(pointsRequired, 10) : null,
        spendThreshold: spendThreshold ? parseFloat(spendThreshold) : null,
        rewardDescription: rewardDescription.trim(),
        isActive,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Edit reward" : "New reward"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rdesc">Description</Label>
            <Input
              id="rdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Free mango lassi"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rreward">Reward</Label>
            <Textarea
              id="rreward"
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder="e.g. Customer gets one free mango lassi on their next order"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rpts">Points required (optional)</Label>
              <Input
                id="rpts"
                type="number"
                min={1}
                value={pointsRequired}
                onChange={(e) => setPointsRequired(e.target.value)}
                placeholder="e.g. 50"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rspend">Spend threshold (optional, KSh)</Label>
              <Input
                id="rspend"
                type="number"
                min={0}
                value={spendThreshold}
                onChange={(e) => setSpendThreshold(e.target.value)}
                placeholder="e.g. 5000"
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave both blank if the reward is manually redeemed (e.g. &quot;staff discretion&quot;).
          </p>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="ractive" />
            <Label htmlFor="ractive" className="cursor-pointer">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {rule ? "Save changes" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
