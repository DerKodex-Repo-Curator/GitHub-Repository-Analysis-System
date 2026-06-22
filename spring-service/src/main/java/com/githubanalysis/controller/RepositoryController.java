package com.githubanalysis.controller;

import com.githubanalysis.model.AnalysisEntity;
import com.githubanalysis.model.RepositoryEntity;
import com.githubanalysis.service.RepositoryService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class RepositoryController {

    private final RepositoryService service;

    public RepositoryController(RepositoryService service) {
        this.service = service;
    }

    @QueryMapping
    public RepositoryEntity repository(@Argument String id) {
        return service.getRepository(id).orElse(null);
    }

    @QueryMapping
    public List<RepositoryEntity> repositories(@Argument String language, @Argument Integer limit) {
        return service.listRepositories(language, limit);
    }

    @QueryMapping
    public AnalysisEntity analysis(@Argument String repositoryId) {
        return service.getAnalysis(repositoryId).orElse(null);
    }

    @SchemaMapping(typeName = "Repository", field = "analysis")
    public AnalysisEntity repositoryAnalysis(RepositoryEntity repository) {
        return service.getAnalysis(repository.getId()).orElse(null);
    }

    @MutationMapping
    public RepositoryEntity addRepository(@Argument String githubUrl) {
        return service.addRepository(githubUrl);
    }

    @MutationMapping
    public String analyzeRepository(@Argument String id) {
        return service.triggerAnalysis(id);
    }
}
