"use client";

import { SearchInput } from "@/components/premium/search-input";

type MenuSearchBarProps = {
  value: string;
  onChange: (v: string) => void;
};

/**
 * Thin wrapper around the shared SearchInput so the existing menu code
 * keeps its prop signature. All visual styling now lives in one place.
 */
export function MenuSearchBar({ value, onChange }: MenuSearchBarProps) {
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      placeholder="Search dishes, ingredients, or tags…"
      ariaLabel="Search the menu"
    />
  );
}
