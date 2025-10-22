# cd ~/journey/services/ai-service
# cat > api/main.py <<'EOF'
from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import time

app = FastAPI()

REQ_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "path", "status"])
REQ_LATENCY = Histogram("http_request_duration_seconds", "Latency", ["method", "path"])

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    resp: Response = Response(status_code=500)
    try:
        resp = await call_next(request)
        return resp
    finally:
        dur = time.perf_counter() - start
        path = request.url.path
        REQ_LATENCY.labels(request.method, path).observe(dur)
        REQ_COUNT.labels(request.method, path, str(resp.status_code)).inc()

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"service": "ai-service", "ok": True}

@app.get("/metrics")
def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
# EOF
