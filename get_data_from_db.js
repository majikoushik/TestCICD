#!/usr/bin/env node
/**
 * DB Inspector — fetch and display documents from any MongoDB collection.
 *
 * Usage:
 *   npm run get_data_from_db <collection> [--limit N] [--filter '{"field":"value"}']
 *
 * Examples:
 *   npm run get_data_from_db users
 *   npm run get_data_from_db users --limit 5
 *   npm run get_data_from_db users --filter '{"role":"doctor"}'
 *   npm run get_data_from_db                     ← lists all collections
 */

require('dotenv').config();
const mongoose = require('mongoose');
const chalk = require('chalk');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const collectionName = args.find(a => !a.startsWith('--'));

let limit = 0; // 0 = no limit
let filter = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1], 10) || 0;
  }
  if (args[i] === '--filter' && args[i + 1]) {
    try {
      filter = JSON.parse(args[i + 1]);
    } catch {
      console.error(chalk.red('✗ Invalid --filter JSON. Wrap it in single quotes.'));
      process.exit(1);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function hr(char = '─', width = 80) {
  return chalk.grey(char.repeat(width));
}

function formatValue(val) {
  if (val === null) return chalk.grey('null');
  if (val === undefined) return chalk.grey('undefined');
  if (typeof val === 'boolean') return chalk.yellow(val);
  if (typeof val === 'number') return chalk.cyan(val);
  if (val instanceof Date) return chalk.magenta(val.toISOString());
  if (typeof val === 'object') return chalk.white(JSON.stringify(val));
  // string
  const s = String(val);
  return s.length > 120 ? chalk.green(s.slice(0, 117) + '...') : chalk.green(s);
}

function printDoc(doc, index) {
  console.log(chalk.bold.white(`\n  [${index + 1}]`));
  for (const [key, val] of Object.entries(doc)) {
    const keyStr = chalk.bold.blue(key.padEnd(25));
    console.log(`    ${keyStr} ${formatValue(val)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(chalk.red('✗ MONGO_URI not found in .env'));
    process.exit(1);
  }

  console.log(hr('═'));
  console.log(chalk.bold.cyan('  🔍 ClinicTrustAI — DB Inspector'));
  console.log(hr('═'));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(chalk.green('  ✓ Connected to MongoDB\n'));
  } catch (err) {
    console.error(chalk.red(`  ✗ Connection failed: ${err.message}`));
    process.exit(1);
  }

  const db = mongoose.connection.db;

  // ── No collection given → list all collections ────────────────────────────
  if (!collectionName) {
    const collections = await db.listCollections().toArray();
    console.log(chalk.bold('  Available collections:\n'));
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`    ${chalk.bold.yellow(col.name.padEnd(30))} ${chalk.cyan(count)} docs`);
    }
    console.log(`\n${hr()}`);
    console.log(chalk.grey('  Run:  npm run get_data_from_db <collection>'));
    console.log(hr());
    await mongoose.disconnect();
    return;
  }

  // ── Validate collection exists ─────────────────────────────────────────────
  const collections = await db.listCollections({ name: collectionName }).toArray();
  if (collections.length === 0) {
    const all = await db.listCollections().toArray();
    console.error(chalk.red(`  ✗ Collection "${collectionName}" not found.\n`));
    console.log(chalk.bold('  Available collections:'));
    all.forEach(c => console.log(`    ${chalk.yellow(c.name)}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  // ── Fetch documents ────────────────────────────────────────────────────────
  const col = db.collection(collectionName);
  const total = await col.countDocuments(filter);
  let cursor = col.find(filter);
  if (limit > 0) cursor = cursor.limit(limit);
  const docs = await cursor.toArray();

  // ── Header ─────────────────────────────────────────────────────────────────
  console.log(`  Collection : ${chalk.bold.yellow(collectionName)}`);
  console.log(`  Total docs : ${chalk.cyan(total)}`);
  if (Object.keys(filter).length) {
    console.log(`  Filter     : ${chalk.magenta(JSON.stringify(filter))}`);
  }
  if (limit > 0) {
    console.log(`  Showing    : ${chalk.cyan(docs.length)} of ${chalk.cyan(total)}`);
  }

  if (docs.length === 0) {
    console.log(chalk.yellow('\n  No documents found.'));
    console.log(hr());
    await mongoose.disconnect();
    return;
  }

  // ── Field summary ──────────────────────────────────────────────────────────
  const allFields = [...new Set(docs.flatMap(d => Object.keys(d)))];
  console.log(`\n${hr()}`);
  console.log(chalk.bold('  Fields found:'));
  console.log('  ' + allFields.map(f => chalk.bold.blue(f)).join('  ·  '));

  // ── Documents ──────────────────────────────────────────────────────────────
  console.log(`\n${hr()}`);
  console.log(chalk.bold('  Documents:\n'));
  docs.forEach((doc, i) => printDoc(doc, i));

  // ── Footer ─────────────────────────────────────────────────────────────────
  console.log(`\n${hr('═')}`);
  console.log(`  ${chalk.bold.cyan(docs.length)} document(s) from ${chalk.bold.yellow(collectionName)}`);
  if (limit > 0 && total > limit) {
    console.log(chalk.grey(`  (showing first ${limit} of ${total} — remove --limit to see all)`));
  }
  console.log(hr('═'));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(chalk.red(`\n✗ Unexpected error: ${err.message}`));
  process.exit(1);
});
