"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPrompt } from "@/lib/actions/prompts";

export function PromptForm({ categories }: { categories: any[] }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      content: formData.get("content") as string,
      categoryId: formData.get("categoryId") as string,
      countryCode: formData.get("countryCode") as string,
      isActive: true,
    };

    try {
      await createPrompt(data);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("提交失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="content">问题内容</Label>
        <Textarea
          id="content"
          name="content"
          placeholder="例如：有哪些推荐的伦敦高端酒店？"
          required
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoryId">所属分类</Label>
          <Select name="categoryId" required>
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
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

        <div className="space-y-2">
          <Label htmlFor="countryCode">适用国家</Label>
          <Select name="countryCode" defaultValue="US">
            <SelectTrigger>
              <SelectValue placeholder="选择国家" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">美国 (US)</SelectItem>
              <SelectItem value="CN">中国 (CN)</SelectItem>
              <SelectItem value="GB">英国 (GB)</SelectItem>
              <SelectItem value="JP">日本 (JP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "提交中..." : "保存问题"}
      </Button>
    </form>
  );
}
