import { PrismaClient } from '@prisma/client';
import { fetchMenuData, MenuItem } from '../utils/fetchMenuData.ts';

const prisma = new PrismaClient();

const diningHalls = ['gordon-avenue-market'] as const;
const meals = ['breakfast', 'lunch', 'dinner'] as const;

async function initializeMenuData() {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 4);

    const fetchPromises: Promise<MenuItem[]>[] = [];

    for (const diningHall of diningHalls) {
      for (const meal of meals) {
        fetchPromises.push(fetchMenuData(new Date(currentDate), diningHall, meal));
      }
    }

    const results = await Promise.all(fetchPromises);

    // Process items sequentially to avoid prepared statement issues with transaction pooler
    const allMenuItems: MenuItem[] = results.flat();
    
    for (const menuItem of allMenuItems) {
      try {
        await prisma.menuItem.create({
          data: {
            foodId: menuItem.foodId,
            name: menuItem.name,
            date: menuItem.date.toString(),
            diningHall: menuItem.diningHall,
            meal: menuItem.meal,
          },
        });
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`Error adding menu item: ${menuItem.name} on ${menuItem.date}`, error.message);
        }
      }
    }

    console.log(`Menu data for ${currentDate.toDateString()} has been added.`);

  console.log('Menu data initialization completed.');
}

initializeMenuData()
  .catch((error) => {
    console.error('An error occurred during menu data initialization:', error);
  })
  .finally(() => prisma.$disconnect());
