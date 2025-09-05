const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing Prisma connection...');
    console.log('Available models:', Object.keys(prisma));
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected successfully!');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
