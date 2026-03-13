"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createMonitoringConfig, updateMonitoringConfig } from "@/lib/actions/monitoring-configs";
import { COUNTRIES } from "@/lib/constants";
import { Category } from "@/db/schema";

interface MonitoringConfigFormProps {
  categories: any[];
  initialData?: any;
}

export function MonitoringConfigForm({ categories, initialData }: MonitoringConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeCountries, setActiveCountries] = useState<string[]>(initialData?.activeCountries || []);
  const [activeCategories, setActiveCategories] = useState<string[]>(initialData?.activeCategories || []);

  const handleCountryToggle = (code: string) => {
    setActiveCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleCategoryToggle = (id: string) => {
    setActiveCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      activeCountries,
      activeCategories,
      proxyConfig: {
        host: formData.get("proxyHost") as string,
        port: formData.get("proxyPort") as string,
        username: formData.get("proxyUser") as string,
        password: formData.get("proxyPass") as string,
      },
      isActive: true,
    };

    try {
      let result;
      if (initialData?.id) {
        result = await updateMonitoringConfig(initialData.id, data);
      } else {
        result = await createMonitoringConfig(data);
      }

      if (result.error) {
        alert(JSON.stringify(result.error));
      } else {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基础配置</CardTitle>
          <CardDescription>设置监测计划的名称</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">配置名称</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="例如：全球品牌监测" 
              defaultValue={initialData?.name}
              required 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>监测范围</CardTitle>
          <CardDescription>选择需要监测的国家和分类</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>选择国家</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {COUNTRIES.map((country) => (
                <div key={country.code} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`country-${country.code}`}
                    checked={activeCountries.includes(country.code)}
                    onChange={() => handleCountryToggle(country.code)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor={`country-${country.code}`} className="font-normal cursor-pointer">
                    {country.name} ({country.code})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>选择分类</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`category-${category.id}`}
                    checked={activeCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor={`category-${category.id}`} className="font-normal cursor-pointer">
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>代理配置</CardTitle>
          <CardDescription>配置全球化监测所需的代理服务器</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proxyHost">代理主机 (Host)</Label>
            <Input 
              id="proxyHost" 
              name="proxyHost" 
              placeholder="127.0.0.1" 
              defaultValue={initialData?.proxyConfig?.host}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxyPort">代理端口 (Port)</Label>
            <Input 
              id="proxyPort" 
              name="proxyPort" 
              placeholder="8080" 
              defaultValue={initialData?.proxyConfig?.port}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxyUser">用户名 (Username)</Label>
            <Input 
              id="proxyUser" 
              name="proxyUser" 
              placeholder="optional" 
              defaultValue={initialData?.proxyConfig?.username}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxyPass">密码 (Password)</Label>
            <Input 
              id="proxyPass" 
              name="proxyPass" 
              type="password"
              placeholder="optional" 
              defaultValue={initialData?.proxyConfig?.password}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? "提交中..." : "保存监测配置"}
        </Button>
      </div>
    </form>
  );
}
