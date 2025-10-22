package com.vineet.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JavaApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(JavaApiApplication.class, args);
  }
}
