# fix ai-service main.py (properly indented)
# cat > services/ai-service/api/main.py <<'EOF'
from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import time

app = FastAPI()

REQ_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "path", "status"])
REQ_LATENCY = Histogram("http_request_duration_seconds", "Latency", ["method", "path"])

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    resp: Response
    try:
        resp = await call_next(request)
        return resp
    finally:
        dur = time.perf_counter() - start
        path = request.url.path
        REQ_LATENCY.labels(request.method, path).observe(dur)
        status = str(resp.status_code) if 'resp' in locals() else "500"
        REQ_COUNT.labels(request.method, path, status).inc()

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"service": "ai-service", "ok": True}

@app.get("/metrics")
def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
# EOF

    start = time.perf_counter()
    resp: Response
    try:
        resp = await call_next(request)
        return resp
    finally:
        dur = time.perf_counter() - start
        path = request.url.path
        REQ_LATENCY.labels(request.method, path).observe(dur)
        status = str(resp.status_code) if 'resp' in locals() else "500"
        REQ_COUNT.labels(request.method, path, status).inc()

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"service": "ai-service", "ok": True}

@app.get("/metrics")
def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
# EOF
