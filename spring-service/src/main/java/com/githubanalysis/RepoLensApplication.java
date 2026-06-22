package com.githubanalysis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class RepoLensApplication {
    public static void main(String[] args) {
        SpringApplication.run(RepoLensApplication.class, args);
    }
}
