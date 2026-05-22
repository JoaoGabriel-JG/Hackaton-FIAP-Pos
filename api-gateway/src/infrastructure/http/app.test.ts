import http from "node:http";
import pino from "pino";
import request from "supertest";
import { createApp } from "./app.js";

type StubResponse = {
  statusCode: number;
  body: Record<string, unknown>;
};

function startStubServer(routes: Record<string, StubResponse>) {
  const requests: Array<{ method: string; path: string; correlationId?: string }> = [];

  const server = http.createServer((req, res) => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";
    const key = `${method} ${url}`;
    const route = routes[key];

    requests.push({
      method,
      path: url,
      correlationId: req.headers["x-correlation-id"] as string | undefined,
    });

    if (!route) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    res.writeHead(route.statusCode, { "content-type": "application/json" });
    res.end(JSON.stringify(route.body));
  });

  return new Promise<{ baseUrl: string; close: () => Promise<void>; requests: typeof requests }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve server address");
      }

      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        requests,
        close: () =>
          new Promise<void>((done, reject) => {
            server.close((err) => {
              if (err) {
                reject(err);
                return;
              }
              done();
            });
          }),
      });
    });
  });
}

describe("api-gateway proxy routes", () => {
  it("proxies POST /api/uploads to upload-service /uploads and propagates correlation id", async () => {
    const uploadServer = await startStubServer({
      "POST /uploads": { statusCode: 201, body: { jobId: "job-1" } },
    });

    const app = createApp({
      logger: pino({ enabled: false }),
      uploadServiceUrl: uploadServer.baseUrl,
      reportServiceUrl: uploadServer.baseUrl,
    });

    const response = await request(app)
      .post("/api/uploads")
      .set("x-correlation-id", "corr-123")
      .send({ any: "payload" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ jobId: "job-1" });
    expect(uploadServer.requests[0]).toMatchObject({
      method: "POST",
      path: "/uploads",
      correlationId: "corr-123",
    });

    await uploadServer.close();
  });

  it("proxies report routes to report-service", async () => {
    const reportServer = await startStubServer({
      "GET /api/reports/job-7/status": {
        statusCode: 200,
        body: { jobId: "job-7", status: "done" },
      },
      "GET /api/reports/job-7": {
        statusCode: 200,
        body: { jobId: "job-7", summary: "ok" },
      },
    });

    const app = createApp({
      logger: pino({ enabled: false }),
      uploadServiceUrl: reportServer.baseUrl,
      reportServiceUrl: reportServer.baseUrl,
    });

    const statusResponse = await request(app).get("/api/reports/job-7/status");
    const reportResponse = await request(app).get("/api/reports/job-7");

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body).toEqual({ jobId: "job-7", status: "done" });
    expect(reportResponse.status).toBe(200);
    expect(reportResponse.body).toEqual({ jobId: "job-7", summary: "ok" });

    await reportServer.close();
  });

  it("returns upstream error status when upstream is unavailable", async () => {
    const app = createApp({
      logger: pino({ enabled: false }),
      uploadServiceUrl: "http://127.0.0.1:1",
      reportServiceUrl: "http://127.0.0.1:1",
    });

    const response = await request(app).get("/api/reports/job-1");

    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});
