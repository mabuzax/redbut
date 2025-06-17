import { Injectable, Logger } from '@nestjs/common';
import { AdminStaffService } from './admin-staff.service';
import { CreateStaffMemberDto, UpdateStaffMemberDto } from './admin-staff.dto';
import { STAFF_POSITIONS } from './admin-staff.types';

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
});

@Injectable()
export class AdminStaffAiService {
  private readonly logger = new Logger(AdminStaffAiService.name);

  private readonly boundModel;
  private readonly persistentGraph;

  /* ----------------------------- system prompt ---------------------------- */
  private readonly systemPrompt = `You are an intelligent AI assistant for managing restaurant staff.
Use the tools at your disposal to answer user queries related to staff.

If a user asks for information or actions outside of staff management, politely decline and state your purpose.
If you need more information to fulfil a request, first try to find the info using what the user already supplied; otherwise ask the user to provide the missing information.
Before executing a create, delete or update operation, show the full record you are about to update, and ask for user confirmation. For example:
"I am about to create a new Waiter: John Doe, john.doe@example.com, tag: JohnnyD. Is this correct? or Here is the record of John Doe I am going to update/delet, Is this correct?".`;

  constructor(private readonly adminStaffService: AdminStaffService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.error(
        'OPENAI_API_KEY is not set. AI Staff Service will not function.',
      );
      return;
    }

    const createStaffMember = tool(
      async (input: CreateStaffMemberDto) =>
        this.adminStaffService.createStaffMember(input),
      {
        name: 'createStaffMember',
        description:
          'Creates a new staff member. Requires name, surname, email, tag_nickname and position.',
        schema: z.object({
          name: z.string(),
          surname: z.string(),
          email: z.string().email(),
          tag_nickname: z.string(),
          position: z.enum(STAFF_POSITIONS),
          password: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          propic: z.string().url().optional(),
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


    const tools = [
      createStaffMember,
      updateStaffMember,
      deleteStaffMember,
      getAllStaffMembers,
      getStaffPositions,
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
  ): Promise<any> {
    if (!this.persistentGraph) {
      return 'AI Staff Service not initialised – missing API key?';
    }

    const config: RunnableConfig = { configurable: { thread_id: threadId } };

    const systemMsg = new SystemMessage(this.systemPrompt);
    const userMsg = new HumanMessage(userMessage);

    const inputs = { messages: [systemMsg, userMsg] };

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
    }
  }
}
