"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Power, Search, Gift, Coins, TrendingUp, History } from "lucide-react";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  upsertLoyaltyRule,
  deleteLoyaltyRule,
  toggleLoyaltyRule,
  searchCustomersForLoyalty,
  redeemReward,
  adjustCustomerPoints,
  updateLoyaltyAccrualRatio,
  getCustomerLedgerAdmin,
  type CustomerLoyaltyAdmin,
  type LoyaltyLedgerEntryAdmin,
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

type LedgerEntry = {
  id: string;
  entryType: "ACCRUAL" | "REDEMPTION" | "ADJUSTMENT" | "EXPIRY";
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  staffUserName: string | null;
  orderId: string | null;
  loyaltyRuleId: string | null;
};

const ENTRY_TONE: Record<LedgerEntry["entryType"], string> = {
  ACCRUAL: "bg-green-500/15 text-green-700",
  REDEMPTION: "bg-orange-500/15 text-orange-700",
  ADJUSTMENT: "bg-blue-500/15 text-blue-700",
  EXPIRY: "bg-muted text-muted-foreground",
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
  const [showLedger, setShowLedger] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  // Track which customer the cached ledger belongs to so we can invalidate
  // when the customer changes — avoids the setState-in-effect anti-pattern.
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  // If the selected customer has changed, drop any cached ledger so the
  // next "View ledger" expand re-fetches for the new customer.
  if (ledgerCustomerId !== customer.id && ledgerCustomerId !== null) {
    setLedger([]);
    setLedgerCustomerId(customer.id);
    setShowLedger(false);
  }

  // Fetch the audit ledger when the panel is expanded (and we don't have a
  // fresh cache for this customer).
  const needsLedgerFetch =
    showLedger && ledger.length === 0 && !ledgerLoading && ledgerCustomerId !== customer.id;
  if (needsLedgerFetch) {
    setLedgerCustomerId(customer.id);
    setLedgerLoading(true);
    startTransition(async () => {
      const entries = await getCustomerLedgerAdmin(customer.id);
      setLedger(entries as LedgerEntry[]);
      setLedgerLoading(false);
    });
  }

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
              <Select
                value={selectedRuleId ?? "__custom__"}
                onValueChange={(v) => {
                  const id = v === "__custom__" ? null : v;
                  setSelectedRuleId(id);
                  const rule = rules.find((r) => r.id === id);
                  if (rule?.pointsRequired) setRedeemPoints(String(rule.pointsRequired));
                  if (rule) setRedeemDesc(`${rule.description} → ${rule.rewardDescription}`);
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="— Custom —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">— Custom —</SelectItem>
                  {rules.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.description} ({r.pointsRequired ?? "manual"} pts) → {r.rewardDescription}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                setLedgerCustomerId(null); // invalidate cache → force re-fetch on next expand
              });
            }}
          >
            <Coins className="h-4 w-4" />
            Apply adjustment
          </Button>
        </div>
      )}

      {/* Audit ledger (PRD §5.11) */}
      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setShowLedger((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          aria-expanded={showLedger}
        >
          <History className="h-3.5 w-3.5" />
          {showLedger ? "Hide" : "View"} audit ledger
        </button>
        {showLedger && (
          <div className="mt-2">
            {ledgerLoading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading ledger…
              </p>
            ) : ledger.length === 0 ? (
              <p className="text-xs text-muted-foreground">No ledger entries yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">When</th>
                      <th className="px-2 py-1.5">Type</th>
                      <th className="px-2 py-1.5 text-right">Δ</th>
                      <th className="px-2 py-1.5 text-right">Balance</th>
                      <th className="px-2 py-1.5">Description</th>
                      <th className="px-2 py-1.5">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledger.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                          {new Date(e.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}{" "}
                          {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase", ENTRY_TONE[e.entryType])}>
                            {e.entryType.toLowerCase()}
                          </span>
                        </td>
                        <td className={cn("px-2 py-1.5 text-right font-mono", e.points >= 0 ? "text-green-700" : "text-orange-700")}>
                          {e.points >= 0 ? "+" : ""}{e.points}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">{e.balanceAfter}</td>
                        <td className="px-2 py-1.5">{e.description}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{e.staffUserName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
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
