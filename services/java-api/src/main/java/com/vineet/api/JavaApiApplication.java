package com.vineet.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

@SpringBootApplication
@EnableScheduling
public class JavaApiApplication {

  @Bean
  public ExecutorService workerPool() {
    return Executors.newFixedThreadPool(Math.max(4, Runtime.getRuntime().availableProcessors()));
  }

  public static void main(String[] args) {
    SpringApplication.run(JavaApiApplication.class, args);
  }

  private final ExecutorService worker;

  public JavaApiApplication(ExecutorService worker) {
    this.worker = worker;
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
      worker.shutdown();
      try { worker.awaitTermination(10, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}
    }));
  }

  // every 30s, fan-out 8 parallel tasks; log result count
  @Scheduled(initialDelay = 5000, fixedDelay = 30000)
  public void scheduledBatch() {
    String batchId = UUID.randomUUID().toString();
    List<CompletableFuture<String>> futures = java.util.stream.IntStream.range(0, 8)
      .mapToObj(i -> CompletableFuture.supplyAsync(() -> {
        try { Thread.sleep(200 + (long)(Math.random()*400)); } catch (InterruptedException ignored) {}
        if (i % 5 == 0) throw new RuntimeException("transient");
        return "ok:" + i;
      }, worker).orTimeout(5, TimeUnit.SECONDS).handle((ok, ex) -> ex == null ? ok : "ERR"))
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

  @RestController
  static class Api {
    @GetMapping("/healthz") public java.util.Map<String,String> health() {
      return java.util.Map.of("status","ok");
    }
  }
}
