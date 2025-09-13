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
import { addMessages } from "@langchain/langgraph";

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
      `Today's date is: ${new Date().toISOString().split('T')[0]}. You are a bubbly, friendly, and concise restaurant waiter assistant AI named RedBut.
Answer questions directly and in short sentences.
Only answer questions related to the restaurant, such as open times, menu items, or services.
If a question is not related to the restaurant, politely decline to answer.
If the user asks about menu items, answer as best you can, suggest other things that go well with that menu item.
Do not make up information about the restaurant or menu.

Interaction Flow:
1. If you need more information to fulfill a request, use a tool to get it or ask the user to provide it.
2. Before executing a create, update, or delete operation, show the information you are about to use and ask for user confirmation.
3. When the user asks for menu information, always call getMenuItems first, rather than guessing.

Important Tool Usage:
- When users ask to "see", "show", "view", or "check" their REQUESTS, use openRequestsView tool instead of getMyRequests
- When users ask to "see", "show", "view", or "check" their ORDERS, use openOrdersView tool instead of other order tools

MENU INTERACTION RULES:
- For INFORMATIONAL questions about dishes (ingredients, descriptions, recommendations, "what is", "tell me about", "what ... you offer", "do you offer ..."), use getMenuItems tool and respond in chat
- For ORDER INTENT (user wants to place an order, "I want to order", "I'll have", "Can I get"), use openMenuSearch tool with the item name
- For general menu browsing ("show me the menu", "what do you have", "see the menu"), use openMenuView tool
- NEVER open menu tools for simple questions about dishes - answer in chat instead

Examples:
- "What's in the Caesar salad?" → Use getMenuItems, answer in chat
- "Tell me about your steaks" → Use getMenuItems, answer in chat
- "I want to order chicken" → Use openMenuSearch with "chicken"
- "Can I get a pizza?" → Use openMenuSearch with "pizza"
- "Show me the menu" → Use openMenuView

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
        return this.toSafeContent(await this.requestsService.create({ content: input.content, userId: this.currentUserId, tableNumber: this.currentTableNumber }));
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
            { category: { contains: input.search, mode: 'insensitive' } },
          ];
        }

        return this.toSafeContent(await this.prisma.menuItem.findMany({ where: whereClause, orderBy: [{ category: 'asc' }, { name: 'asc' }] }));
      },
      {
        name: 'getMenuItems',
        description: 'Retrieves menu items for answering questions about dishes, ingredients, or descriptions. Use this when user asks informational questions like "What is in...", "Tell me about...", "What desserts do you have?", or needs dish details. Supports both category and item-specific searches. DO NOT use this for ordering - only for providing information in chat.',
        schema: z.object({
          category: z.string().optional().describe('Filter by category if mentioned (e.g., "desserts", "drinks", "appetizers")'),
          search: z.string().optional().describe('Search term for specific items by name or description'),
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
        schema: z.object({}),
      },
    );

    const createOrderTool = tool(
      async (input: { menuItemId: string; quantity?: number; price?: number }) => {
        if (this.currentTableNumber === undefined || !this.currentSessionId) throw new Error("Table Number and Session ID are required for createOrderTool");
        return this.toSafeContent(
          await this.ordersService.create({
            tableNumber: this.currentTableNumber,
            sessionId: this.currentSessionId,
            items: [
              {
                menuItemId: input.menuItemId,
                quantity: input.quantity ?? 1,
                price: input.price ?? 0, // TODO: replace with real price lookup if needed
              },
            ],
          }),
        );
      },
      {
        name: 'createOrder',
        description:
          'Creates a new order for the specified menu item ID. Quantity defaults to 1 and price is optional (placeholder if omitted).',
        schema: z.object({
          menuItemId: z
            .string()
            .uuid()
            .describe('The MenuItem ID to order.'),
          quantity: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('Quantity of the item (default 1).'),
          price: z
            .number()
            .optional()
            .describe(
              'Price of the item at order time (optional; placeholder used if omitted).',
            ),
        }),
      },
    );

    const getTableBillTool = tool(
      async (_input: Record<string, never>) => {
         if (this.currentTableNumber === undefined) throw new Error("Table Number is required for getTableBillTool");
        return this.toSafeContent(await this.ordersService.calculateBill(this.currentTableNumber, this.currentSessionId));
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
        return this.toSafeContent(await this.requestsService.findAllByUserId(this.currentUserId));
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
        return this.toSafeContent(await this.requestsService.update(input.id, { status: input.status, content: input.content }));
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
        this.toSafeContent(await this.requestsService.remove(input.id));
        return { message: `Request with ID ${input.id} has been deleted.` };
      },
      {
        name: 'deleteRequest',
        description: 'Deletes a request. Requires request ID. Always confirm with the user before deleting.',
        schema: z.object({ id: z.string().uuid().describe("The ID of the request to delete.") }),
      },
    );

    const openRequestsViewTool = tool(
      async (_input: Record<string, never>) => {
        return JSON.stringify({
          action: 'open_requests_view',
          message: 'I\'ll open your requests for you to view.',
        });
      },
      {
        name: 'openRequestsView',
        description: 'Opens the requests view for the user to see their requests instead of listing them in chat. Use this when user asks to see, show, or view their requests.',
        schema: z.object({}),
      },
    );

    const openOrdersViewTool = tool(
      async (_input: Record<string, never>) => {
        return JSON.stringify({
          action: 'open_orders_view',
          message: 'I\'ll open your orders for you to view.',
        });
      },
      {
        name: 'openOrdersView',
        description: 'Opens the orders view for the user to see their orders instead of listing them in chat. Use this when user asks to see, show, or view their orders.',
        schema: z.object({}),
      },
    );

    const openMenuSearchTool = tool(
      async (input: { searchTerm: string; itemName?: string }) => {
        return JSON.stringify({
          action: 'open_menu_search',
          searchTerm: input.searchTerm,
          itemName: input.itemName || input.searchTerm,
          message: `Finding "${input.searchTerm}" from the menu for you...`,
        });
      },
      {
        name: 'openMenuSearch',
        description: 'Opens the menu interface with search filter. ONLY use this when user has clear ORDER INTENT - wants to place an order, buy, or get something. Keywords: "I want to order", "I\'ll have", "Can I get", "I want", "Give me". Supports searching by item name, description, or category (e.g., "dessert", "drinks", "appetizers"). DO NOT use for informational questions.',
        schema: z.object({
          searchTerm: z.string().describe('The search term to filter menu items - can be item name, description, or category'),
          itemName: z.string().optional().describe('The specific item name the user mentioned'),
        }),
      },
    );

    const openMenuViewTool = tool(
      async (_input: Record<string, never>) => {
        return JSON.stringify({
          action: 'open_menu_view',
          message: 'I\'ll open the menu for you to browse.',
        });
      },
      {
        name: 'openMenuView',
        description: 'Opens the full menu interface for browsing all items. Use this ONLY when user explicitly asks to see, view, or browse the entire menu generally. Do NOT use for questions about specific dishes.',
        schema: z.object({}),
      },
    );

    const langchainTools = [
      createWaiterRequestTool, getMenuItemsTool, getRestaurantInfoTool,
      createOrderTool, getTableBillTool, getMyRequestsTool,
      updateRequestTool, deleteRequestTool, openRequestsViewTool, openOrdersViewTool, openMenuSearchTool, openMenuViewTool,
    ];

    const model = new ChatOpenAI({ 
      model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'), 
      temperature: 0.1 
    });
    this.boundModel = model.bindTools(langchainTools);

    const toolNode = new ToolNode(langchainTools);

    const workflow = new StateGraph<GraphState>(graphStateArgs)
      .addNode("agent", async (state: GraphState, config?: RunnableConfig) => {
        // Ensure system message is always first, but don't duplicate it
        let messages = state.messages;
        const hasSystemMessage = messages.length > 0 && messages[0].constructor.name === 'SystemMessage';
        
        if (!hasSystemMessage) {
          const systemMsg = new SystemMessage(this.systemPromptContent);
          messages = [systemMsg, ...messages];
        }
        
        const response = await this.boundModel.invoke(messages, config);
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
    
    // Store user message and get its ID for linking
    const userMessage = await this.storeMessage(userId, ChatRole.user, content);

    const config: RunnableConfig = { configurable: { thread_id: threadId } }; 
    this.logger.debug(`Config for AI model: ${JSON.stringify(config)}`);
    
    // Let LangGraph manage the conversation state and history, but include user context
    const userMsg = new HumanMessage(content);

    const inputState: GraphState = {
      messages: [userMsg],
      userId,
      tableNumber,
      sessionId,
    };

    try {
      const { messages } = await this.persistentGraph.invoke(inputState, config);
      this.logger.debug(`AI model returned messages: ${JSON.stringify(messages)}`);
      
      // Only check the latest messages from this conversation turn, not the entire history
      // The latest response should be at the end of the messages array
      const latestMessages = messages.slice(-5); // Get last 5 messages to include the latest AI response and any tools
      
      // Check for special tool actions in the latest messages only
      for (const message of latestMessages) {
        if (message.constructor.name === 'ToolMessage') {
          try {
            const toolResult = JSON.parse(message.content);
            if (toolResult.action === 'open_menu_search') {
              this.logger.debug(`Found special tool action: ${JSON.stringify(toolResult)}`);
              // Store the AI response linked to the user message
              await this.storeMessage(userId, ChatRole.assistant, toolResult.message, userMessage.id);
              return toolResult;
            }
            if (toolResult.action === 'open_requests_view') {
              this.logger.debug(`Found special tool action: ${JSON.stringify(toolResult)}`);
              // Store the AI response linked to the user message
              await this.storeMessage(userId, ChatRole.assistant, toolResult.message, userMessage.id);
              return toolResult;
            }
            if (toolResult.action === 'open_orders_view') {
              this.logger.debug(`Found special tool action: ${JSON.stringify(toolResult)}`);
              // Store the AI response linked to the user message
              await this.storeMessage(userId, ChatRole.assistant, toolResult.message, userMessage.id);
              return toolResult;
            }
            if (toolResult.action === 'open_menu_view') {
              this.logger.debug(`Found special tool action: ${JSON.stringify(toolResult)}`);
              // Store the AI response linked to the user message
              await this.storeMessage(userId, ChatRole.assistant, toolResult.message, userMessage.id);
              return toolResult;
            }
          } catch {
            // Not a JSON tool result, continue
          }
        }
      }

      const final = messages[messages.length - 1];
      let responseContent: string;

      if (typeof final.content === 'string') {
        try {
          const parsedContent = JSON.parse(final.content);
          responseContent = final.content; // Store the JSON as-is
          this.logger.debug(`Final AI response (JSON): ${responseContent}`);
          // Store AI response linked to the user message
          await this.storeMessage(userId, ChatRole.assistant, responseContent, userMessage.id);
          return parsedContent; // Return parsed for processing
        } catch {
          responseContent = final.content; // Natural language response
          this.logger.debug(`Final AI response (text): ${responseContent}`);
          // Store AI response linked to the user message
          await this.storeMessage(userId, ChatRole.assistant, responseContent, userMessage.id);
          return responseContent;
        }
      }

      const fallbackResponse = "I'm not sure how to answer that.";
      await this.storeMessage(userId, ChatRole.assistant, fallbackResponse, userMessage.id);
      return fallbackResponse;
    } catch (err) {
      this.logger.error(err);
      const errorResponse = `Error: ${(err as Error).message}`;
      await this.storeMessage(userId, ChatRole.assistant, errorResponse, userMessage.id);
      return errorResponse;
    }
  
  }

  async storeMessage(userId: string, role: ChatRole, content: string, parentMessageId?: string): Promise<ChatMessage> {
    try {
      return await this.prisma.chatMessage.create({
        data: { 
          userId, 
          role, 
          content,
          ...(parentMessageId && { parentMessageId })
        },
      });
    } catch (error) {
      this.logger.error(`Failed to store chat message: ${error.message}`);
      throw error;
    }
  }

  async getRecentMessages(userId: string, limit: number = 10): Promise<ChatMessage[]> {
    try {
      // Get the most recent messages by ordering desc first, then reverse for chronological display
      const messages = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }, // Get newest first
        take: limit,
      });
      
      // Reverse to show in chronological order (oldest to newest for chat display)
      return messages.reverse();
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

private toSafeContent(output: unknown): string {
  
  return typeof output === "string" ? output : JSON.stringify(output);
}
}
