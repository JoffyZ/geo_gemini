import { Suspense } from "react";
import { getCategories } from "@/lib/actions/categories";
import { CategoryTable } from "@/components/categories/category-table";
import { CategoryForm } from "@/components/categories/category-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">分类管理</h2>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> 新增分类
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>创建分类</DialogTitle>
                <DialogDescription>
                  为您的监测问题定义一个新的分类。
                </DialogDescription>
              </DialogHeader>
              <CategoryForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>所有分类</CardTitle>
            <CardDescription>
              管理您的业务线或问题性质分类。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>加载中...</div>}>
              <CategoryTable categories={categories} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
