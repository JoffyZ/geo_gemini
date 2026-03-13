"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deletePrompt } from "@/lib/actions/prompts";
import { Trash2 } from "lucide-react";

export function PromptList({ prompts }: { prompts: any[] }) {
  const handleDelete = async (id: string) => {
    if (confirm("确定要删除此问题吗？")) {
      await deletePrompt(id);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[400px]">问题内容</TableHead>
            <TableHead>所属分类</TableHead>
            <TableHead>适用国家</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prompts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4">
                没有找到符合条件的问题。
              </TableCell>
            </TableRow>
          ) : (
            prompts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.content}</TableCell>
                <TableCell>{p.category?.name || "未分类"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{p.countryCode || "Global"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={p.isActive ? "success" : "secondary"}>
                    {p.isActive ? "活跃" : "禁用"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
