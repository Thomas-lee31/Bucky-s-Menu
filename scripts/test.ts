import { test, fetchMenuData } from '../utils/fetchMenuData';

const diningHalls = ['gordon-avenue-market'] as const;
const meals = ['breakfast', 'lunch', 'dinner'] as const;

async function main() {
    const today = new Date();
    // const days = await test(new Date(today), 'gordon-avenue-market', 'lunch'); // Await the test function
    // console.log(days[0].menu_items[1].food); // Log the result of the test function
    // console.log('Menu initialization complete.');
    const items = await fetchMenuData(new Date(today), 'gordon-avenue-market', 'lunch');
    console.log(items);
}

// Call the main function and handle errors
main().catch(console.error);