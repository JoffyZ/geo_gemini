"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTRIES } from "@/lib/constants";
import { updateMonitoringConfig, createMonitoringConfig } from "@/lib/actions/monitoring-configs";

interface MonitoringConfigFormProps {
  initialData: any;
  categories: any[];
}

export function MonitoringConfigForm({ initialData, categories }: MonitoringConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<string[]>(initialData?.activeCountries || []);
  const [activeCategories, setActiveCategories] = useState<string[]>(initialData?.activeCategories || []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      name: formData.get("name") as string,
      activeCountries: countries,
      activeCategories: activeCategories,
      proxyConfig: {
        host: formData.get("proxyHost") as string,
        port: formData.get("proxyPort") as string,
      },
      isActive: true,
    };

    try {
      if (initialData?.id) {
        await updateMonitoringConfig(initialData.id, data);
      } else {
        await createMonitoringConfig(data);
      }
      alert("保存成功！");
    } catch (error) {
      console.error(error);
      alert("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (code: string) => {
    setCountries(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleCategory = (id: string) => {
    setActiveCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">方案名称</Label>
        <Input id="name" name="name" defaultValue={initialData?.name || "默认监测计划"} required />
      </div>

      <div className="space-y-3">
        <Label>目标监测国家</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {COUNTRIES.map((c) => (
            <div key={c.code} className="flex items-center space-x-2">
              <Checkbox 
                id={`country-${c.code}`} 
                checked={countries.includes(c.code)}
                onCheckedChange={() => toggleCountry(c.code)}
              />
              <Label htmlFor={`country-${c.code}`} className="text-xs">{c.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>参与监测的业务分类</Label>
        <div className="grid grid-cols-1 gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`cat-${cat.id}`} 
                checked={activeCategories.includes(cat.id)}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
              <Label htmlFor={`cat-${cat.id}`} className="text-sm">{cat.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="proxyHost">代理服务器 Host</Label>
          <Input id="proxyHost" name="proxyHost" defaultValue={initialData?.proxyConfig?.host} placeholder="可选" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proxyPort">代理端口 Port</Label>
          <Input id="proxyPort" name="proxyPort" defaultValue={initialData?.proxyConfig?.port} placeholder="可选" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "保存中..." : "保存配置"}
      </Button>
    </form>
  );
}
