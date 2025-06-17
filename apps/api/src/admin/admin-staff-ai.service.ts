import { Injectable, Logger } from '@nestjs/common';
import { AdminStaffService } from './admin-staff.service';
import { CreateStaffMemberDto, UpdateStaffMemberDto } from './admin-staff.dto';
import { STAFF_POSITIONS, StaffPosition, StaffMemberWithAccessInfo } from './admin-staff.types';

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { END, START, StateGraph, StateGraphArgs } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { MemorySaver } from '@langchain/langgraph';

interface GraphState {
  messages: BaseMessage[];
}

@Injectable()
export class AdminStaffAiService {
  private readonly logger = new Logger(AdminStaffAiService.name);
  private boundModel: any;
  private persistentGraph: any;
  private langchainTools: any[];
  private systemPromptContent: string;

  constructor(private readonly adminStaffService: AdminStaffService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.error('OPENAI_API_KEY is not set. AI Staff Service will not function.');
    } else {
      this.initializeAgent();
    }
  }

  private initializeAgent() {
    const createStaffMemberTool = tool(
      async (input: CreateStaffMemberDto) => {
        const newWaiter = await this.adminStaffService.createStaffMember(input);
        return this.adminStaffService.getStaffMemberById(newWaiter.id);
      },
      {
        name: 'createStaffMember',
        description:
          'Creates a new staff member. Requires name, surname, email, tag_nickname, and position. Password is optional. Always confirm details with the user before calling this tool.',
        schema: z.object({
          name: z.string().describe('First name of the staff member.'),
          surname: z.string().describe('Last name of the staff member.'),
          email: z.string().email().describe('Email address (used as login username).'),
          tag_nickname: z.string().describe('Unique tag name or nickname.'),
          position: z.enum(STAFF_POSITIONS).describe('Position/role of the staff member.'),
          password: z.string().optional().describe('Optional password. Defaults if not provided.'),
          address: z.string().optional().describe('Optional home address.'),
          phone: z.string().optional().describe('Optional phone number.'),
          propic: z.string().url().optional().describe('Optional URL to profile picture.'),
        }),
      },
    );

    const updateStaffMemberTool = tool(
      async (input: UpdateStaffMemberDto & { id: string }) => {
        const { id, ...updateData } = input;
        const updatedWaiter = await this.adminStaffService.updateStaffMember(id, updateData);
        return this.adminStaffService.getStaffMemberById(updatedWaiter.id);
      },
      {
        name: 'updateStaffMember',
        description:
          "Updates an existing staff member's details. Requires the staff member's ID. Email and password cannot be changed via this tool. Always confirm details with the user before calling this tool.",
        schema: z.object({
          id: z.string().uuid().describe('Unique identifier (UUID) of the staff member to update.'),
          name: z.string().optional().describe('Optional new first name.'),
          surname: z.string().optional().describe('Optional new last name.'),
          tag_nickname: z.string().optional().describe('Optional new tag name.'),
          position: z.enum(STAFF_POSITIONS).optional().describe('Optional new position.'),
          address: z.string().optional().describe('Optional new address.'),
          phone: z.string().optional().describe('Optional new phone number.'),
          propic: z.string().url().optional().describe('Optional new profile picture URL.'),
        }),
      },
    );

    const deleteStaffMemberTool = tool(
      async (input: { id: string }) => {
        await this.adminStaffService.deleteStaffMember(input.id);
        return { message: `Staff member with ID ${input.id} has been successfully deleted.` };
      },
      {
        name: 'deleteStaffMember',
        description:
          "Deletes a staff member. Requires the staff member's ID. Always confirm with the user (stating name and ID) before calling this destructive tool.",
        schema: z.object({
          id: z.string().uuid().describe('Unique identifier (UUID) of the staff member to delete.'),
        }),
      },
    );

    const getStaffMemberByIdTool = tool(
      async (input: { id: string }) => {
        return this.adminStaffService.getStaffMemberById(input.id);
      },
      {
        name: 'getStaffMemberById',
        description: "Retrieves details of a specific staff member by their ID.",
        schema: z.object({
          id: z.string().uuid().describe('Unique identifier (UUID) of the staff member to retrieve.'),
        }),
      },
    );

    const getAllStaffMembersTool = tool(
      async () => {
        return this.adminStaffService.getAllStaffMembers();
      },
      {
        name: 'getAllStaffMembers',
        description: 'Lists all registered staff members.',
        schema: z.object({}),
      },
    );

    const getStaffPositionsTool = tool(
      async () => {
        return STAFF_POSITIONS.slice();
      },
      {
        name: 'getStaffPositions',
        description: 'Retrieves a list of all available staff positions.',
        schema: z.object({}),
      },
    );

    this.langchainTools = [
      createStaffMemberTool,
      updateStaffMemberTool,
      deleteStaffMemberTool,
      getStaffMemberByIdTool,
      getAllStaffMembersTool,
      getStaffPositionsTool,
    ];

    const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
    
    this.systemPromptContent = `You are an AI assistant for managing restaurant staff. Respond to user queries. Your capabilities are strictly limited to:
- Creating new staff members.
- Updating existing staff members.
- Deleting staff members.
- Retrieving details of staff members.
- Listing all registered staff members.
- Retrieving a list of available staff positions.

Interaction Flow:
1. If you need more information to fulfill a request, use a tool to get it or ask the user to provide it.
2. Before executing a create, update, or delete operation, summarize the information you are about to use and ask for user confirmation. For example: "I am about to create a new Waiter: John Doe, john.doe@example.com, tag: JohnnyD. Is this correct?" or "Are you sure you want to delete staff member John Doe (ID: xyz)?". Only proceed if the user confirms.

Output Format:
- If you use a tool that retrieves data (getStaffMemberById, getAllStaffMembers, getStaffPositions) and the user's query was a direct request for this data, your *entire response* must be ONLY the JSON string representation of the data returned by the tool.
- For createStaffMember or updateStaffMember, if successful, your *entire response* must be ONLY the JSON string representation of the created/updated staff member object.
- For deleteStaffMember, if successful, your *entire response* must be a JSON string object like: {"message": "Staff member successfully deleted."}.
- For all other interactions (asking for information, confirming actions, explaining errors, or if the user's query is conversational), respond in natural language.
- Do not add any explanatory text before or after the JSON string outputs if the output is data.

If a user asks for information or actions outside of staff management, politely decline and state your purpose.`;

    this.boundModel = model.bindTools(this.langchainTools);


    const toolNode = new ToolNode(this.langchainTools);

    const workflow = new StateGraph<GraphState>({channels: {messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
    }}})
      .addNode("agent", async (state: GraphState, config?: RunnableConfig) => {
          const response = await this.boundModel.invoke(state.messages, config);
          return { messages: [response] };
      })
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", (state: GraphState) => {
          const { messages } = state;
          const lastMessage = messages[messages.length - 1] as AIMessage;
          if (!lastMessage.tool_calls?.length) {
            return END;
          }
          return "tools";
        },
      )
      .addEdge("tools", "agent");

    const memory = new MemorySaver();
    this.persistentGraph = workflow.compile({ checkpointer: memory });
  }

  async processStaffQuery(userMessage: string, thread_id: string): Promise<any> {
    if (!this.persistentGraph) {
      this.logger.error('AI Staff Service (LangGraph) not initialized. OPENAI_API_KEY might be missing.');
      return 'Sorry, I am unable to process your request at this time due to a configuration issue.';
    }

    this.logger.log(`Processing AI staff query (LangGraph) for thread ${thread_id}: "${userMessage}"`);

    const config: RunnableConfig = { configurable: { thread_id } };
    
    const combinedMessageContent = `${this.systemPromptContent}\n\nUser: ${userMessage}`;
    const inputs = { messages: [new HumanMessage(combinedMessageContent)] };
    
    let finalMessages: BaseMessage[] = [];

    try {
      const result = await this.persistentGraph.invoke(inputs, config);
      finalMessages = result.messages;

      this.logger.log(`AI query for thread ${thread_id} processed successfully. Final messages: ${JSON.stringify(finalMessages)}`);
      const finalMessage = finalMessages[finalMessages.length - 1];

      if (finalMessage && finalMessage.content && typeof finalMessage.content === 'string') {
        this.logger.log(`Final message content for thread ${thread_id}: ${finalMessage.content}`);
      const contentStr = finalMessage.content as string;
      try {
        const parsed = JSON.parse(contentStr);
        if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
        }
        return contentStr;
      } catch (e) {
        return contentStr;
      }
      }
      this.logger.warn(`AI query for thread ${thread_id} processed, but no final content in the last message. Final message: ${JSON.stringify(finalMessage)}`);
      return "I'm unable to provide a response for that. Please try rephrasing.";
    } catch (error: any) {
      this.logger.error(`Error processing LangGraph AI staff query for thread ${thread_id}: ${error.message}`, error.stack);
      return `An unexpected error occurred: ${error.message}`;
    }
  }
}
