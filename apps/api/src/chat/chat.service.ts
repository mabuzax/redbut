import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { ChatMessage, ChatRole, MenuItem, RequestStatus, Prisma, Order, Request as PrismaRequest } from '@prisma/client';
import { RequestsService } from '../requests/requests.service';
import { OrdersService } from '../orders/orders.service';
import { CreateRequestDto } from '../requests/dto/create-request.dto';
import { UpdateRequestDto } from '../requests/dto/update-request.dto';
import { CreateOrderDto } from '../orders/dto/create-order.dto';

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { END, START, StateGraph, StateGraphArgs } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { MemorySaver } from '@langchain/langgraph';

interface GraphState {
  messages: BaseMessage[];
  userId?: string;
  tableNumber?: number;
  sessionId?: string;
}

const graphStateArgs: StateGraphArgs<GraphState> = {
  channels: {
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
    },
    userId: { value: (x?: string, y?: string) => y ?? x, default: () => undefined },
    tableNumber: { value: (x?: number, y?: number) => y ?? x, default: () => undefined },
    sessionId: { value: (x?: string, y?: string) => y ?? x, default: () => undefined },
  },
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private boundModel: any;
  private persistentGraph: any;
  private readonly systemPromptContent: string;

  private currentUserId?: string;
  private currentTableNumber?: number;
  private currentSessionId?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly requestsService: RequestsService,
    private readonly ordersService: OrdersService,
  ) {
    this.systemPromptContent = 
      `You are a bubbly, friendly, and concise restaurant waiter assistant AI named RedBut.
Answer questions directly and in short sentences.
Only answer questions related to the restaurant, such as open times, menu items, or services.
If a question is not related to the restaurant, politely decline to answer.
If the user asks about menu items, answer as best you can, suggest other things that go well with that menu item,
and always ask if you should place an order for the user, or call the waiter to the table.
Do not make up information about the restaurant or menu.

Interaction Flow:
1. If you need more information to fulfill a request, use a tool to get it or ask the user to provide it.
2. Before executing a create, update, or delete operation, summarize the information you are about to use and ask for user confirmation. For example: "I am about to create a new Waiter: John Doe, john.doe@example.com, tag: JohnnyD. Is this correct? or Here is the record of John Doe I am going to update/delet, Is this correct?".

Output Format:
- If you use a tool that retrieves data (getMenuItems, getRestaurantInfo, getTableBill, getMyRequests) and the user's query was a direct request for this data, your *entire response* must be ONLY the JSON string representation of the data returned by the tool.
- For createWaiterRequest, createOrder, updateRequest, or deleteRequest, if successful, your *entire response* must be ONLY the JSON string representation of the created/updated/deleted object or a success message object like: {"message": "Operation successful."}.
- For all other interactions (asking for information, confirming actions, explaining errors, or if the user's query is conversational), respond in natural language.
- Do not add any explanatory text before or after the JSON string outputs if the output is data.

Restaurant open times: Monday-Friday 11 AM - 10 PM, Saturday-Sunday 10 AM - 11 PM.
Restaurant address: 123 Main Street, Anytown, USA.`;

    if (!process.env.OPENAI_API_KEY) {
      this.logger.error('OPENAI_API_KEY is not set. AI Chat Service will not function.');
    } else {
      this.initializeAgent();
    }
  }

  private initializeAgent() {
    const createWaiterRequestTool = tool(
      async (input: { content: string }) => {
        if (!this.currentUserId || this.currentTableNumber === undefined) throw new Error("User ID and Table Number are required for createWaiterRequestTool");
        return this.requestsService.create({ content: input.content, userId: this.currentUserId, tableNumber: this.currentTableNumber });
      },
      {
        name: 'createWaiterRequest',
        description: 'Creates a new waiter request for the user. Use this when the user explicitly asks for a waiter or assistance that requires human intervention. Requires content.',
        schema: z.object({ content: z.string().describe("The specific request content, e.g., 'Water please', 'Ready to order'.") }),
      },
    );

    const getMenuItemsTool = tool(
      async (input: { category?: string; search?: string }) => {
        const whereClause: Prisma.MenuItemWhereInput = { status: 'Active' };
        if (input.category) whereClause.category = { equals: input.category, mode: 'insensitive' };
        if (input.search) {
          whereClause.OR = [
            { name: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ];
        }
        return this.prisma.menuItem.findMany({ where: whereClause, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
      },
      {
        name: 'getMenuItems',
        description: 'Retrieves a list of available menu items. Can be filtered by category or searched by name/description.',
        schema: z.object({
          category: z.string().optional().describe('Optional category to filter menu items by.'),
          search: z.string().optional().describe('Optional search term to find in item name or description.'),
        }),
      },
    );

    const getRestaurantInfoTool = tool(
      async (input: { query?: string }) => {
        const query = input.query?.toLowerCase();
        if (query?.includes('opening hours') || query?.includes('open times')) return 'Restaurant open times: Monday-Friday 11 AM - 10 PM, Saturday-Sunday 10 AM - 11 PM.';
        if (query?.includes('address') || query?.includes('location')) return 'Our address is 123 Main Street, Anytown, USA.';
        return 'I am RedBut, your friendly restaurant assistant! I can help with menu questions, take orders, call a waiter, or provide information about our restaurant like opening hours.';
      },
      {
        name: 'getRestaurantInfo',
        description: 'Provides general information about the restaurant, such as opening hours, address, or contact details.',
        schema: z.object({ query: z.string().optional().describe('Specific information requested, e.g., "opening hours", "address".') }),
      },
    );

    const createOrderTool = tool(
      async (input: { item: string; price: number }) => {
        if (this.currentTableNumber === undefined || !this.currentSessionId) throw new Error("Table Number and Session ID are required for createOrderTool");
        return this.ordersService.create({ tableNumber: this.currentTableNumber, sessionId: this.currentSessionId, item: input.item, price: input.price });
      },
      {
        name: 'createOrder',
        description: 'Creates a new order for a menu item. Requires item name and price. The system will automatically use the current table number and session ID.',
        schema: z.object({
          item: z.string().describe('The name of the menu item to order.'),
          price: z.number().describe('The price of the menu item.'),
        }),
      },
    );

    const getTableBillTool = tool(
      async (_input: Record<string, never>) => {
         if (this.currentTableNumber === undefined) throw new Error("Table Number is required for getTableBillTool");
        return this.ordersService.calculateBill(this.currentTableNumber, this.currentSessionId);
      },
      {
        name: 'getTableBill',
        description: 'Calculates and retrieves the total bill for the current table and session. Use this when the user asks for their bill or to pay.',
        schema: z.object({}),
      },
    );

    const getMyRequestsTool = tool(
      async (_input: Record<string, never>) => {
        if (!this.currentUserId) throw new Error("User ID is required for getMyRequestsTool");
        return this.requestsService.findAllByUserId(this.currentUserId);
      },
      {
        name: 'getMyRequests',
        description: 'Retrieves a list of requests made by the current user.',
        schema: z.object({}),
      },
    );
    
    const requestStatusEnum = z.enum(['New', 'Acknowledged', 'InProgress', 'Completed', 'OnHold', 'Cancelled', 'Done']);

    const updateRequestTool = tool(
      async (input: { id: string; status?: z.infer<typeof requestStatusEnum>; content?: string }) => {
        return this.requestsService.update(input.id, { status: input.status, content: input.content });
      },
      {
        name: 'updateRequest',
        description: 'Updates the status or content of an existing request. Requires request ID. Valid statuses are New, Acknowledged, InProgress, Completed, OnHold, Cancelled, Done.',
        schema: z.object({
          id: z.string().uuid().describe("The ID of the request to update."),
          status: requestStatusEnum.optional().describe("The new status for the request."),
          content: z.string().optional().describe("New content for the request, if applicable."),
        }),
      },
    );

    const deleteRequestTool = tool(
      async (input: { id: string }) => {
        await this.requestsService.remove(input.id);
        return { message: `Request with ID ${input.id} has been deleted.` };
      },
      {
        name: 'deleteRequest',
        description: 'Deletes a request. Requires request ID. Always confirm with the user before deleting.',
        schema: z.object({ id: z.string().uuid().describe("The ID of the request to delete.") }),
      },
    );

    const langchainTools = [
      createWaiterRequestTool, getMenuItemsTool, getRestaurantInfoTool,
      createOrderTool, getTableBillTool, getMyRequestsTool,
      updateRequestTool, deleteRequestTool,
    ];

    const model = new ChatOpenAI({ 
      model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'), 
      temperature: 0 
    });
    this.boundModel = model.bindTools(langchainTools);

    const toolNode = new ToolNode(langchainTools);

    const workflow = new StateGraph<GraphState>(graphStateArgs)
      .addNode("agent", async (state: GraphState, config?: RunnableConfig) => {
        const response = await this.boundModel.invoke(state.messages, config);
        return { messages: [response], userId: state.userId, tableNumber: state.tableNumber, sessionId: state.sessionId };
      })
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", (state: GraphState) => {
        const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
        if (!lastMessage.tool_calls?.length) return END;
        return "tools";
      })
      .addEdge("tools", "agent");

    const memory = new MemorySaver();
    this.persistentGraph = workflow.compile({ checkpointer: memory });
  }

  async processMessage(userId: string, tableNumber: number, sessionId: string, content: string, threadId: string): Promise<any> {
    if (!this.persistentGraph) {
      this.logger.error('AI Chat Service (LangGraph) not initialized. OPENAI_API_KEY might be missing.');
      return 'Sorry, I am unable to process your request at this time due to a configuration issue.';
    }

    this.currentUserId = userId;
    this.currentTableNumber = tableNumber;
    this.currentSessionId = sessionId;

    this.logger.log(`Processing message for thread ${threadId} (User: ${userId}, Table: ${tableNumber}, Session: ${sessionId}): "${content}"`);
    await this.storeMessage(userId, ChatRole.user, content);

    const config: RunnableConfig = { configurable: { thread_id: threadId } };
    
    const recentChatMessages = await this.getRecentMessages(userId, 5); 
    const historyMessages: BaseMessage[] = recentChatMessages.map(msg => 
        msg.role === ChatRole.user ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    );

    const inputs: GraphState = { 
        messages: [new SystemMessage(this.systemPromptContent), ...historyMessages, new HumanMessage(content)],
        userId,
        tableNumber,
        sessionId
    };
    
    let finalMessages: BaseMessage[] = [];

    try {
      const result = await this.persistentGraph.invoke(inputs, config);
      finalMessages = result.messages;
      
      const finalMessage = finalMessages[finalMessages.length - 1];

      if (finalMessage && finalMessage.content && typeof finalMessage.content === 'string') {
        const contentStr = finalMessage.content as string;
        await this.storeMessage(userId, ChatRole.assistant, contentStr);
        try {
          const parsed = JSON.parse(contentStr);
          if (typeof parsed === 'object' && parsed !== null) return parsed;
          return contentStr;
        } catch (e) {
          return contentStr;
        }
      }
      const lastAiMessageWithContent = [...finalMessages].reverse().find(m => m instanceof AIMessage && m.content && typeof m.content === 'string');
      if (lastAiMessageWithContent && lastAiMessageWithContent.content && typeof lastAiMessageWithContent.content === 'string') {
         await this.storeMessage(userId, ChatRole.assistant, lastAiMessageWithContent.content as string);
         return lastAiMessageWithContent.content;
      }

      this.logger.warn(`AI query for thread ${threadId} processed, but no final content in the last message. Final message: ${JSON.stringify(finalMessage)}`);
      const fallbackResponse = "I'm not sure how to help with that. Can you try asking differently?";
      await this.storeMessage(userId, ChatRole.assistant, fallbackResponse);
      return fallbackResponse;

    } catch (error: any) {
      this.logger.error(`Error processing LangGraph AI chat query for thread ${threadId}: ${error.message}`, error.stack);
      const errorResponse = `An unexpected error occurred: ${error.message}`;
      await this.storeMessage(userId, ChatRole.assistant, errorResponse);
      return errorResponse;
    } finally {
        this.currentUserId = undefined;
        this.currentTableNumber = undefined;
        this.currentSessionId = undefined;
    }
  }

  async storeMessage(userId: string, role: ChatRole, content: string): Promise<ChatMessage> {
    try {
      return await this.prisma.chatMessage.create({
        data: { userId, role, content },
      });
    } catch (error) {
      this.logger.error(`Failed to store chat message: ${error.message}`);
      throw error;
    }
  }

  async getRecentMessages(userId: string, limit: number = 10): Promise<ChatMessage[]> {
    try {
      return await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }, 
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Failed to get recent messages: ${error.message}`);
      return [];
    }
  }

  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return this.getRecentMessages(userId, limit);
  }

  async clearChatHistory(userId: string): Promise<{ count: number }> {
    try {
      const result = await this.prisma.chatMessage.deleteMany({
        where: { userId },
      });
      return { count: result.count };
    } catch (error) {
      this.logger.error(`Failed to clear chat history: ${error.message}`);
      throw error;
    }
  }
}
