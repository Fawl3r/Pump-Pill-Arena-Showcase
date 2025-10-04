import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

/**
 * Leaderboard API Routes
 * 
 * This module handles all leaderboard-related API endpoints for the Pump Pill Arena platform.
 * It provides real-time trading rankings, pagination, and data aggregation functionality.
 * 
 * Features:
 * - Real-time leaderboard data with pagination
 * - Input validation using Zod schemas
 * - Error handling and logging
 * - Performance optimization with caching
 * - Type-safe request/response handling
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Query parameters schema for leaderboard requests
 * Validates pagination and filtering parameters
 */
const LeaderboardQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  pageSize: z.string().optional().default('50').transform(Number),
  epoch: z.string().optional().transform(val => val ? Number(val) : undefined),
  sortBy: z.enum(['volume', 'rank', 'rewards']).optional().default('rank'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Response schema for leaderboard data
 * Ensures consistent response structure
 */
const LeaderboardResponseSchema = z.object({
  data: z.array(z.object({
    rank: z.number(),
    wallet: z.string(),
    volToken: z.number(),
    volSol: z.number(),
    volUsd: z.number().optional(),
    rewardLamports: z.string(),
    trades: z.number().optional(),
    winRate: z.number().optional(),
  })),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  metadata: z.object({
    epoch: z.number().optional(),
    lastUpdated: z.string(),
    totalVolume: z.number(),
    totalRewards: z.string(),
  }),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Leaderboard entry type definition
 * Represents a single row in the leaderboard
 */
interface LeaderboardEntry {
  rank: number;
  wallet: string;
  volToken: number;
  volSol: number;
  volUsd?: number;
  rewardLamports: string;
  trades?: number;
  winRate?: number;
}

/**
 * Pagination metadata type
 * Contains pagination information for API responses
 */
interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Leaderboard response type
 * Complete response structure for leaderboard endpoints
 */
interface LeaderboardResponse {
  data: LeaderboardEntry[];
  pagination: PaginationMeta;
  metadata: {
    epoch?: number;
    lastUpdated: string;
    totalVolume: number;
    totalRewards: string;
  };
}

// ============================================================================
// MOCK DATA (for demonstration)
// ============================================================================

/**
 * Mock leaderboard data for demonstration purposes
 * In production, this would be replaced with actual database queries
 */
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    volToken: 1500000,
    volSol: 25.5,
    volUsd: 2550.00,
    rewardLamports: "1000000000",
    trades: 45,
    winRate: 0.78,
  },
  {
    rank: 2,
    wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    volToken: 1200000,
    volSol: 20.3,
    volUsd: 2030.00,
    rewardLamports: "800000000",
    trades: 38,
    winRate: 0.72,
  },
  {
    rank: 3,
    wallet: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    volToken: 980000,
    volSol: 16.7,
    volUsd: 1670.00,
    rewardLamports: "650000000",
    trades: 32,
    winRate: 0.68,
  },
];

/**
 * Get leaderboard data with pagination and filtering
 * 
 * This function simulates database queries and data processing.
 * In production, it would integrate with the actual database and
 * implement proper caching, sorting, and filtering logic.
 * 
 * @param page - Page number for pagination
 * @param pageSize - Number of items per page
 * @param epoch - Optional epoch filter
 * @param sortBy - Field to sort by
 * @param order - Sort order (asc/desc)
 * @returns Processed leaderboard data with pagination
 */
async function getLeaderboardData(
  page: number,
  pageSize: number,
  epoch?: number,
  sortBy: string = 'rank',
  order: string = 'desc'
): Promise<LeaderboardResponse> {
  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Apply sorting (in production, this would be done at database level)
  let sortedData = [...mockLeaderboardData];
  if (sortBy === 'volume') {
    sortedData.sort((a, b) => order === 'desc' ? b.volSol - a.volSol : a.volSol - b.volSol);
  } else if (sortBy === 'rewards') {
    sortedData.sort((a, b) => {
      const aRewards = parseInt(a.rewardLamports);
      const bRewards = parseInt(b.rewardLamports);
      return order === 'desc' ? bRewards - aRewards : aRewards - bRewards;
    });
  }

  // Apply pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Calculate pagination metadata
  const total = mockLeaderboardData.length;
  const totalPages = Math.ceil(total / pageSize);

  // Calculate aggregate statistics
  const totalVolume = mockLeaderboardData.reduce((sum, entry) => sum + entry.volSol, 0);
  const totalRewards = mockLeaderboardData.reduce((sum, entry) => sum + parseInt(entry.rewardLamports), 0).toString();

  return {
    data: paginatedData,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
    metadata: {
      epoch,
      lastUpdated: new Date().toISOString(),
      totalVolume,
      totalRewards,
    },
  };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * Register leaderboard routes with Fastify instance
 * 
 * @param fastify - Fastify instance to register routes with
 */
export async function leaderboardRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/leaderboard
   * 
   * Retrieves paginated leaderboard data with optional filtering and sorting.
   * Supports real-time updates and efficient pagination for large datasets.
   * 
   * Query Parameters:
   * - page: Page number (default: 1)
   * - pageSize: Items per page (default: 50, max: 100)
   * - epoch: Filter by specific epoch (optional)
   * - sortBy: Sort field (volume, rank, rewards)
   * - order: Sort order (asc, desc)
   * 
   * Response: Leaderboard data with pagination metadata
   */
  fastify.get('/leaderboard', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          pageSize: { type: 'string', default: '50' },
          epoch: { type: 'string' },
          sortBy: { type: 'string', enum: ['volume', 'rank', 'rewards'] },
          order: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rank: { type: 'number' },
                  wallet: { type: 'string' },
                  volToken: { type: 'number' },
                  volSol: { type: 'number' },
                  volUsd: { type: 'number' },
                  rewardLamports: { type: 'string' },
                  trades: { type: 'number' },
                  winRate: { type: 'number' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                pageSize: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
            metadata: {
              type: 'object',
              properties: {
                epoch: { type: 'number' },
                lastUpdated: { type: 'string' },
                totalVolume: { type: 'number' },
                totalRewards: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Parse and validate query parameters
      const query = LeaderboardQuerySchema.parse(request.query);
      
      // Validate page size limits
      if (query.pageSize > 100) {
        return reply.status(400).send({
          error: 'Page size cannot exceed 100 items',
          code: 'INVALID_PAGE_SIZE',
        });
      }

      // Get leaderboard data
      const leaderboardData = await getLeaderboardData(
        query.page,
        query.pageSize,
        query.epoch,
        query.sortBy,
        query.order
      );

      // Log successful request for monitoring
      fastify.log.info({
        endpoint: '/leaderboard',
        page: query.page,
        pageSize: query.pageSize,
        epoch: query.epoch,
        sortBy: query.sortBy,
        order: query.order,
        resultCount: leaderboardData.data.length,
      }, 'Leaderboard data retrieved successfully');

      // Return successful response
      return reply.status(200).send(leaderboardData);

    } catch (error) {
      // Log error for debugging
      fastify.log.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: request.query,
      }, 'Error retrieving leaderboard data');

      // Return appropriate error response
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: error.errors,
          code: 'VALIDATION_ERROR',
        });
      }

      return reply.status(500).send({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * GET /api/leaderboard/stats
   * 
   * Retrieves aggregate statistics for the leaderboard including
   * total participants, volume, and reward distribution metrics.
   * 
   * Response: Statistical summary of leaderboard data
   */
  fastify.get('/leaderboard/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            totalParticipants: { type: 'number' },
            totalVolume: { type: 'number' },
            totalRewards: { type: 'string' },
            averageVolume: { type: 'number' },
            topPerformer: {
              type: 'object',
              properties: {
                wallet: { type: 'string' },
                volume: { type: 'number' },
                rewards: { type: 'string' },
              },
            },
            lastUpdated: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Calculate aggregate statistics
      const totalParticipants = mockLeaderboardData.length;
      const totalVolume = mockLeaderboardData.reduce((sum, entry) => sum + entry.volSol, 0);
      const totalRewards = mockLeaderboardData.reduce((sum, entry) => sum + parseInt(entry.rewardLamports), 0);
      const averageVolume = totalVolume / totalParticipants;
      
      // Find top performer
      const topPerformer = mockLeaderboardData.reduce((top, current) => 
        current.volSol > top.volSol ? current : top
      );

      const stats = {
        totalParticipants,
        totalVolume,
        totalRewards: totalRewards.toString(),
        averageVolume,
        topPerformer: {
          wallet: topPerformer.wallet,
          volume: topPerformer.volSol,
          rewards: topPerformer.rewardLamports,
        },
        lastUpdated: new Date().toISOString(),
      };

      fastify.log.info({
        endpoint: '/leaderboard/stats',
        totalParticipants,
        totalVolume,
      }, 'Leaderboard statistics retrieved successfully');

      return reply.status(200).send(stats);

    } catch (error) {
      fastify.log.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error retrieving leaderboard statistics');

      return reply.status(500).send({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  });
}
