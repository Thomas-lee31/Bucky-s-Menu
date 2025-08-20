import { PrismaClient } from '@prisma/client';
import { fetchMenuData, MenuItem } from '../utils/fetchMenuData.ts';

const prisma = new PrismaClient();

const diningHalls = ['gordon-avenue-market'] as const;
const meals = ['breakfast', 'lunch', 'dinner'] as const;

async function initializeMenuData() {
  const startDate = new Date('2025-06-29');
  const endDate = new Date();
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const fetchPromises: Promise<MenuItem[]>[] = [];

    for (const diningHall of diningHalls) {
      for (const meal of meals) {
        fetchPromises.push(fetchMenuData(new Date(date), diningHall, meal));
      }
    }

    const results = await Promise.all(fetchPromises);

    const insertPromises: Promise<any>[] = [];

    for (const menuItems of results) {
      for (const menuItem of menuItems) {
        insertPromises.push(
          prisma.menuItem.create({
            data: {
              foodId: menuItem.foodId,
              name: menuItem.name,
              date: menuItem.date.toString(),
              diningHall: menuItem.diningHall,
              meal: menuItem.meal,
            },
          }).catch((error: any) => {
            if (error.code !== 'P2002') {
              console.error(`Error adding menu item: ${menuItem.name} on ${menuItem.date}`, error);
            }
          })
        );
      }
    }

    await Promise.all(insertPromises);

    console.log(`Menu data for ${date.toDateString()} has been added.`);
  }

  console.log('Menu data initialization completed.');
}

initializeMenuData()
  .catch((error) => {
    console.error('An error occurred during menu data initialization:', error);
  })
  .finally(() => prisma.$disconnect());
