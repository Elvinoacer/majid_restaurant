"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type MenuSearchBarProps = {
  value: string;
  onChange: (v: string) => void;
};

export function MenuSearchBar({ value, onChange }: MenuSearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Search dishes, ingredients, or tags…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 pl-9 pr-9 text-base"
        aria-label="Search the menu"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
