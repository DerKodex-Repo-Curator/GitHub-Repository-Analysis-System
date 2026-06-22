package com.githubanalysis.service;

import com.githubanalysis.client.GitHubClient;
import com.githubanalysis.client.LlmClient;
import com.githubanalysis.model.AnalysisEntity;
import com.githubanalysis.model.RepositoryEntity;
import com.githubanalysis.repository.AnalysisRepository;
import com.githubanalysis.repository.RepositoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);

    private final GitHubClient gitHubClient;
    private final LlmClient llmClient;
    private final AnalysisRepository analysisRepository;
    private final RepositoryRepository repositoryRepository;

    public AnalysisService(GitHubClient gitHubClient, LlmClient llmClient,
            AnalysisRepository analysisRepository, RepositoryRepository repositoryRepository) {
        this.gitHubClient = gitHubClient;
        this.llmClient = llmClient;
        this.analysisRepository = analysisRepository;
        this.repositoryRepository = repositoryRepository;
    }

    @Async("analysisExecutor")
    public void analyze(RepositoryEntity repo) {
        log.info("Starting analysis for {}", repo.getName());
        try {
            String[] parts = repo.getName().split("/", 2);
            String owner = parts[0];
            String name = parts.length == 2 ? parts[1] : parts[0];

            Map<String, Object> metadata = gitHubClient.fetchMetadata(owner, name);
            String readme = gitHubClient.fetchReadme(owner, name);
            String text = metadata.getOrDefault("description", "") + "\n\n" + readme;

            LlmClient.AnalysisResult result = llmClient.analyze(text);

            AnalysisEntity analysis = AnalysisEntity.builder()
                    .id(UUID.randomUUID().toString())
                    .repositoryId(repo.getId())
                    .summary(result.summary)
                    .complexityScore(result.complexityScore)
                    .topicsRaw(String.join(",", result.topics))
                    .analyzedAt(Instant.now())
                    .build();

            analysisRepository.save(analysis);

            repo.setLastAnalyzed(Instant.now());
            repositoryRepository.save(repo);

            log.info("Analysis complete for {}", repo.getName());
        } catch (Exception e) {
            log.error("Analysis failed for {}: {}", repo.getName(), e.getMessage());
        }
    }
}
