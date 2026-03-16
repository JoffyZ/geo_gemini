"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createBrand, updateBrand } from "@/lib/actions/brands";
import type { BrandFormValues } from "@/lib/validations/brand";

interface BrandFormProps {
  initialData?: BrandFormValues & { id: string };
  onSuccess?: () => void;
}

export function BrandForm({ initialData, onSuccess }: BrandFormProps) {
  const [loading, setLoading] = useState(false);
  const [isCompetitor, setIsCompetitor] = useState(initialData?.isCompetitor ?? false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: BrandFormValues = {
      name: formData.get("name") as string,
      isCompetitor,
    };

    try {
      let result;
      if (initialData?.id) {
        result = await updateBrand(initialData.id, data);
      } else {
        result = await createBrand(data);
      }

      if (result.error) {
        alert(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
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
        <Label htmlFor="name">品牌名称</Label>
        <Input 
          id="name" 
          name="name" 
          defaultValue={initialData?.name}
          placeholder="例如：华为、苹果" 
          required 
        />
      </div>
      <div className="flex items-center space-x-2 py-2">
        <Checkbox 
          id="isCompetitor" 
          checked={isCompetitor}
          onCheckedChange={(checked) => setIsCompetitor(checked as boolean)}
        />
        <Label 
          htmlFor="isCompetitor" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          设为竞品
        </Label>
        <p className="text-xs text-muted-foreground ml-1">
          (勾选后将归类为竞品，否则归类为自有品牌)
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "提交中..." : initialData?.id ? "更新品牌" : "保存品牌"}
      </Button>
    </form>
  );
}
