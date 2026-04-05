import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Data Processing and Access Control API',
      version: '1.0.0',
      description:
        'Backend API for a finance dashboard system with role-based access control. ' +
        'Supports VIEWER, ANALYST, and ADMIN roles with full financial record management.',
      contact: {
        name: 'Mohit',
        email: '19bcs1615@gmail.com',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token obtained from POST /auth/login',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        PaginatedMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        FinancialRecord: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number', format: 'decimal' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            category: { type: 'string' },
            date: { type: 'string', format: 'date' },
            notes: { type: 'string', nullable: true },
            userId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
