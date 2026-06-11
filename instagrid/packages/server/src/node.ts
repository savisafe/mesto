import http from 'node:http';
import { handleFeedRequest } from './handler';
import type { ServerOptions } from './types';

/**
 * Thin Node `http` adapter around the pure handler. Useful for local dev and
 * simple self-hosting; serverless deploys call `handleFeedRequest` directly.
 */
export function createNodeServer(opts: ServerOptions): http.Server {
    return http.createServer(async (req, res) => {
        const reply = await handleFeedRequest(
            {
                method: req.method ?? 'GET',
                path: req.url ?? '/',
                clientId: req.socket.remoteAddress ?? undefined,
            },
            opts,
        );
        res.writeHead(reply.status, reply.headers);
        res.end(reply.body);
    });
}
