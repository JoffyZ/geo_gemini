'use server';

import { db } from '@/db';
import { monitoringConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth';
import { monitoringConfigSchema, type MonitoringConfigFormValues } from '@/lib/validations/monitoring-config';
import { revalidatePath } from 'next/cache';

/**
 * 获取当前租户下的所有监测配置
 */
export async function getMonitoringConfigs() {
  const tenantId = await getTenantId();
  if (!tenantId) {
    throw new Error('Unauthorized');
  }

  return await db.query.monitoringConfigs.findMany({
    where: eq(monitoringConfigs.tenantId, tenantId),
    orderBy: (monitoringConfigs, { desc }) => [desc(monitoringConfigs.createdAt)],
  });
}

/**
 * 获取单个监测配置
 */
export async function getMonitoringConfig(id: string) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    throw new Error('Unauthorized');
  }

  return await db.query.monitoringConfigs.findFirst({
    where: and(eq(monitoringConfigs.id, id), eq(monitoringConfigs.tenantId, tenantId)),
  });
}

/**
 * 创建新监测配置
 */
export async function createMonitoringConfig(data: MonitoringConfigFormValues) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = monitoringConfigSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db.insert(monitoringConfigs).values({
      tenantId,
      name: validatedFields.data.name,
      activeCountries: validatedFields.data.activeCountries,
      activeCategories: validatedFields.data.activeCategories,
      proxyConfig: validatedFields.data.proxyConfig || {},
      isActive: validatedFields.data.isActive,
    });

    revalidatePath('/dashboard/settings/monitoring');
    return { success: true };
  } catch (error) {
    console.error('Failed to create monitoring config:', error);
    return { error: 'Failed to create monitoring config' };
  }
}

/**
 * 更新监测配置
 */
export async function updateMonitoringConfig(id: string, data: MonitoringConfigFormValues) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = monitoringConfigSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(monitoringConfigs)
      .set({
        name: validatedFields.data.name,
        activeCountries: validatedFields.data.activeCountries,
        activeCategories: validatedFields.data.activeCategories,
        proxyConfig: validatedFields.data.proxyConfig || {},
        isActive: validatedFields.data.isActive,
      })
      .where(and(eq(monitoringConfigs.id, id), eq(monitoringConfigs.tenantId, tenantId)));

    revalidatePath('/dashboard/settings/monitoring');
    return { success: true };
  } catch (error) {
    console.error('Failed to update monitoring config:', error);
    return { error: 'Failed to update monitoring config' };
  }
}

/**
 * 删除监测配置
 */
export async function deleteMonitoringConfig(id: string) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .delete(monitoringConfigs)
      .where(and(eq(monitoringConfigs.id, id), eq(monitoringConfigs.tenantId, tenantId)));

    revalidatePath('/dashboard/settings/monitoring');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete monitoring config:', error);
    return { error: 'Failed to delete monitoring config' };
  }
}
