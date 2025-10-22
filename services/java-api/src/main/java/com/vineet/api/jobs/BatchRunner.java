package com.vineet.api.jobs;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.stream.IntStream;

@Component
public class BatchRunner {

  private final ExecutorService worker;

  public BatchRunner(ExecutorService worker) {
    this.worker = worker;
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
      worker.shutdown();
      try { worker.awaitTermination(10, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
    }));
  }

  @Scheduled(initialDelay = 5000, fixedDelay = 30000)
  public void scheduledBatch() {
    String batchId = UUID.randomUUID().toString();
    List<CompletableFuture<String>> futures = IntStream.range(0, 10)
        .mapToObj(i -> CompletableFuture.supplyAsync(() -> doWork(batchId, i), worker)
            .orTimeout(5, TimeUnit.SECONDS)
            .handle((ok, ex) -> ex == null ? ok : "ERR"))
        .toList();

    CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
        .thenRun(() -> {
          long ok = futures.stream().filter(f -> {
            try { return !"ERR".equals(f.get()); } catch (Exception e) { return false; }
          }).count();
          System.out.printf("[java-api] batch=%s ok=%d/%d @%s%n",
              batchId, ok, futures.size(), Instant.now());
        });
  }

  private String doWork(String batchId, int i) {
    try { Thread.sleep(200 + (long)(Math.random()*400)); } catch (InterruptedException ignored) {}
    if (i % 7 == 0) throw new RuntimeException("transient");
    return "ok:" + batchId + ":" + i;
  }
}
