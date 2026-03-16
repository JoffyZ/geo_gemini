import { Suspense } from "react";
import { getPrompts } from "@/lib/actions/prompts";
import { getCategories } from "@/lib/actions/categories";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptForm } from "@/components/prompts/prompt-form";
import { PromptFilters } from "@/components/prompts/prompt-filters";
import { PromptGenerator } from "@/components/prompts/prompt-generator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    country?: string;
  }>;
}

export default async function PromptsPage({ searchParams }: PageProps) {
  const { category, country } = await searchParams;
  
  const [prompts, categories] = await Promise.all([
    getPrompts({ categoryId: category, countryCode: country }),
    getCategories(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">问题库管理</h2>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" className="border-primary text-primary hover:bg-primary/5" />}>
              <Sparkles className="mr-2 h-4 w-4" /> AI 智能生成
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>AI 智能生成监测建议</DialogTitle>
                <DialogDescription>
                  输入核心关键词，AI 将为您生成符合不同营销漏斗阶段的 GEO 监测问题。
                </DialogDescription>
              </DialogHeader>
              <PromptGenerator categories={categories} />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> 新增问题
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>添加监测问题</DialogTitle>
                <DialogDescription>
                  输入您想要在 AI 引擎中监测的具体问题。
                </DialogDescription>
              </DialogHeader>
              <PromptForm categories={categories} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <PromptFilters categories={categories} />
        
        <Card>
          <CardHeader>
            <CardTitle>监测问题列表</CardTitle>
            <CardDescription>
              管理您的 GEO 监测问题集。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>加载中...</div>}>
              <PromptList prompts={prompts} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
