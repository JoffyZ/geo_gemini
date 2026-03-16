import { Suspense } from "react";
import { getBrands } from "@/lib/actions/brands";
import { BrandTable } from "@/components/brands/brand-table";
import { BrandForm } from "@/components/brands/brand-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function BrandsPage() {
  const brands = await getBrands();
  const myBrands = brands.filter((b) => !b.isCompetitor);
  const competitors = brands.filter((b) => b.isCompetitor);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">品牌管理</h2>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> 新增品牌
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>创建品牌</DialogTitle>
                <DialogDescription>
                  添加一个品牌或竞品以用于监测分析。
                </DialogDescription>
              </DialogHeader>
              <BrandForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部品牌 ({brands.length})</TabsTrigger>
          <TabsTrigger value="mine">自有品牌 ({myBrands.length})</TabsTrigger>
          <TabsTrigger value="competitors">竞品 ({competitors.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>全部品牌</CardTitle>
              <CardDescription>
                管理所有已配置的品牌和竞品。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>加载中...</div>}>
                <BrandTable brands={brands} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>自有品牌</CardTitle>
              <CardDescription>
                管理您的核心品牌。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>加载中...</div>}>
                <BrandTable brands={myBrands} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>竞品列表</CardTitle>
              <CardDescription>
                配置您希望进行对比分析的竞争对手品牌。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>加载中...</div>}>
                <BrandTable brands={competitors} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
