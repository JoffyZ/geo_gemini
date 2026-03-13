import { getMonitoringConfigs } from "@/lib/actions/monitoring-configs";
import { getCategories } from "@/lib/actions/categories";
import { MonitoringConfigForm } from "@/components/monitoring/config-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MonitoringSettingsPage() {
  const [configs, categories] = await Promise.all([
    getMonitoringConfigs(),
    getCategories(),
  ]);

  // v1 简化：只管理一个全局监测配置
  const initialConfig = configs[0] || null;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">监测配置</h2>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>全球监测计划</CardTitle>
            <CardDescription>
              配置需要监测的国家列表、关联的业务分类以及代理服务器信息。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonitoringConfigForm 
              initialData={initialConfig} 
              categories={categories} 
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>配置说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              <strong>国家列表：</strong> 系统将针对选中的每个国家，模拟当地地理位置向 AI 引擎发起请求。
            </p>
            <p>
              <strong>业务分类：</strong> 只有属于选中分类的问题才会被包含在自动监测计划中。
            </p>
            <p>
              <strong>代理服务器：</strong> 为了提高监测的稳定性和地理模拟的准确性，建议配置高匿名的住宅代理。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
