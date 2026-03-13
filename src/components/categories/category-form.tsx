"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCategory } from "@/lib/actions/categories";

export function CategoryForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };

    try {
      const result = await createCategory(data);
      if (result.error) {
        alert(JSON.stringify(result.error));
      } else {
        // 关闭弹窗通常需要状态管理，这里为了简化先刷新页面
        window.location.reload();
      }
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
        <Label htmlFor="name">分类名称</Label>
        <Input id="name" name="name" placeholder="例如：品牌词、竞品分析" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">描述 (可选)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="简要描述该分类的用途..."
          rows={3}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "提交中..." : "保存分类"}
      </Button>
    </form>
  );
}
