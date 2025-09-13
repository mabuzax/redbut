import { Injectable, Logger } from '@nestjs/common';
import { AdminStaffService } from './admin-staff.service';
import { CreateStaffMemberDto, UpdateStaffMemberDto } from './admin-staff.dto';
import { STAFF_POSITIONS } from './admin-staff.types';
import { RestaurantService } from '../restaurant/restaurant.service';

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import {
  Annotation,
  END,
  START,
  StateGraph,
  MemorySaver,
} from '@langchain/langgraph';

import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';

import { ChatOpenAI } from '@langchain/openai';
import { RunnableConfig } from '@langchain/core/runnables';


const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  userContext: Annotation<any>({
    reducer: (x, y) => y ?? x,
  }),
});

@Injectable()
export class AdminStaffAiService {
  private readonly logger = new Logger(AdminStaffAiService.name);

  private readonly boundModel;
  private readonly persistentGraph;
  private currentUserContext: any = null; // Store user context for tool access

  /* ----------------------------- system prompt ---------------------------- */
  private readonly systemPrompt = `Today's date is: ${new Date().toISOString().split('T')[0]}. You are an intelligent AI assistant for managing restaurant staff.
Use the tools at your disposal to answer user queries related to staff.

If a user asks for information or actions outside of staff management, politely decline and state your purpose.
If you need more information to fulfil a request, first try to find the info using what the user already supplied; otherwise ask the user to provide the missing information.
Before executing a create, delete or update operation, show the full record you are about to update, and ask for user confirmation. For example:
"I am about to create a new Waiter: John Doe, john.doe@example.com, tag: JohnnyD. Is this correct? or Here is the record of John Doe I am going to update/delet, Is this correct?".`;

  constructor(
    private readonly adminStaffService: AdminStaffService,
    private readonly restaurantService: RestaurantService,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.error(
        'OPENAI_API_KEY is not set. AI Staff Service will not function.',
      );
      return;
    }

    const createStaffMember = tool(
      async (input: CreateStaffMemberDto) => {
        // Auto-fill restaurantId if not provided and user context has it
        if (!input.restaurantId && this.currentUserContext?.restaurantId) {
          input.restaurantId = this.currentUserContext.restaurantId;
          this.logger.log(`Auto-filled restaurantId: ${input.restaurantId} from user context`);
        }
        
        return this.adminStaffService.createStaffMember(input);
      },
      {
        name: 'createStaffMember',
        description:
          'Creates a new staff member. Requires name, surname, tag_nickname, position, and restaurantId. Either email or phone is required. Use getTenantRestaurants tool first to get available restaurants and ask user to choose.',
        schema: z.object({
          name: z.string().describe('First name of the staff member'),
          surname: z.string().describe('Last name of the staff member'),
          email: z.string().email().optional().describe('Email address - either email or phone must be provided'),
          tag_nickname: z.string().describe('Unique tag name or nickname for the staff member'),
          position: z.enum(STAFF_POSITIONS).describe('Position/role of the staff member (Waiter, Admin)'),
          restaurantId: z.string().uuid().describe('Restaurant ID to assign the staff member to - REQUIRED. Use getTenantRestaurants to get available options.'),
          password: z.string().min(6).optional().describe('Password for the staff member (optional, defaults to system default)'),
          address: z.string().optional().describe('Home address of the staff member'),
          phone: z.string().optional().describe('Phone number - either email or phone must be provided'),
          propic: z.string().url().optional().describe('URL to the profile picture'),
        }),
      },
    );

    const updateStaffMember = tool(
      async (input: UpdateStaffMemberDto & { id: string }) => {
        const { id, ...rest } = input;
        return this.adminStaffService.updateStaffMember(id, rest);
      },
      {
        name: 'updateStaffMember',
        description:
          'Updates an existing staff member (ID required). Email/password cannot be changed.',
        schema: z.object({
          id: z.string().uuid(),
          name: z.string().optional(),
          surname: z.string().optional(),
          tag_nickname: z.string().optional(),
          position: z.enum(STAFF_POSITIONS).optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          propic: z.string().url().optional(),
        }),
      },
    );

    const deleteStaffMember = tool(
      async ({ id }: { id: string }) => {
        await this.adminStaffService.deleteStaffMember(id);
        return { message: `Staff member with ID ${id} has been deleted.` };
      },
      {
        name: 'deleteStaffMember',
        description:
          'Deletes a staff member (ID required). Always confirm with the user first.',
        schema: z.object({
          id: z.string().uuid(),
        }),
      },
    );

  const getAllStaffMembers = tool(
  async () => JSON.stringify(await adminStaffService.getAllStaffMembers()),
  {
    name: "getAllStaffMembers",
    description: "Lists all staff members.",
    schema: z.object({}),
  },
);

const getStaffPositions = tool(
  async () => JSON.stringify(STAFF_POSITIONS.slice()),
  {
    name: "getStaffPositions",
    description: "Returns available staff positions.",
    schema: z.object({}),
  },
);

const getCurrentRestaurantInfo = tool(
  async () => {
    if (this.currentUserContext?.restaurantId) {
      return JSON.stringify({
        restaurantId: this.currentUserContext.restaurantId,
        message: "This is the restaurant ID that will be used for new staff members if not specified otherwise."
      });
    }
    return JSON.stringify({ message: "No restaurant context available" });
  },
  {
    name: "getCurrentRestaurantInfo",
    description: "Gets the current user's restaurant information and context.",
    schema: z.object({}),
  },
);

const getTenantRestaurants = tool(
  async () => {
    if (this.currentUserContext?.tenantId || this.currentUserContext?.id) {
      // For tenant type users, use tenantId. For admin users, use their id as tenantId
      const tenantId = this.currentUserContext.tenantId || this.currentUserContext.id;
      const restaurants = await this.restaurantService.getAllRestaurants(tenantId);
      return JSON.stringify({
        restaurants: restaurants.map(r => ({
          id: r.id,
          name: r.name,
          location: r.location,
          address: r.address,
          status: r.status
        })),
        message: "These are the restaurants available for this tenant. Use the restaurant ID when creating staff members."
      });
    }
    return JSON.stringify({ 
      restaurants: [],
      message: "No tenant context available to fetch restaurants" 
    });
  },
  {
    name: "getTenantRestaurants",
    description: "Gets all restaurants for the current tenant. Use this to show available restaurants when creating staff members.",
    schema: z.object({}),
  },
);


    const tools = [
      createStaffMember,
      updateStaffMember,
      deleteStaffMember,
      getAllStaffMembers,
      getStaffPositions,
      getCurrentRestaurantInfo,
      getTenantRestaurants,
    ];

    this.boundModel = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0,
    }).bindTools(tools); // ↖ bound once and reused (recommended)


    const toolNode = new ToolNode(tools);

    const callModel = async (
      state: typeof GraphState.State,
      config?: RunnableConfig,
    ) => {
      if (!this.boundModel) {
        throw new Error('AI model is not initialized.');
      }
      const response = await this.boundModel.invoke(state.messages, config);
      this.logger.debug(`AI response: ${response.content}`);
      return { messages: [response] };
    };

    // routing
    const routeMessage = (state: typeof GraphState.State) => {
      const last = state.messages[state.messages.length - 1] as AIMessage;
      return last.tool_calls?.length ? 'tools' : END;
    };

    const workflow = new StateGraph(GraphState)
      .addNode('agent', callModel)
      .addNode('tools', toolNode)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', routeMessage)
      .addEdge('tools', 'agent');

    const memory = new MemorySaver();
    this.persistentGraph = workflow.compile({ checkpointer: memory });
  }

  async processStaffQuery(
    userMessage: string,
    threadId: string,
    userContext?: any,
  ): Promise<any> {
    if (!this.persistentGraph) {
      return 'AI Staff Service not initialised – missing API key?';
    }

    // Store user context for tool access
    this.currentUserContext = userContext;
    this.logger.log(`Processing staff query with user context:`, JSON.stringify(userContext, null, 2));

    const config: RunnableConfig = { configurable: { thread_id: threadId } }; 

    // Enhanced system prompt with user context
    let contextualPrompt = this.systemPrompt;
    if (userContext?.restaurantId) {
      contextualPrompt += `\n\nIMPORTANT: The current logged-in admin user belongs to restaurant ID: ${userContext.restaurantId}. 
When creating staff members, if no restaurantId is provided in the request, automatically use this restaurant ID: ${userContext.restaurantId}.
If the user asks to create staff for a different restaurant, ask for confirmation and use the specified restaurant ID instead.

VALIDATION RULES:
- If a user requests to create a staff member but doesn't provide a restaurant, automatically use restaurant ID: ${userContext.restaurantId}
- If email is not provided, ask the user to provide either an email or phone number
- If phone is not provided and no email is given, ask the user to provide either an email or phone number  
- If tag_nickname is not provided, ask the user to provide a unique tag/nickname
- If position is not provided, ask the user to specify the position (Waiter or Admin)
- Always show the complete staff member details before creating and ask for confirmation`;
    } else {
      contextualPrompt += `\n\nIMPORTANT: No specific restaurant context is available. When a user requests to create a staff member:

RESTAURANT SELECTION PROCESS:
1. Use the 'getTenantRestaurants' tool to fetch available restaurants for this tenant
2. Present the list of restaurants to the user and ask them to choose which restaurant to assign the staff member to
3. Use the selected restaurant ID in the createStaffMember tool

VALIDATION RULES:
- Always fetch and show available restaurants before creating staff members
- Ask user to select a restaurant from the available options
- If email is not provided, ask the user to provide either an email or phone number
- If phone is not provided and no email is given, ask the user to provide either an email or phone number  
- If tag_nickname is not provided, ask the user to provide a unique tag/nickname
- If position is not provided, ask the user to specify the position (Waiter or Admin)
- Always show the complete staff member details before creating and ask for confirmation`;
    }

    const systemMsg = new SystemMessage(contextualPrompt);
    const userMsg = new HumanMessage(userMessage);

    const inputs = { 
      messages: [systemMsg, userMsg],
      userContext: userContext 
    };

    try {
      const { messages } = await this.persistentGraph.invoke(inputs, config);
      const final = messages[messages.length - 1];

      if (typeof final.content === 'string') {
        try {
          return JSON.parse(final.content); // JSON payloads
        } catch {
          return final.content; // natural-language answers
        }
      }
      return "I'm not sure how to answer that.";
    } catch (err) {
      this.logger.error(err);
      return `Error: ${(err as Error).message}`;
    } finally {
      // Clear user context after processing
      this.currentUserContext = null;
    }
  }
}
