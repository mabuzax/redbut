import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
// Moved here from inside bootstrap() so it's evaluated at module load time.
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');
  
  // Enable CORS for frontend
  const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  });
  
  // Configure Socket.IO adapter so WebSocket server inherits the same CORS
  // rules and is explicitly initialised.  This prevents connection issues
  // where the client falls back to the default `/socket.io/` namespace.
  // The IoAdapter from @nestjs/platform-socket.io automatically shares the
  // underlying HTTP server with Nest and respects the CORS configuration.
  //
  // If more granular options are needed (paths, transports, etc.) they can
  // be passed as the second argument to the adapter constructor.
  app.useWebSocketAdapter(new IoAdapter(app));

  // Use Helmet for security headers
  app.use(helmet());
  
  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RedBut API')
    .setDescription('Restaurant Waiter Assistant API')
    .setVersion('1.0')
    .addTag('redbut')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Start the server
  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`RedBut API is running on: http://localhost:${port}`);
}

bootstrap();
