"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { upsertMenuItem } from "@/lib/menu/actions";

type Category = { id: string; name: string };

export function MenuItemForm({
  slug,
  item,
  categories,
}: {
  slug: string;
  item: {
    id?: string;
    name?: string;
    description?: string | null;
    price?: number;
    imageUrl?: string | null;
    categoryId?: string;
    isAvailable?: boolean;
    isPopular?: boolean;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isSpicy?: boolean;
    isHalal?: boolean;
    tags?: string[];
    mealBuilderStage?: string | null;
  } | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(String(item?.price ?? ""));
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  // Default to the item's category, else the first category on the list.
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? categories[0]?.id ?? "",
  );
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [isPopular, setIsPopular] = useState(item?.isPopular ?? false);
  const [isVegetarian, setIsVegetarian] = useState(item?.isVegetarian ?? false);
  const [isVegan, setIsVegan] = useState(item?.isVegan ?? false);
  const [isSpicy, setIsSpicy] = useState(item?.isSpicy ?? false);
  const [isHalal, setIsHalal] = useState(item?.isHalal ?? true);
  const [tags, setTags] = useState((item?.tags ?? []).join(", "));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim() || !categoryId) {
      toast.error("Name, price, and category are required");
      return;
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("Price must be a non-negative number");
      return;
    }

    startTransition(async () => {
      const result = await upsertMenuItem({
        id: item?.id,
        name: name.trim(),
        description: description.trim() || null,
        price: priceNum,
        imageUrl: imageUrl.trim() || null,
        categoryId,
        isAvailable,
        isPopular,
        isVegetarian,
        isVegan,
        isSpicy,
        isHalal,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        mealBuilderStage: null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(item?.id ? "Item updated" : "Item created");
      router.push(`/${slug}/admin/menu`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {item?.id ? "Edit menu item" : "New menu item"}
        </h1>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="price">Price (KSh)</Label>
            <Input id="price" type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cat">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="cat" className="mt-1">
                <SelectValue placeholder="Pick category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="img">Image URL</Label>
          <Input id="img" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="biryani, spicy, signature" className="mt-1" />
          <p className="mt-1 text-xs text-muted-foreground">
            Used by search and AI recommendation matching.
          </p>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Flags
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToggleRow label="Available" description="Show as orderable on menu" checked={isAvailable} onChange={setIsAvailable} />
          <ToggleRow label="Popular today" description="Badge + appears in popular section" checked={isPopular} onChange={setIsPopular} />
          <ToggleRow label="Vegetarian" description="Leaf icon shown" checked={isVegetarian} onChange={setIsVegetarian} />
          <ToggleRow label="Vegan" description="Sparkles icon shown" checked={isVegan} onChange={setIsVegan} />
          <ToggleRow label="Spicy" description="Flame icon shown" checked={isSpicy} onChange={setIsSpicy} />
          <ToggleRow label="Halal" description="Halal label shown" checked={isHalal} onChange={setIsHalal} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          {item?.id ? "Save changes" : "Create item"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${slug}/admin/menu`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md border border-border p-2.5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
