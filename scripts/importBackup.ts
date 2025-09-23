import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importBackup() {
  const backupContent = fs.readFileSync('local_data_backup.sql', 'utf-8');
  const lines = backupContent.split('\n');
  
  const insertLines = lines.filter(line => line.startsWith('INSERT INTO'));
  console.log(`Found ${insertLines.length} INSERT statements`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const line of insertLines) {
    // Extract values from INSERT statement
    const match = line.match(/VALUES \('([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\);/);
    
    if (!match) continue;
    
    const [, id, foodId, name, date, diningHall, meal, createdAt] = match;
    
    try {
      await prisma.menuItem.create({
        data: {
          id,
          foodId,
          name,
          date,
          diningHall,
          meal,
          createdAt: new Date(createdAt),
        },
      });
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`Imported ${imported} records...`);
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        skipped++;
      } else {
        console.error(`Error importing record: ${name} on ${date}`, error.message);
      }
    }
  }
  
  console.log(`Import complete: ${imported} imported, ${skipped} skipped (duplicates)`);
}

importBackup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());