import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration Script: Transfers Users and Department/Settings Data from Local MongoDB to Cloud MongoDB
 * Usage:
 *   node src/scripts/migrateToCloud.js "<CLOUD_MONGODB_URI>"
 * Or sets MONGODB_URI in server/.env and runs:
 *   node src/scripts/migrateToCloud.js
 */

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/attendrive';
const CLOUD_URI = process.argv[2] || process.env.CLOUD_MONGODB_URI || process.env.MONGODB_URI;

export const runMigration = async () => {
  if (!CLOUD_URI || CLOUD_URI === LOCAL_URI || CLOUD_URI.includes('127.0.0.1') || CLOUD_URI.includes('localhost')) {
    console.error('❌ Error: A valid remote/cloud MongoDB connection URI must be provided.');
    console.log('Usage: node src/scripts/migrateToCloud.js "mongodb+srv://<user>:<password>@cluster0.../attendrive?retryWrites=true&w=majority"');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🔄 Starting Data Migration: Local -> Cloud MongoDB');
  console.log(`📍 Source (Local): ${LOCAL_URI}`);
  console.log(`☁️  Target (Cloud): ${CLOUD_URI.replace(/:([^@]+)@/, ':****@')}`);
  console.log('====================================================\n');

  try {
    // 1. Connect to Local Source Database
    console.log('🔌 Connecting to local database...');
    const sourceConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to local database.');

    // 2. Fetch Users and Settings from Local
    const localUsers = await sourceConn.collection('users').find({}).toArray();
    const localSettings = await sourceConn.collection('settings').find({}).toArray();

    console.log(`\n📦 Found in local database:`);
    console.log(`   - Users: ${localUsers.length}`);
    console.log(`   - Settings documents (including official departments): ${localSettings.length}`);

    // 3. Connect to Cloud Target Database
    console.log('\n🔌 Connecting to cloud database...');
    const targetConn = await mongoose.createConnection(CLOUD_URI).asPromise();
    console.log('✅ Connected to cloud database.');

    // 4. Migrate Users (preserving password hashes and roles)
    console.log('\n👤 Migrating Users to cloud...');
    let usersMigrated = 0;
    for (const user of localUsers) {
      const { _id, ...userData } = user;
      await targetConn.collection('users').updateOne(
        { email: user.email },
        { $set: userData },
        { upsert: true }
      );
      usersMigrated++;
      console.log(`   ✓ Migrated user: ${user.email} (${user.role})`);
    }

    // 5. Migrate Settings (including official departments & branding)
    console.log('\n🏢 Migrating Department and System Settings to cloud...');
    let settingsMigrated = 0;
    for (const setting of localSettings) {
      const { _id, ...settingData } = setting;
      await targetConn.collection('settings').updateOne(
        { key: setting.key },
        { $set: settingData },
        { upsert: true }
      );
      settingsMigrated++;
      console.log(`   ✓ Migrated setting: ${setting.key}`);
    }

    console.log('\n====================================================');
    console.log('🎉 Migration Completed Successfully!');
    console.log(`   - Total Users Transferred: ${usersMigrated}`);
    console.log(`   - Total Settings Transferred: ${settingsMigrated}`);
    console.log('====================================================');

    await sourceConn.close();
    await targetConn.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error.message);
    process.exit(1);
  }
};

runMigration();
