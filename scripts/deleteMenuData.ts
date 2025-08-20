import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteMenuData() {
  try {
    await prisma.menuItem.deleteMany();
    console.log('All menu data has been deleted.');
  } catch (error) {
    console.error('An error occurred while deleting menu data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteMenuData();