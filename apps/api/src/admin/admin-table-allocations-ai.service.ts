import { Injectable, Logger } from '@nestjs/common';
import { AdminTableAllocationsService } from './admin-table-allocations.service';
import { CreateTableAllocationDto, UpdateTableAllocationDto } from './admin-table-allocations.dto';
import { TableAllocationWithDetails } from './admin-table-allocations.types';
import { AdminShiftsService } from './admin-shifts.service';
import { AdminStaffService } from './admin-staff.service';

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, END, START, StateGraph, MemorySaver } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

@Injectable()
export class AdminTableAllocationsAiService {
  private readonly logger = new Logger(AdminTableAllocationsAiService.name);
  private readonly boundModel;
  private readonly persistentGraph;
  private readonly systemPrompt: string;

  constructor(
    private readonly adminTableAllocationsService: AdminTableAllocationsService,
    private readonly adminShiftsService: AdminShiftsService,
    private readonly adminStaffService: AdminStaffService,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.error('OPENAI_API_KEY is not set. AI Table Allocations Service will not function.');
      return;
    }

    this.systemPrompt = `You are an intelligent AI assistant for managing restaurant table allocations.
A table allocation assigns specific tables (numbers 1-50) to a specific waiter for a specific shift.
Required information for creating an allocation: shiftId (UUID of an existing shift), tableNumbers (an array of numbers, e.g., [1, 2, 5]), and waiterId (UUID of an existing waiter).
Use the tools at your disposal to answer user queries related to table allocations.

If the user provides a shift date/time instead of a shiftId, use the 'getShiftsTool' to find the correct shift and its ID.
If the user provides a waiter name or tag name instead of a waiterId, use the 'getWaitersTool' to find the correct waiter and their ID.
Always confirm the found shift (with date and time) and waiter (with name and tag name) with the user before proceeding with an allocation.

If a user asks for information or actions outside of table allocation management, politely decline and state your purpose.
If you need more information to fulfil a request (e.g., missing shiftId, tableNumbers, or waiterId for create; missing allocationId for update/delete), first try to find the info using what the user already supplied or the provided tools; otherwise ask the user to provide the missing information.
Before executing a create, delete or update operation, show the full details of the allocation you are about to create/update/delete, and ask for user confirmation. For example:
"I am about to allocate tables [1, 5, 10] to Waiter John Doe (ID: waiter_uuid) for Shift (ID: shift_uuid, Date: YYYY-MM-DD, Time: HH:MM-HH:MM). Is this correct?" or "Here is the allocation (ID: 'abc', Tables: [...], Waiter: ..., Shift: ...) I am going to update/delete, Is this correct?".`;

    const createTableAllocationTool = tool(
      async (input: CreateTableAllocationDto): Promise<TableAllocationWithDetails> =>
        this.adminTableAllocationsService.createTableAllocation(input),
      {
        name: 'createTableAllocation',
        description: 'Creates a new table allocation. Requires shiftId, tableNumbers (array), and waiterId. Always confirm details with the user before calling this tool.',
        schema: z.object({
          shiftId: z.string().uuid().describe('Unique identifier of the shift for this allocation.'),
          tableNumbers: z.array(z.number().min(1).max(50)).min(1).describe('Array of table numbers (1-50) to be allocated.'),
          waiterId: z.string().uuid().describe('Unique identifier of the waiter assigned to these tables for this shift.'),
        }),
      },
    );

    const updateTableAllocationTool = tool(
      async (input: UpdateTableAllocationDto & { id: string }): Promise<TableAllocationWithDetails> => {
        const { id, ...rest } = input;
        return this.adminTableAllocationsService.updateTableAllocation(id, rest);
      },
      {
        name: 'updateTableAllocation',
        description: 'Updates an existing table allocation. Requires the allocation ID. All other fields (shiftId, tableNumbers, waiterId) are optional. Always confirm details with the user before calling this tool.',
        schema: z.object({
          id: z.string().uuid().describe('Unique identifier (UUID) of the table allocation to update.'),
          shiftId: z.string().uuid().optional().describe('Optional new unique identifier of the shift.'),
          tableNumbers: z.array(z.number().min(1).max(50)).min(1).optional().describe('Optional new array of table numbers.'),
          waiterId: z.string().uuid().optional().describe('Optional new unique identifier of the waiter.'),
        }),
      },
    );

    const deleteTableAllocationTool = tool(
      async ({ id }: { id: string }): Promise<{ message: string }> => {
        await this.adminTableAllocationsService.deleteTableAllocation(id);
        return { message: `Table allocation with ID ${id} has been deleted.` };
      },
      {
        name: 'deleteTableAllocation',
        description: 'Deletes a table allocation. Requires the allocation ID. Always confirm with the user (stating allocation details) before calling this destructive tool.',
        schema: z.object({
          id: z.string().uuid().describe('Unique identifier (UUID) of the table allocation to delete.'),
        }),
      },
    );

    const getAllTableAllocationsTool = tool(
      async (): Promise<string> => JSON.stringify(await this.adminTableAllocationsService.getAllTableAllocations()),
      {
        name: 'getAllTableAllocations',
        description: 'Lists all table allocations, including shift and waiter details if available.',
        schema: z.object({}),
      },
    );

    const getShiftsTool = tool(
      async (): Promise<string> => JSON.stringify(await this.adminShiftsService.getAllShifts()),
      {
        name: 'getShiftsTool',
        description: 'Lists all available shifts. Use this to find a shiftId based on date and time provided by the user.',
        schema: z.object({}),
      },
    );

    const getWaitersTool = tool(
      async (): Promise<string> => JSON.stringify(await this.adminStaffService.getAllStaffMembers()),
      {
        name: 'getWaitersTool',
        description: 'Lists all available staff members (waiters). Use this to find a waiterId based on name or tag name provided by the user.',
        schema: z.object({}),
      },
    );

    const tools = [
      createTableAllocationTool,
      updateTableAllocationTool,
      deleteTableAllocationTool,
      getAllTableAllocationsTool,
      getShiftsTool,
      getWaitersTool,
    ];

    this.boundModel = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0,
    }).bindTools(tools);

    const toolNode = new ToolNode(tools);

    const callModel = async (state: typeof GraphState.State, config?: RunnableConfig) => {
      if (!this.boundModel) {
        throw new Error('AI model is not initialized.');
      }
      const response = await this.boundModel.invoke(state.messages, config);
      this.logger.debug(`AI response: ${JSON.stringify(response)}`);
      return { messages: [response] };
    };

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

  async processTableAllocationsQuery(userMessage: string, threadId: string): Promise<any> {
    if (!this.persistentGraph) {
      this.logger.error('AI Table Allocations Service not initialised – OPENAI_API_KEY might be missing?');
      return 'AI Table Allocations Service not initialised – missing API key?';
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
          return JSON.parse(final.content);
        } catch {
          return final.content;
        }
      }
      this.logger.warn(`AI response for thread ${threadId} did not have string content: ${JSON.stringify(final)}`);
      return "I'm not sure how to answer that.";
    } catch (err) {
      this.logger.error(`Error processing AI table allocations query for thread ${threadId}: ${err.message}`, err.stack);
      return `Error: ${(err as Error).message}`;
    }
  }
}
