import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
// Precise message type expected by the OpenAI SDK
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { PrismaService } from '../common/prisma.service';
import { ChatMessage, ChatRole, MenuItem, RequestStatus } from '@prisma/client'; // Added MenuItem
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  /**
   * OpenAI client instance.  It is only initialised when the
   * `OPENAI_API_KEY` environment variable is present.  If the key is
   * missing we keep this field `null` and respond with a fallback
   * message so the rest of the application can keep working.
   */
  private readonly openai: OpenAI | null;

  /** Helper flag – `true` when the OpenAI client is available. */
  private readonly aiEnabled: boolean;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly requestsService: RequestsService,
  ) {
    // Initialise OpenAI client only if an API key is supplied.
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey });
      this.aiEnabled = true;
    } else {
      // No key → disable AI but keep service functional.
      this.logger.warn(
        'OPENAI_API_KEY is not set. Falling back to stubbed AI responses.',
      );
      this.openai = null;
      this.aiEnabled = false;
    }
  }

  /**
   * Process a user message and get an AI response
   * @param userId User ID
   * @param tableNumber Table number
   * @param content User message content
   * @returns AI response and waiter request status
   */
  async processMessage(
    userId: string,
    tableNumber: number,
    content: string,
  ): Promise<{
    response: string
  }> {
    this.logger.log(`Processing message from user ${userId} at table ${tableNumber}`);

    // Store user message in database
    await this.storeMessage(userId, ChatRole.user, content);

    // Get previous messages for context
    const previousMessages = await this.getRecentMessages(userId, 10);

    // ────────────────────────────────────────────────────────────
    // Load current menu so the assistant can answer menu questions
    // without hitting the database on every token.  We keep it short
    // and declarative to stay within token budget.
    // ────────────────────────────────────────────────────────────
    const menuDescription = await this.getMenuDescription();

    // Format messages for OpenAI (include menu + guard-rails prompt)
    const messages = this.formatMessagesForOpenAI(
      previousMessages,
      content,
      menuDescription,
    );

    // Get response from OpenAI
    const { response: aiResponse, toolCalls } = await this.getOpenAIResponse(messages);

    let finalResponse = this.appendSuffix(aiResponse);

    // Handle tool calls
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'create_waiter_request') {
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const waiterRequestContent = toolArgs.content || 'Waiter requested';
          const toolResponse = await this._handleWaiterRequestTool(
            userId,
            tableNumber,
            waiterRequestContent,
          );
          finalResponse = toolResponse; // Override AI response with tool response
          break; // Assuming only one tool call for now
        }
      }
    }

    // Store AI response in database
    await this.storeMessage(userId, ChatRole.assistant, finalResponse);

    return {
      response: finalResponse
    };
  }

  /**
   * Store a chat message in the database
   * @param userId User ID
   * @param role Message role (user or assistant)
   * @param content Message content
   * @returns Stored message
   */
  private async storeMessage(
  userId: string,
  role: ChatRole,
  content: string,
): Promise<ChatMessage> {
  try {
    return await this.prisma.chatMessage.create({
      data: {
        userId,
        role,
        content,
      },
    });
  } catch (error) {
    this.logger.error(`Failed to store chat message: ${error.message}`);
    throw error;
  }
}

  /**
   * Get recent messages for a user to provide context
   * @param userId User ID
   * @param limit Maximum number of messages to retrieve
   * @returns Array of recent messages
   */
  private async getRecentMessages(
    userId: string,
    limit: number = 10,
  ): Promise<ChatMessage[]> {
    try {
      return await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Failed to get recent messages: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a formatted description of the menu from the database.
   * @returns A string describing the menu categories and items.
   */
  private async getMenuDescription(): Promise<string> {
    try {
      const activeItems = await this.prisma.menuItem.findMany({
        where: { status: 'Active' },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      if (activeItems.length === 0) {
        return 'No menu items available at the moment.';
      }

      let menuDescription = 'Current Menu:\\n';
      let currentCategory: string | null = null;

      for (const item of activeItems) {
        const itemCategory = item.category || 'Other Items'; // Default category for null or empty strings
        
        if (itemCategory !== currentCategory) {
          // Add an extra newline if this isn't the very first category entry (after "Current Menu:\n")
          if (currentCategory !== null) {
            menuDescription += '\\n'; 
          }
          menuDescription += `${itemCategory}:\\n`;
          currentCategory = itemCategory;
        }
        
        const priceStr = item.price.toFixed(2);
        const descriptionStr = item.description ? ` - ${item.description}` : '';
        menuDescription += `  - ${item.name}: $${priceStr}${descriptionStr}\\n`;
      }
      return menuDescription;
    } catch (error) {
      this.logger.error(`Failed to retrieve menu description: ${error.message}`);
      return 'I am sorry, I could not retrieve the menu information at this time.';
    }
  }

  /**
   * Format messages for OpenAI API
   * @param previousMessages Previous messages from database
   * @param currentMessage Current user message
   * @param menuDescription Current menu information
   * @returns Formatted messages for OpenAI
   */
  private formatMessagesForOpenAI(
    previousMessages: ChatMessage[],
    currentMessage: string,
    menuDescription: string,
  ): ChatCompletionMessageParam[] {
    const systemPromptContent = 
      'You are a bubbly, friendly, and concise restaurant waiter assistant AI named RedBut. ' +
      'Answer questions directly and in short sentences. ' +
      'Only answer questions related to the restaurant, such as open times, menu items, or services. ' +
      'If a question is not related to the restaurant, politely decline to answer. ' +
      'If the user asks about menu items, answer as best you can, suggest other things that go well with that menu item, ' +
      'and always ask if you should place an order for the user, or call the waiter to the table. ' +
      'Do not make up information about the restaurant or menu. ' +
      `Here is the current menu information:\\n${menuDescription}\\n\\n` +
      'Restaurant open times: Monday-Friday 11 AM - 10 PM, Saturday-Sunday 10 AM - 11 PM.';

    const systemPrompt = {
      role: 'system',
      content: systemPromptContent,
    };

    // Convert previous messages to OpenAI format and reverse to chronological order
    const formattedPreviousMessages = previousMessages
      .reverse()
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Add current message
    const currentUserMessage = {
      role: 'user',
      content: currentMessage,
    };

    // Combine all messages with system prompt first
    return [systemPrompt, ...formattedPreviousMessages, currentUserMessage] as ChatCompletionMessageParam[];
  }

  /**
   * Get response from OpenAI
   * @param messages Formatted messages for context
   * @returns AI response text and any tool calls
   */
  private async getOpenAIResponse(
    messages: ChatCompletionMessageParam[],
  ): Promise<{ response: string; toolCalls?: OpenAI.Chat.ChatCompletion.Choice['message']['tool_calls'] }> {
    // If AI is disabled return a static fallback.
    if (!this.aiEnabled || !this.openai) {
      return {
        response:
          'I am currently unable to access my knowledge base. ' +
          'Please ask the waiter directly.',
      };
    }
    this.logger.log('Going to call OpenAI', messages);
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
        messages: messages,
        max_tokens: 500,
        temperature: 0,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_waiter_request',
              description: 'Creates a request to the waiter as asked for by the user. Use this tool when the user explicitly asks for a waiter or assistance that requires human intervention.',
              parameters: {
                type: 'object',
                properties: {
                  content: {
                    type: 'string',
                    description: 'The content of the request to the waiter (e.g., "Come to table", "Need to pay", "Help with menu").',
                  },
                },
                required: ['content'],
              },
            },
          },
        ],
        tool_choice: 'auto', // Allow OpenAI to decide when to use the tool
      });

      const message = completion.choices[0]?.message;

      if (message?.tool_calls && message.tool_calls.length > 0) {
        return { response: '', toolCalls: message.tool_calls };
      }

      return { response: message?.content || 'Sorry, I couldn\\\'t generate a response.' };
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      return { response: 'Sorry, I\\\'m having trouble connecting to my brain right now. Please try again later.' };
    }
  }

  /**
   * Handles the tool call to create a waiter request.
   * @param userId The ID of the user making the request.
   * @param tableNumber The table number of the user.
   * @param content The content of the waiter request.
   * @returns A confirmation message for the user.
   */
  private async _handleWaiterRequestTool(
    userId: string,
    tableNumber: number,
    content: string,
  ): Promise<string> {
    try {
      await this.requestsService.create({
        userId,
        tableNumber,
        content: content,
      });
      this.logger.log(`Waiter request created for user ${userId} at table ${tableNumber}: \"${content}\"`);
      return 'I have informed the waiter about your request.';
    } catch (error) {
      this.logger.error(`Failed to create waiter request via tool: ${error.message}`);
      return 'I apologize, I was unable to inform the waiter at this moment. Please try again or call the waiter directly.';
    }
  }

  /**
   * Append the required suffix to AI responses
   * @param response Original AI response
   * @returns Response with suffix
   */
  private appendSuffix(response: string): string {    
    // Add suffix with proper spacing
    return `${response.trim()}`;
  }

  /**
   * Get chat history for a user
   * @param userId User ID
   * @param limit Maximum number of messages to retrieve
   * @returns Chat history
   */
  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      return await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Failed to get chat history: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear chat history for a user
   * @param userId User ID
   * @returns Count of deleted messages
   */
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
