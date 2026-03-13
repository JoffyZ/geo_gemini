"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { SourceStats, CategoryData } from "@/lib/actions/sources";
import { Badge } from "@/components/ui/badge";

export function SourceAnalysis({ data }: { data: SourceStats }) {
  const top10Sources = useMemo(() => data.topSources.slice(0, 10), [data]);

  if (data.totalCitations === 0) {
    return (
      <Card className="flex items-center justify-center h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">暂无引用来源数据</p>
          <p className="text-xs text-muted-foreground/60">开始监测后，系统将自动分析 AI 引擎引用的网站来源。</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>来源类型分布</CardTitle>
          <CardDescription>
            AI 引擎引用网站的分类比例。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Top 10 引用来源</CardTitle>
          <CardDescription>
            被 AI 引擎引用次数最多的网站域名。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Sources} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="domain" 
                  type="category" 
                  tick={{ fontSize: 12 }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>详细来源清单</CardTitle>
          <CardDescription>
            全量引用域名的分类统计。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.topSources.map((source, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium truncate max-w-[150px]">{source.domain}</p>
                  <Badge variant="outline" className="text-[10px] scale-90 -ml-1">
                    {source.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">{source.count}</p>
                  <p className="text-[10px] text-muted-foreground">引用</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
