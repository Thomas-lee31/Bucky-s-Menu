import { PrismaClient } from '@prisma/client';
import { fetchMenuData, MenuItem } from '../utils/fetchMenuData.ts';

const prisma = new PrismaClient();

const diningHalls = ['gordon-avenue-market', 'four-lakes-market', 'lizs-market', 'lowell-market', 'rhetas-market', 'carsons-market'] as const;
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

    // Use createMany for better performance and to avoid prepared statement conflicts
    const allMenuItems: MenuItem[] = results.flat();
    
    try {
      const result = await prisma.menuItem.createMany({
        data: allMenuItems.map(item => ({
          foodId: item.foodId,
          name: item.name,
          date: item.date.toString(),
          diningHall: item.diningHall,
          meal: item.meal,
        })),
        skipDuplicates: true
      });
      console.log(`Added ${result.count} new menu items (duplicates skipped)`);
    } catch (error: any) {
      console.error('Error adding menu items:', error.message);
    }

    console.log(`Menu data for ${currentDate.toDateString()} has been added.`);

  console.log('Menu data initialization completed.');
}

initializeMenuData()
  .catch((error) => {
    console.error('An error occurred during menu data initialization:', error);
  })
  .finally(() => prisma.$disconnect());
