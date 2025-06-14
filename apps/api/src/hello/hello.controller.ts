import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('hello')
@Controller('hello')
export class HelloController {
  @Get()
  @ApiOperation({ summary: 'Get a greeting message' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a greeting message',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Hello RedBut',
        },
      },
    },
  })
  getHello(): { message: string } {
    return { message: 'Hello RedBut' };
  }
}
