const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function createStaffPerformanceData() {
  console.log('Creating staff performance test data...');

  // Get existing waiters
  const waiters = await prisma.waiter.findMany();
  
  if (waiters.length === 0) {
    console.log('No waiters found. Please run waiter seed first.');
    return;
  }

  console.log(`Found ${waiters.length} waiters. Creating performance data...`);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Create users assigned to waiters
  const users = [];
  for (let i = 0; i < 50; i++) {
    const waiter = waiters[i % waiters.length];
    const createdAt = new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
    
    const user = await prisma.user.create({
      data: {
        name: `Customer ${i + 1}`,
        tableNumber: Math.floor(Math.random() * 20) + 1,
        sessionId: `session_${i + 1}_${Date.now()}`,
        waiterId: waiter.id,
        createdAt: createdAt,
      }
    });
    
    users.push(user);
  }

  console.log(`Created ${users.length} user sessions`);

  // Create requests for these users
  const requests = [];
  const requestContents = [
    'Need water please',
    'Check please',
    'Menu recommendation?',
    'Extra napkins',
    'Sauce on the side',
    'Split the bill',
    'Is this gluten free?',
    'More time to decide',
    'Table for two more',
    'WiFi password?'
  ];

  for (const user of users) {
    const numRequests = Math.floor(Math.random() * 5) + 1; // 1-5 requests per user
    
    for (let j = 0; j < numRequests; j++) {
      const requestTime = new Date(user.createdAt.getTime() + j * 30 * 60 * 1000); // 30 min apart
      const content = requestContents[Math.floor(Math.random() * requestContents.length)];
      
      // Determine status based on probability
      const statusOptions = ['New', 'Acknowledged', 'InProgress', 'Completed', 'Done'];
      const statusWeights = [0.1, 0.15, 0.25, 0.3, 0.2]; // Higher chance of completion
      
      let random = Math.random();
      let selectedStatus = 'New';
      for (let k = 0; k < statusOptions.length; k++) {
        if (random < statusWeights[k]) {
          selectedStatus = statusOptions[k];
          break;
        }
        random -= statusWeights[k];
      }

      const request = await prisma.request.create({
        data: {
          userId: user.id,
          tableNumber: user.tableNumber,
          sessionId: user.sessionId,
          content: content,
          status: selectedStatus,
          createdAt: requestTime,
          updatedAt: requestTime,
        }
      });

      requests.push(request);

      // Create request logs for status changes
      if (selectedStatus !== 'New') {
        let currentTime = new Date(requestTime.getTime() + Math.random() * 5 * 60 * 1000); // 0-5 min response
        
        await prisma.requestLog.create({
          data: {
            requestId: request.id,
            action: 'acknowledged',
            dateTime: currentTime,
          }
        });

        if (['InProgress', 'Completed', 'Done'].includes(selectedStatus)) {
          currentTime = new Date(currentTime.getTime() + Math.random() * 10 * 60 * 1000); // 0-10 min to start
          
          await prisma.requestLog.create({
            data: {
              requestId: request.id,
              action: 'in_progress',
              dateTime: currentTime,
            }
          });
        }

        if (['Completed', 'Done'].includes(selectedStatus)) {
          currentTime = new Date(currentTime.getTime() + Math.random() * 15 * 60 * 1000); // 0-15 min to complete
          
          await prisma.requestLog.create({
            data: {
              requestId: request.id,
              action: 'completed',
              dateTime: currentTime,
            }
          });
        }
      }
    }
  }

  console.log(`Created ${requests.length} requests with logs`);

  // Create waiter ratings
  for (const user of users) {
    // 70% chance of rating their waiter
    if (Math.random() < 0.7) {
      const baseScore = Math.random() * 2 + 3; // 3-5 range
      
      await prisma.waiterRating.create({
        data: {
          userId: user.id,
          waiterId: user.waiterId,
          friendliness: Math.max(1, Math.min(5, Math.floor(baseScore + (Math.random() - 0.5)))),
          orderAccuracy: Math.max(1, Math.min(5, Math.floor(baseScore + (Math.random() - 0.5)))),
          speed: Math.max(1, Math.min(5, Math.floor(baseScore + (Math.random() - 0.5)))),
          attentiveness: Math.max(1, Math.min(5, Math.floor(baseScore + (Math.random() - 0.5)))),
          knowledge: Math.max(1, Math.min(5, Math.floor(baseScore + (Math.random() - 0.5)))),
          comment: Math.random() < 0.3 ? 'Great service!' : null,
          createdAt: new Date(user.createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000), // Within 2 hours
        }
      });
    }
  }

  console.log('Created waiter ratings');

  // Create service analysis records
  for (const user of users) {
    // 60% chance of service analysis
    if (Math.random() < 0.6) {
      const rating = Math.floor(Math.random() * 3) + 3; // 3-5 rating
      
      await prisma.serviceAnalysis.create({
        data: {
          sessionId: user.sessionId,
          userId: user.id,
          waiterId: user.waiterId,
          serviceType: 'request',
          rating: rating,
          analysis: {
            sentiment: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative',
            responseTime: Math.random() * 10 + 2, // 2-12 minutes
            satisfaction: rating,
            keywords: ['service', 'response', 'helpful']
          },
          createdAt: new Date(user.createdAt.getTime() + Math.random() * 3 * 60 * 60 * 1000), // Within 3 hours
        }
      });
    }
  }

  console.log('Created service analysis records');

  // Create some chat messages for AI analysis
  const chatContents = [
    'Thank you for the great service!',
    'Could you help me with the menu?',
    'The food was excellent',
    'Quick response, appreciated',
    'Very attentive waiter',
    'Good recommendations',
    'Friendly staff',
    'Professional service'
  ];

  for (const user of users.slice(0, 30)) { // Only some users have chat
    const numMessages = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numMessages; i++) {
      const content = chatContents[Math.floor(Math.random() * chatContents.length)];
      
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'user',
          content: content,
          createdAt: new Date(user.createdAt.getTime() + i * 20 * 60 * 1000), // 20 min apart
        }
      });

      // Sometimes add AI response
      if (Math.random() < 0.7) {
        await prisma.chatMessage.create({
          data: {
            userId: user.id,
            role: 'assistant',
            content: 'Thank you for your feedback! How else can I assist you?',
            createdAt: new Date(user.createdAt.getTime() + i * 20 * 60 * 1000 + 2 * 60 * 1000), // 2 min later
          }
        });
      }
    }
  }

  console.log('Created chat messages');
  console.log('Staff performance test data creation completed!');
}

async function main() {
  try {
    await createStaffPerformanceData();
  } catch (error) {
    console.error('Error creating staff performance data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
