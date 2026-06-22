package com.githubanalysis.service;

import com.githubanalysis.client.GitHubClient;
import com.githubanalysis.model.AnalysisEntity;
import com.githubanalysis.model.RepositoryEntity;
import com.githubanalysis.repository.AnalysisRepository;
import com.githubanalysis.repository.RepositoryRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class RepositoryService {

    private final RepositoryRepository repositoryRepository;
    private final AnalysisRepository analysisRepository;
    private final AnalysisService analysisService;
    private final GitHubClient gitHubClient;

    public RepositoryService(RepositoryRepository repositoryRepository,
            AnalysisRepository analysisRepository,
            AnalysisService analysisService,
            GitHubClient gitHubClient) {
        this.repositoryRepository = repositoryRepository;
        this.analysisRepository = analysisRepository;
        this.analysisService = analysisService;
        this.gitHubClient = gitHubClient;
    }

    public RepositoryEntity addRepository(String githubUrl) {
        String[] ownerRepo = parseGithubUrl(githubUrl);
        Map<String, Object> meta = gitHubClient.fetchMetadata(ownerRepo[0], ownerRepo[1]);

        RepositoryEntity repo = RepositoryEntity.builder()
                .id(UUID.randomUUID().toString())
                .githubUrl(githubUrl)
                .name(ownerRepo[0] + "/" + ownerRepo[1])
                .description((String) meta.getOrDefault("description", ""))
                .language((String) meta.getOrDefault("language", ""))
                .stars(meta.get("stargazers_count") instanceof Number ? ((Number) meta.get("stargazers_count")).intValue() : 0)
                .createdAt(Instant.now())
                .build();

        return repositoryRepository.save(repo);
    }

    public String triggerAnalysis(String id) {
        RepositoryEntity repo = repositoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Repository not found: " + id));
        analysisService.analyze(repo);
        return "Analysis started for: " + repo.getName();
    }

    public Optional<RepositoryEntity> getRepository(String id) {
        return repositoryRepository.findById(id);
    }

    public List<RepositoryEntity> listRepositories(String language, Integer limit) {
        List<RepositoryEntity> repos = (language != null)
                ? repositoryRepository.findByLanguage(language)
                : repositoryRepository.findAll();
        return (limit != null) ? repos.stream().limit(limit).toList() : repos;
    }

    public Optional<AnalysisEntity> getAnalysis(String repositoryId) {
        return analysisRepository.findByRepositoryId(repositoryId);
    }

    private String[] parseGithubUrl(String url) {
        String path = url.replaceAll("https?://github\\.com/", "").replaceAll("\\.git$", "");
        String[] parts = path.split("/", 2);
        if (parts.length != 2) throw new IllegalArgumentException("Invalid GitHub URL: " + url);
        return parts;
    }
}
