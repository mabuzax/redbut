import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AdminStaffService } from './admin-staff.service';
import {
  CreateStaffMemberDto,
  UpdateStaffMemberDto,
  // StaffMemberResponseDto, // Removed as per instruction
} from './admin-staff.dto';
import { STAFF_POSITIONS, StaffMemberWithAccessInfo } from './admin-staff.types';

@Injectable()
export class AdminStaffAiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(AdminStaffAiService.name);

  constructor(private readonly adminStaffService: AdminStaffService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.error('OPENAI_API_KEY is not set. AI Staff Service will not function.');
      this.openai = {} as OpenAI; 
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  private tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'createStaffMember',
        description:
          'Creates a new staff member with their personal details, position, and login credentials. Use this when the user explicitly asks to "create", "add", or "register" a new staff member. Ensure all required fields (name, surname, email, tag_nickname, position) are collected before calling.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'First name of the staff member.' },
            surname: { type: 'string', description: 'Last name of the staff member.' },
            email: { type: 'string', description: 'Email address of the staff member, used as login username.' },
            tag_nickname: { type: 'string', description: 'Unique tag name or nickname for the staff member.' },
            position: { type: 'string', enum: [...STAFF_POSITIONS], description: 'Position/role of the staff member.' },
            password: { type: 'string', description: 'Optional password for the staff member. If not provided, a default password will be set, requiring a change on first login.' },
            address: { type: 'string', description: 'Optional home address of the staff member.' },
            phone: { type: 'string', description: 'Optional phone number of the staff member.' },
            propic: { type: 'string', description: 'Optional URL to the profile picture of the staff member.' },
          },
          required: ['name', 'surname', 'email', 'tag_nickname', 'position'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'updateStaffMember',
        description:
          "Updates an existing staff member's details. Use this when the user asks to 'update', 'change', or 'modify' a staff member's information. Requires the staff member's ID. Email and password cannot be changed via this tool.",
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier (UUID) of the staff member to update.' },
            name: { type: 'string', description: 'Optional new first name of the staff member.' },
            surname: { type: 'string', description: 'Optional new last name of the staff member.' },
            tag_nickname: { type: 'string', description: 'Optional new unique tag name or nickname for the staff member.' },
            position: { type: 'string', enum: [...STAFF_POSITIONS], description: 'Optional new position/role of the staff member.' },
            address: { type: 'string', description: 'Optional new home address of the staff member.' },
            phone: { type: 'string', description: 'Optional new phone number of the staff member.' },
            propic: { type: 'string', description: 'Optional new URL to the profile picture of the staff member.' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'deleteStaffMember',
        description:
          "Deletes a staff member from the system. Use this when the user explicitly asks to 'delete' or 'remove' a staff member. Requires the staff member's ID. Always confirm with the user before executing this destructive action.",
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier (UUID) of the staff member to delete.' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getStaffMemberById',
        description:
          "Retrieves details of a specific staff member by their ID. Use this when the user asks to 'find', 'get details of', 'show information about', or 'look up' a staff member using their ID.",
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier (UUID) of the staff member to retrieve.' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getAllStaffMembers',
        description:
          'Lists all registered staff members. Use this when the user asks to "list all staff", "show all staff", "display all staff members", or similar general listing requests.',
        parameters: {
          type: 'object',
          properties: {}, 
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getStaffPositions',
        description:
          'Retrieves a list of all available staff positions (e.g., Waiter, Chef, Manager, Supervisor). Use this when the user asks about "available roles", "positions", or "types of staff".',
        parameters: {
          type: 'object',
          properties: {}, 
        },
      },
    },
  ];

  async processStaffQuery(
    userMessage: string,
    isConfirmedDestructiveAction: boolean = false 
  ): Promise<any> { // Changed return type to Promise<any>
    if (!process.env.OPENAI_API_KEY || !this.openai.chat) {
        this.logger.error('OpenAI client is not initialized. Cannot process AI query.');
        return 'Sorry, I am unable to process your request at this time due to a configuration issue.';
    }
    this.logger.log(`Processing AI staff query: "${userMessage}"`);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an AI assistant for managing restaurant staff. Your capabilities are strictly limited to creating, updating, deleting, and retrieving staff member information, and listing available staff positions.
        Available staff positions are: ${STAFF_POSITIONS.join(', ')}.
        When creating a staff member, the required fields are: name, surname, email, tag_nickname, and position. Password is optional and will default if not provided.
        When updating a staff member, search for the staff memmber record using the info provided by the user to find the ID.         
        If a user asks for information or actions outside of staff management, politely decline and state your purpose.
        If you need more information to fulfill a request, ask the user to provide the missing information.
        Before executing a create, delete or update operation, summarize the information you are about to save or delete and ask for user confirmation. For example: "I am about to create a new Waiter: John Doe, john.doe@example.com, tag: JohnnyD. Is this correct?"
        `,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', 
        messages,
        tools: this.tools,
        tool_choice: 'auto',
      });

      const responseMessage = response.choices[0].message;  
      this.logger.log(`AI response received: ${JSON.stringify(responseMessage)}`);    
      const toolCalls = responseMessage.tool_calls;
      this.logger.log(`AI response received with tool calls: ${JSON.stringify(toolCalls)}`);
      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        this.logger.log(`AI decided to call tool: ${functionName} with args: ${JSON.stringify(functionArgs)}`);

        switch (functionName) {
          case 'createStaffMember':
            return this.adminStaffService.createStaffMember(functionArgs as CreateStaffMemberDto);
          case 'updateStaffMember':
            return this.adminStaffService.updateStaffMember(functionArgs.id, functionArgs as UpdateStaffMemberDto);
          case 'deleteStaffMember':
             this.logger.warn(`Executing deleteStaffMember for ID: ${functionArgs.id}. Ensure AI confirmed with user.`);
            await this.adminStaffService.deleteStaffMember(functionArgs.id);
            return { message: `Staff member with ID ${functionArgs.id} has been deleted.` };
          case 'getStaffMemberById':
            return this.adminStaffService.getStaffMemberById(functionArgs.id);
          case 'getAllStaffMembers':
            return this.adminStaffService.getAllStaffMembers();
          case 'getStaffPositions':
            return STAFF_POSITIONS.slice(); 
          default:
            this.logger.warn(`AI called an unknown tool: ${functionName}`);
            return `I tried to use a tool called '${functionName}', but I don't know how to do that.`;
        }
      } else if (responseMessage.content) {
        return responseMessage.content;
      }
      
      this.logger.warn('AI did not call a tool and did not provide a text response.');
      return "I'm not sure how to proceed with that request regarding staff management. Can you please clarify?";

    } catch (error: any) {
      this.logger.error(`Error processing AI staff query: ${error.message}`, error.stack);
      if (error.response && error.response.data && error.response.data.error) {
        return `An error occurred with the AI service: ${error.response.data.error.message}`;
      }
      return `An unexpected error occurred while processing your request with the AI: ${error.message}`;
    }
  }
}
