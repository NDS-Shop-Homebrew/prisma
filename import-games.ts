import { PrismaClient } from '@nds-shop/prisma';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const archiveDir = path.join('D:', 'Projets', 'NDS-Shop-all-project', 'db-nds-shop', 'archive');

function safeString(val: any, fallback = '') {
  return val ?? fallback;
}

function safeJson(val: any, fallback: any[] = []) {
  return JSON.stringify(val ?? fallback);
}

function safeBool(val: any, fallback = false) {
  return val ?? fallback;
}

function safeInt(val: any, fallback = 0) {
  return val ?? fallback;
}

function safeDate(val: any) {
  return val ? new Date(val) : new Date();
}

async function importGames() {
  const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} game files`);

  for (const file of files) {
    const content = fs.readFileSync(path.join(archiveDir, file), 'utf-8');
    const game = JSON.parse(content);

    try {
      await prisma.game.create({
        data: {
          id: game.titleId || game.title.replace(/\s+/g, '-').toLowerCase(),
          title: safeString(game.title),
          author: safeString(game.author),
          developer: safeString(game.developer, game.author),
          publisher: safeString(game.publisher, game.author),
          version: safeString(game.version),
          titleId: safeString(game.titleId),
          systems: safeJson(game.systems),
          genres: safeJson(game.genres),
          categories: safeJson(game.categories),
          color: safeString(game.color, '#3498db'),
          colorBg: safeString(game.color_bg, '#2980b9'),
          priority: safeBool(game.priority),
          stars: safeInt(game.stars),
          iconUrl: safeString(game.icon, 'data:image/png;base64,placeholder'),
          imageUrl: safeString(game.image, game.boxart || ''),
          boxartUrl: safeString(game.boxart, game.image || ''),
          updatedAt: safeDate(game.updated),
          downloads: {
            create: Object.entries(game.downloads || {}).map(([filename, info]: [string, any]) => ({
              filename,
              url: info.url,
              size: BigInt(info.size || 0),
            })),
          },
          scripts: {
            create: Object.entries(game.scripts || {}).flatMap(([filename, scripts]: [string, any[]]) =>
              scripts.map((s: any) => ({
                type: s.type,
                file: s.file,
                output: s.output,
              }))
            ),
          },
          screenshots: {
            create: (game.screenshots || []).map((s: any, i: number) => ({
              url: s.url,
              order: s.order ?? i,
            })),
          },
        },
      });
      console.log(`✓ Imported: ${game.title}`);
    } catch (e: any) {
      console.error(`✗ Failed: ${game.title} - ${e.message}`);
    }
  }

  console.log('Import complete');
  await prisma.$disconnect();
}

importGames();