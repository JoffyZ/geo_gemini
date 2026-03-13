import { db } from './src/db';
import { prompts, tenants, categories } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function checkData() {
  try {
    const allTenants = await db.select().from(tenants);
    console.log('Tenants:', allTenants);

    const allCategories = await db.select().from(categories);
    console.log('Categories:', allCategories);

    const allPrompts = await db.select().from(prompts);
    console.log('Prompts:', allPrompts);

    if (allPrompts.length === 0) {
      console.log('No prompts found. Inserting a test prompt...');
      // 插入一个测试租户和分类以支持 Prompt
      const [newTenant] = await db.insert(tenants).values({ name: 'Test Tenant' }).returning();
      const [newCategory] = await db.insert(categories).values({ 
        tenantId: newTenant.id, 
        name: 'Test Category' 
      }).returning();
      const [newPrompt] = await db.insert(prompts).values({
        tenantId: newTenant.id,
        categoryId: newCategory.id,
        content: 'What is the best coffee shop in London?',
        isActive: true
      }).returning();
      console.log('Inserted test prompt:', newPrompt);
    }
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    process.exit(0);
  }
}

checkData();
