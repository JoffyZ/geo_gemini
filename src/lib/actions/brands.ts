'use server';

import { db } from '@/db';
import { brands } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth';
import { brandSchema, type BrandFormValues } from '@/lib/validations/brand';
import { revalidatePath } from 'next/cache';

/**
 * 获取当前租户下的所有品牌
 */
export async function getBrands() {
  const tenantId = await getTenantId();
  if (!tenantId) {
    throw new Error('Unauthorized');
  }

  return await db.query.brands.findMany({
    where: eq(brands.tenantId, tenantId),
    orderBy: (brands, { desc }) => [desc(brands.createdAt)],
  });
}

/**
 * 创建新品牌
 */
export async function createBrand(data: BrandFormValues) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = brandSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db.insert(brands).values({
      tenantId,
      name: validatedFields.data.name,
      isCompetitor: validatedFields.data.isCompetitor,
    });

    revalidatePath('/dashboard/brands');
    return { success: true };
  } catch (error) {
    console.error('Failed to create brand:', error);
    return { error: 'Failed to create brand' };
  }
}

/**
 * 更新品牌
 */
export async function updateBrand(id: string, data: BrandFormValues) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = brandSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(brands)
      .set({
        name: validatedFields.data.name,
        isCompetitor: validatedFields.data.isCompetitor,
      })
      .where(and(eq(brands.id, id), eq(brands.tenantId, tenantId)));

    revalidatePath('/dashboard/brands');
    return { success: true };
  } catch (error) {
    console.error('Failed to update brand:', error);
    return { error: 'Failed to update brand' };
  }
}

/**
 * 删除品牌
 */
export async function deleteBrand(id: string) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .delete(brands)
      .where(and(eq(brands.id, id), eq(brands.tenantId, tenantId)));

    revalidatePath('/dashboard/brands');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete brand:', error);
    return { error: 'Failed to delete brand' };
  }
}
