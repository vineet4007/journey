package com.vineet.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class SchedulerConfig {
  @Bean(destroyMethod = "shutdown")
  public ExecutorService workerPool() {
    int n = Math.max(4, Runtime.getRuntime().availableProcessors());
    return Executors.newFixedThreadPool(n);
  }
}
