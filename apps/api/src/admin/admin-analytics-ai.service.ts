import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import {
  DateRange,
  // Import specific analytics data types if needed for strong typing in tool responses,
  // but the tools are currently designed to return JSON strings of these.
} from './admin-analytics.types';
import { Order, Request as PrismaRequest, Waiter, Shift, TableAllocation, WaiterRating, Review, User, MenuItem, RequestStatus, Prisma } from '@prisma/client';


import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, END, START, StateGraph, MemorySaver } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    default: () => [],
  }),
});

@Injectable()
export class AdminAnalyticsAiService {
  private readonly logger = new Logger(AdminAnalyticsAiService.name);
  private readonly boundModel;
  private readonly persistentGraph;
  private readonly systemPrompt: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAnalyticsService: AdminAnalyticsService,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.error('OPENAI_API_KEY is not set. AI Analytics Service will not function.');
      return;
    }

    this.systemPrompt = `You are 'Insight', an expert restaurant data analyst AI. Your goal is to help management understand restaurant performance, identify trends, and discover areas for improvement by analyzing data from various parts of the system.
Use the provided tools to fetch raw data or pre-calculated analytics summaries.
When asked complex questions, break them down. Fetch necessary data using multiple tool calls if needed, then synthesize the information to provide a comprehensive answer.
Always clearly state your findings. If data is insufficient, mention it.
Be proactive. If you find an interesting pattern or a significant metric, highlight it and offer potential explanations or recommendations.
You can perform cross-table analysis. For example, to find the best performing waiter during peak hours, you might need to correlate data from Shifts, TableAllocations, Orders, and WaiterRatings.
Prefer using summary analytics tools first (e.g., getOverallSalesSummaryTool). If you need more specific, raw, or filtered data that summary tools don't provide, use the granular data access tools (e.g., getRawOrdersTool).
Date range filters should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).
Example questions you can answer:
- "What were our total sales last week?"
- "Which waiter had the highest average rating last month?"
- "Show me the trend of hourly orders for yesterday."
- "Compare sales performance of morning shifts vs evening shifts for the last 7 days."
- "What are our top 5 most popular menu items by revenue?"
- "Which tables are most frequently occupied or generate the most revenue?"
- "Are there any unusual patterns in customer requests recently?"`;
    
    const dateRangeInputSchema = z.object({
        startDate: z.string().datetime({ message: "Invalid ISO8601 date string for startDate. Use YYYY-MM-DDTHH:mm:ss.sssZ format."}).optional().describe("Start date (YYYY-MM-DDTHH:mm:ss.sssZ) for the analysis period. Optional."),
        endDate: z.string().datetime({ message: "Invalid ISO8601 date string for endDate. Use YYYY-MM-DDTHH:mm:ss.sssZ format."}).optional().describe("End date (YYYY-MM-DDTHH:mm:ss.sssZ) for the analysis period. Optional."),
    }).describe("Optional date range for filtering data. If provided, both startDate and endDate are typically required, or the tool will use default ranges.").optional();


    const getSalesSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getSalesAnalytics(input as DateRange)),
      { name: 'getSalesSummaryTool', description: 'Retrieves sales summary: total sales, total orders, average order value, and sales trend over a date range.', schema: dateRangeInputSchema },
    );

    const getPopularItemsSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getPopularItemsAnalytics(input as DateRange)),
      { name: 'getPopularItemsSummaryTool', description: 'Retrieves popular items summary: top selling items by quantity and revenue, and revenue by item.', schema: dateRangeInputSchema },
    );

    const getShiftsSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getShiftsAnalytics(input as DateRange)),
      { name: 'getShiftsSummaryTool', description: 'Retrieves shifts summary: sales by shift, average order value by shift, and shift performance details.', schema: dateRangeInputSchema },
    );

    const getHourlySalesSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getHourlySalesAnalytics(input as DateRange)),
      { name: 'getHourlySalesSummaryTool', description: 'Retrieves hourly sales summary: sales by hour and average order value by hour for a given date range (defaults to today).', schema: dateRangeInputSchema },
    );

    const getStaffSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getStaffAnalytics(input as DateRange)),
      { name: 'getStaffSummaryTool', description: 'Retrieves staff performance summary: sales performance, order counts, and detailed performance metrics per staff member.', schema: dateRangeInputSchema },
    );

    const getTablesSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getTablesAnalytics(input as DateRange)),
      { name: 'getTablesSummaryTool', description: 'Retrieves tables summary: utilization, revenue by table, and most popular tables.', schema: dateRangeInputSchema },
    );

    const getWaiterRatingsSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getWaiterRatingsAnalytics(input as DateRange)),
      { name: 'getWaiterRatingsSummaryTool', description: 'Retrieves waiter ratings summary: average ratings, rating distribution, trend over time, recent comments, and breakdown per waiter.', schema: dateRangeInputSchema },
    );

    const getRequestsSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getRequestsAnalytics(input as DateRange)),
      { name: 'getRequestsSummaryTool', description: 'Retrieves requests summary: key metrics, status distribution, requests over time, and waiter response times.', schema: dateRangeInputSchema },
    );
    
    const getCustomerRatingsSummaryTool = tool(
      async (input?: z.infer<typeof dateRangeInputSchema>): Promise<string> =>
        JSON.stringify(await this.adminAnalyticsService.getCustomerRatingsAnalytics(input as DateRange)),
      { name: 'getCustomerRatingsSummaryTool', description: 'Retrieves overall customer ratings summary: average restaurant rating, satisfaction trend, and top feedback themes.', schema: dateRangeInputSchema },
    );

    const getRawOrdersTool = tool(
        async (filters?: { dateRange?: DateRange; tableNumber?: number; waiterId?: string; shiftId?: string; limit?: number }): Promise<string> => {
            const where: Prisma.OrderWhereInput = {};
            if (filters?.dateRange?.startDate && filters?.dateRange?.endDate) where.createdAt = { gte: new Date(filters.dateRange.startDate), lte: new Date(filters.dateRange.endDate) };
            if (filters?.tableNumber) where.tableNumber = filters.tableNumber;
            const orders = await this.prisma.order.findMany({ where, take: filters?.limit || 100, orderBy: { createdAt: 'desc' } });
            return JSON.stringify(orders);
        },
        { name: 'getRawOrdersTool', description: 'Retrieves raw order data with optional filters for date range, table number, and limit.', schema: z.object({ dateRange: dateRangeInputSchema, tableNumber: z.number().int().optional(), waiterId: z.string().uuid().optional().describe("Note: To filter by waiter, first get their allocated tables for a shift."), shiftId: z.string().uuid().optional().describe("Note: To filter by shift, first get shift times and allocated tables."), limit: z.number().int().optional() }).optional() }
    );

    const requestStatusEnum = z.enum(['New', 'Acknowledged', 'InProgress', 'Completed', 'OnHold', 'Cancelled', 'Done']);
    const getRawRequestsTool = tool(
        async (filters?: { dateRange?: DateRange; status?: z.infer<typeof requestStatusEnum>; limit?: number }): Promise<string> => {
            const where: Prisma.RequestWhereInput = {};
            if (filters?.dateRange?.startDate && filters?.dateRange?.endDate) where.createdAt = { gte: new Date(filters.dateRange.startDate), lte: new Date(filters.dateRange.endDate) };
            if (filters?.status) where.status = filters.status;
            const requests = await this.prisma.request.findMany({ where, take: filters?.limit || 100, orderBy: { createdAt: 'desc' } });
            return JSON.stringify(requests);
        },
        { name: 'getRawRequestsTool', description: 'Retrieves raw request data with optional filters for date range, status, and limit.', schema: z.object({ dateRange: dateRangeInputSchema, status: requestStatusEnum.optional(), limit: z.number().int().optional() }).optional() }
    );
    
    const getRawWaitersTool = tool(
        async (filters?: { waiterId?: string; name?: string; limit?: number }): Promise<string> => {
            const where: Prisma.WaiterWhereInput = {};
            if (filters?.waiterId) where.id = filters.waiterId;
            if (filters?.name) where.OR = [{name: {contains: filters.name, mode: 'insensitive'}}, {surname: {contains: filters.name, mode: 'insensitive'}}, {tag_nickname: {contains: filters.name, mode: 'insensitive'}}];
            const waiters = await this.prisma.waiter.findMany({ where, take: filters?.limit || 50, include: { accessAccount: {select: {userType: true}} } });
            return JSON.stringify(waiters);
        },
        { name: 'getRawWaitersTool', description: 'Retrieves raw waiter (staff) data with optional filters for ID, name (searches name, surname, tag_nickname), and limit.', schema: z.object({ waiterId: z.string().uuid().optional(), name: z.string().optional(), limit: z.number().int().optional() }).optional() }
    );

    const getRawShiftsTool = tool(
        async (filters?: { dateRange?: DateRange; limit?: number }): Promise<string> => {
            const where: Prisma.ShiftWhereInput = {};
            if (filters?.dateRange?.startDate && filters?.dateRange?.endDate) where.AND = [{date: {gte: new Date(filters.dateRange.startDate)}}, {date: {lte: new Date(filters.dateRange.endDate)}}];
            const shifts = await this.prisma.shift.findMany({ where, take: filters?.limit || 100, orderBy: { startTime: 'desc' } });
            return JSON.stringify(shifts);
        },
        { name: 'getRawShiftsTool', description: 'Retrieves raw shift data with optional date range filter and limit.', schema: z.object({ dateRange: dateRangeInputSchema, limit: z.number().int().optional() }).optional() }
    );

    const getRawTableAllocationsTool = tool(
        async (filters?: { shiftId?: string; waiterId?: string; limit?: number }): Promise<string> => {
            const where: Prisma.TableAllocationWhereInput = {};
            if (filters?.shiftId) where.shiftId = filters.shiftId;
            if (filters?.waiterId) where.waiterId = filters.waiterId;
            const allocations = await this.prisma.tableAllocation.findMany({ where, take: filters?.limit || 100, include: {shift: true, waiter: {select: {name: true, surname:true, tag_nickname:true}}} });
            return JSON.stringify(allocations);
        },
        { name: 'getRawTableAllocationsTool', description: 'Retrieves raw table allocation data with optional filters for shift ID, waiter ID, and limit.', schema: z.object({ shiftId: z.string().uuid().optional(), waiterId: z.string().uuid().optional(), limit: z.number().int().optional() }).optional() }
    );
    
    const getRawWaiterRatingsTool = tool(
        async (filters?: { waiterId?: string; dateRange?: DateRange; minRating?: number; limit?: number }): Promise<string> => {
            const where: Prisma.WaiterRatingWhereInput = {};
            if (filters?.waiterId) where.waiterId = filters.waiterId;
            if (filters?.dateRange?.startDate && filters?.dateRange?.endDate) where.createdAt = { gte: new Date(filters.dateRange.startDate), lte: new Date(filters.dateRange.endDate) };
            const ratings = await this.prisma.waiterRating.findMany({ where, take: filters?.limit || 100, orderBy: { createdAt: 'desc' } });
            return JSON.stringify(ratings);
        },
        { name: 'getRawWaiterRatingsTool', description: 'Retrieves raw waiter rating data with optional filters for waiter ID, date range, and limit.', schema: z.object({ waiterId: z.string().uuid().optional(), dateRange: dateRangeInputSchema, minRating: z.number().min(1).max(5).optional(), limit: z.number().int().optional() }).optional() }
    );

    const getRawMenuItemsTool = tool(
        async (filters?: { category?: string; status?: string; name?: string; limit?: number }): Promise<string> => {
            const where: Prisma.MenuItemWhereInput = {};
            if (filters?.category) where.category = { contains: filters.category, mode: 'insensitive' };
            if (filters?.status) where.status = filters.status;
            if (filters?.name) where.name = { contains: filters.name, mode: 'insensitive' };
            const items = await this.prisma.menuItem.findMany({ where, take: filters?.limit || 100, orderBy: { name: 'asc' } });
            return JSON.stringify(items);
        },
        { name: 'getRawMenuItemsTool', description: 'Retrieves raw menu item data with optional filters for category, status, name, and limit.', schema: z.object({ category: z.string().optional(), status: z.string().optional(), name: z.string().optional(), limit: z.number().int().optional() }).optional() }
    );

    const tools = [
      getSalesSummaryTool, getPopularItemsSummaryTool, getShiftsSummaryTool,
      getHourlySalesSummaryTool, getStaffSummaryTool, getTablesSummaryTool,
      getWaiterRatingsSummaryTool, getRequestsSummaryTool, getCustomerRatingsSummaryTool,
      getRawOrdersTool, getRawRequestsTool, getRawWaitersTool, getRawShiftsTool,
      getRawTableAllocationsTool, getRawWaiterRatingsTool, getRawMenuItemsTool,
    ];

    this.boundModel = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 }).bindTools(tools);
    const toolNode = new ToolNode(tools);

    const callModel = async (state: typeof GraphState.State, config?: RunnableConfig) => {
      if (!this.boundModel) throw new Error('AI model is not initialized.');
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

  async processAnalyticsQuery(userMessage: string, threadId: string): Promise<any> {
    if (!this.persistentGraph) {
      this.logger.error('AI Analytics Service not initialised – OPENAI_API_KEY might be missing?');
      return 'AI Analytics Service not initialised – missing API key?';
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
      return "I'm not sure how to provide an answer for that based on the available data.";
    } catch (err) {
      this.logger.error(`Error processing AI analytics query for thread ${threadId}: ${err.message}`, err.stack);
      return `Error: ${(err as Error).message}`;
    }
  }
}
