import * as z from 'zod';

export const monitoringConfigSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(50, '名称最多50个字符'),
  activeCountries: z.array(z.string()).min(1, '请至少选择一个国家'),
  activeCategories: z.array(z.string()).min(1, '请至少选择一个分类'),
  proxyConfig: z.object({
    host: z.string().optional(),
    port: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type MonitoringConfigFormValues = z.infer<typeof monitoringConfigSchema>;
