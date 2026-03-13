import * as z from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, '名称不能为空').max(50, '名称最多50个字符'),
  description: z.string().max(200, '描述最多200个字符').optional().nullable(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
