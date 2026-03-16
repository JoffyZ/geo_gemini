import * as z from 'zod';

export const brandSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(50, '名称最多50个字符'),
  isCompetitor: z.boolean().default(false),
});

export type BrandFormValues = z.infer<typeof brandSchema>;
