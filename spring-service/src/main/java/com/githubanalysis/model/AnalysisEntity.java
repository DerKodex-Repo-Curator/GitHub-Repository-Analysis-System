package com.githubanalysis.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "analyses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisEntity {

    @Id
    private String id;

    @Column(name = "repository_id", nullable = false)
    private String repositoryId;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "complexity_score")
    private Double complexityScore;

    @Column(name = "topics")
    private String topicsRaw;

    @Column(name = "analyzed_at")
    private Instant analyzedAt;

    // GraphQL resolves `topics: [String!]!` via this getter
    public List<String> getTopics() {
        if (topicsRaw == null || topicsRaw.isBlank()) return List.of();
        return Arrays.asList(topicsRaw.split(","));
    }
}
