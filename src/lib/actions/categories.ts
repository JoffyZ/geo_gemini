'use server';

import { db } from '@/db';
import { categories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth';
import { categorySchema, type CategoryFormValues } from '@/lib/validations/category';
import { revalidatePath } from 'next/cache';

/**
 * 获取当前租户下的所有分类
 */
export async function getCategories() {
  const tenantId = await getTenantId();
  if (!tenantId) {
    throw new Error('Unauthorized');
  }

  return await db.query.categories.findMany({
    where: eq(categories.tenantId, tenantId),
    orderBy: (categories, { desc }) => [desc(categories.createdAt)],
  });
}

/**
 * 创建新分类
 */
export async function createCategory(data: CategoryFormValues) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = categorySchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db.insert(categories).values({
      tenantId,
      name: validatedFields.data.name,
      description: validatedFields.data.description || null,
    });

    revalidatePath('/dashboard/categories');
    return { success: true };
  } catch (error) {
    console.error('Failed to create category:', error);
    return { error: 'Failed to create category' };
  }
}

/**
 * 更新分类
 */
export async function updateCategory(id: string, data: CategoryFormValues) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = categorySchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(categories)
      .set({
        name: validatedFields.data.name,
        description: validatedFields.data.description || null,
      })
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)));

    revalidatePath('/dashboard/categories');
    return { success: true };
  } catch (error) {
    console.error('Failed to update category:', error);
    return { error: 'Failed to update category' };
  }
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)));

    revalidatePath('/dashboard/categories');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete category:', error);
    return { error: 'Failed to delete category' };
  }
}
