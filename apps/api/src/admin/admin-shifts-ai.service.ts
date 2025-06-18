import { Injectable, Logger } from '@nestjs/common';
import { AdminShiftsService } from './admin-shifts.service';
import { CreateShiftDto, UpdateShiftDto } from './admin-shifts.dto';
import { SHIFT_TYPES, SHIFT_STATUSES, ShiftWithStaffInfo } from './admin-shifts.types';

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
export class AdminShiftsAiService {
  private readonly logger = new Logger(AdminShiftsAiService.name);
  private readonly boundModel;
  private readonly persistentGraph;
  private readonly systemPrompt: string;

  constructor(private readonly adminShiftsService: AdminShiftsService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.error('OPENAI_API_KEY is not set. AI Shifts Service will not function.');
      return;
    }

    this.systemPrompt = `You are an intelligent AI assistant for managing restaurant staff shifts.
Use the tools at your disposal to answer user queries related to shifts.
Available shift types are: ${SHIFT_TYPES.join(', ')}.
Available shift statuses are: ${SHIFT_STATUSES.join(', ')}.

If a user asks for information or actions outside of shift management, politely decline and state your purpose.
If you need more information to fulfil a request (e.g., missing staffId for create, missing shiftId for update/delete), first try to find the info using what the user already supplied; otherwise ask the user to provide the missing information.
Before executing a create, delete or update operation, show the full details of the shift you are about to create/update/delete, and ask for user confirmation. For example:
"I am about to create a new Morning shift for Staff ID 'xyz' from 2024-07-01T09:00 to 2024-07-01T17:00. Is this correct?" or "Here is the shift (ID: 'abc') I am going to update/delete, Is this correct?".`;

    const createShiftTool = tool(
      async (input: CreateShiftDto): Promise<ShiftWithStaffInfo> => this.adminShiftsService.createShift(input),
      {
        name: 'createShift',
        description: 'Creates a new shift for a staff member. Requires staffId, startTime, endTime, and type. Status is optional (defaults to Scheduled). Always confirm details with the user before calling this tool.',
        schema: z.object({
          staffId: z.string().uuid().describe('Unique identifier of the staff member for this shift.'),
          startTime: z.string().datetime().describe('Start date and time of the shift in ISO 8601 format (e.g., 2024-07-01T09:00:00.000Z).'),
          endTime: z.string().datetime().describe('End date and time of the shift in ISO 8601 format (e.g., 2024-07-01T17:00:00.000Z).'),
          type: z.enum(SHIFT_TYPES).describe('Type of the shift.'),
          status: z.enum(SHIFT_STATUSES).optional().describe('Status of the shift. Defaults to Scheduled if not provided.'),
          notes: z.string().optional().describe('Optional notes for the shift.'),
        }).transform(data => ({...data, startTime: new Date(data.startTime), endTime: new Date(data.endTime) })),
      },
    );

    const updateShiftTool = tool(
      async (input: UpdateShiftDto & { id: string }): Promise<ShiftWithStaffInfo> => {
        const { id, ...rest } = input;
        const transformedRest = {
            ...rest,
            ...(rest.startTime && { startTime: new Date(rest.startTime) }),
            ...(rest.endTime && { endTime: new Date(rest.endTime) }),
        };
        return this.adminShiftsService.updateShift(id, transformedRest as UpdateShiftDto);
      },
      {
        name: 'updateShift',
        description: 'Updates an existing shift. Requires the shift ID. All other fields are optional. Always confirm details with the user before calling this tool.',
        schema: z.object({
          id: z.string().uuid().describe('Unique identifier (UUID) of the shift to update.'),
          startTime: z.string().datetime().optional().describe('Optional new start date and time of the shift (ISO 8601).'),
          endTime: z.string().datetime().optional().describe('Optional new end date and time of the shift (ISO 8601).'),
          type: z.enum(SHIFT_TYPES).optional().describe('Optional new type of the shift.'),
          status: z.enum(SHIFT_STATUSES).optional().describe('Optional new status of the shift.'),
          notes: z.string().optional().describe('Optional new notes for the shift.'),
        }),
      },
    );

    const deleteShiftTool = tool(
      async ({ id }: { id: string }): Promise<{ message: string }> => {
        await this.adminShiftsService.deleteShift(id);
        return { message: `Shift with ID ${id} has been deleted.` };
      },
      {
        name: 'deleteShift',
        description: 'Deletes a shift. Requires the shift ID. Always confirm with the user (stating shift details) before calling this destructive tool.',
        schema: z.object({
          id: z.string().uuid().describe('Unique identifier (UUID) of the shift to delete.'),
        }),
      },
    );

    const getAllShiftsTool = tool(
      async (): Promise<string> => JSON.stringify(await this.adminShiftsService.getAllShifts()),
      {
        name: 'getAllShifts',
        description: 'Lists all scheduled shifts, including staff information if available.',
        schema: z.object({}),
      },
    );

    const getShiftTypesTool = tool(
      async (): Promise<string> => JSON.stringify(SHIFT_TYPES.slice()),
      {
        name: 'getShiftTypes',
        description: 'Returns a list of available shift types (e.g., Morning, Afternoon).',
        schema: z.object({}),
      },
    );

    const getShiftStatusesTool = tool(
      async (): Promise<string> => JSON.stringify(SHIFT_STATUSES.slice()),
      {
        name: 'getShiftStatuses',
        description: 'Returns a list of available shift statuses (e.g., Scheduled, Active, Completed).',
        schema: z.object({}),
      },
    );

    const tools = [
      createShiftTool,
      updateShiftTool,
      deleteShiftTool,
      getAllShiftsTool,
      getShiftTypesTool,
      getShiftStatusesTool,
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

  async processShiftsQuery(userMessage: string, threadId: string): Promise<any> {
    if (!this.persistentGraph) {
      this.logger.error('AI Shifts Service not initialised – OPENAI_API_KEY might be missing?');
      return 'AI Shifts Service not initialised – missing API key?';
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
      this.logger.error(`Error processing AI shifts query for thread ${threadId}: ${err.message}`, err.stack);
      return `Error: ${(err as Error).message}`;
    }
  }
}
