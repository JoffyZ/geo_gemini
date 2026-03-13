"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function PromptFilters({ categories }: { categories: any[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4 items-end bg-muted/50 p-4 rounded-lg">
      <div className="space-y-2">
        <Label className="text-xs">按分类筛选</Label>
        <Select
          value={searchParams.get("category") || "all"}
          onValueChange={(v) => handleFilterChange("category", v)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="所有分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">按国家筛选</Label>
        <Select
          value={searchParams.get("country") || "all"}
          onValueChange={(v) => handleFilterChange("country", v)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="所有国家" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有国家</SelectItem>
            <SelectItem value="US">美国 (US)</SelectItem>
            <SelectItem value="CN">中国 (CN)</SelectItem>
            <SelectItem value="GB">英国 (GB)</SelectItem>
            <SelectItem value="JP">日本 (JP)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
