"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { deleteBrand } from "@/lib/actions/brands";
import { Trash, Pencil as PencilIcon } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BrandForm } from "./brand-form";

export function BrandTable({ brands }: { brands: any[] }) {
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除此品牌吗？")) {
      await deleteBrand(id);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingBrand(null);
    window.location.reload();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>类别</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="text-right pr-6">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                暂无品牌数据，请先添加。
              </TableCell>
            </TableRow>
          ) : (
            brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell>
                  {brand.isCompetitor ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
                      竞品
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                      自有品牌
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(brand.createdAt), "yyyy-MM-dd HH:mm")}
                </TableCell>
                <TableCell className="text-right space-x-2 pr-4">
                  <Dialog open={isEditDialogOpen && editingBrand?.id === brand.id} onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setEditingBrand(null);
                  }}>
                    <DialogTrigger render={
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingBrand(brand);
                        setIsEditDialogOpen(true);
                      }} />
                    }>
                      <PencilIcon className="h-4 w-4" />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>编辑品牌</DialogTitle>
                        <DialogDescription>
                          修改品牌信息并保存。
                        </DialogDescription>
                      </DialogHeader>
                      <BrandForm 
                        initialData={brand} 
                        onSuccess={handleEditSuccess}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/5"
                    onClick={() => handleDelete(brand.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
