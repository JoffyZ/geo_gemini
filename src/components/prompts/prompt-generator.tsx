"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Check, Download } from "lucide-react";
import { COUNTRIES } from "@/lib/constants";
import { createPrompts } from "@/lib/actions/prompts";
import { Badge } from "@/components/ui/badge";

export function PromptGenerator({ categories }: { categories: any[] }) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("US");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [generated, setGenerated] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name || "";
      const res = await fetch("/api/ai/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, country, category: selectedCategoryName }),
      });
      const data = await res.json();
      if (data.prompts) {
        setGenerated(data.prompts);
        setSelectedIndices(data.prompts.map((_: any, i: number) => i));
      }
    } catch (err) {
      console.error(err);
      alert("生成失败，请检查 API 配置。");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleImport = async () => {
    if (selectedIndices.length === 0) return;
    setImporting(true);
    try {
      const toImport = generated
        .filter((_, i) => selectedIndices.includes(i))
        .map((p) => ({
          content: p.content,
          categoryId: categoryId,
          countryCode: country,
          isActive: true,
        }));
      await createPrompts(toImport);
      alert(`成功导入 ${toImport.length} 个问题！`);
      setGenerated([]);
      setKeyword("");
    } catch (err) {
      console.error(err);
      alert("导入失败");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="keyword">核心关键词</Label>
          <Input
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="如: Luxury Hotels, AI SDK..."
          />
        </div>
        <div className="space-y-2">
          <Label>目标国家</Label>
          <Select value={country} onValueChange={(v) => setCountry(v || "US")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>所属业务分类</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="选择导入后的分类" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleGenerate} disabled={loading || !keyword.trim()} className="w-full">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {loading ? "正在由 AI 规划问题..." : "由 AI 自动生成监测建议"}
      </Button>

      {generated.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-semibold text-lg text-primary flex items-center">
              生成建议 <Badge className="ml-2">{generated.length}</Badge>
            </h3>
            <Button size="sm" onClick={handleImport} disabled={importing || selectedIndices.length === 0}>
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              导入所选 ({selectedIndices.length})
            </Button>
          </div>
          <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {generated.map((p, i) => (
              <Card
                key={i}
                className={`cursor-pointer transition-all border-2 ${
                  selectedIndices.includes(i) ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:border-muted"
                }`}
                onClick={() => toggleSelect(i)}
              >
                <CardContent className="p-4 flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-tight">{p.content}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase px-1 py-0 h-4">
                        {p.intentCategory}
                      </Badge>
                    </div>
                  </div>
                  <div className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${selectedIndices.includes(i) ? "bg-primary border-primary" : "bg-background"}`}>
                    {selectedIndices.includes(i) && <Check className="h-3 w-3 text-white" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
