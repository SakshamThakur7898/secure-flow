import serverless from 'serverless-http';
import { createServer } from '../../src/server.js';

const app = createServer();

export const handler = serverless(app);