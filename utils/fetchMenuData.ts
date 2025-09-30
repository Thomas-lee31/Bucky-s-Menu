import axios from 'axios';

type MealType = 'breakfast' | 'lunch' | 'dinner';
type DiningHall = 'gordon-avenue-market' | 'four-lakes-market' | 'lizs-market' | 'lowell-market' | 'rhetas-market' | 'carsons-market';

export interface MenuItem {
    foodId: string;
    name: string;
    date: string;
    diningHall: string;
    meal: MealType;
}

export async function fetchMenuData(
    date: Date,
    diningHall: DiningHall,
    meal: MealType
): Promise<MenuItem[]> {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    const url = `https://wisc-housingdining.api.nutrislice.com/menu/api/weeks/school/${diningHall}/menu-type/${meal}/${year}/${month}/${day}/`;

    try {
        const response = await axios.get(url);
        const days = response.data.days || [];

        const items: MenuItem[] = [];

        for (const dayObj of days) {
            if (dayObj.date !== `${year}-${month}-${day}`) continue; // Ensure we only process the correct date
            for (const item of dayObj.menu_items || []) {
                if(!item.food || !item.food.id || !item.food.name) continue; // Ensure food data is valid
                items.push({
                    foodId: String(item.food.id),
                    name: item.food.name,
                    date: dayObj.date,
                    diningHall: diningHall,
                    meal: meal,
                });
            }
        }

        return items;
    } catch (error) {
        console.error(`Failed to fetch menu for ${diningHall} - ${meal} - ${date.toDateString()}`);
        console.error(error);
        return [];
    }
}

export async function test(
    date: Date,
    diningHall: DiningHall,
    meal: MealType
): Promise<any> {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    const url = `https://wisc-housingdining.api.nutrislice.com/menu/api/weeks/school/${diningHall}/menu-type/${meal}/${year}/${month}/${day}/`;

    try {
        const response = await axios.get(url);
        const days = response.data.days || [];
        return days
    } catch (error) {
        console.error(`Failed to fetch menu for ${diningHall} - ${meal} - ${date.toDateString()}`);
        return [];
    }
}