package com.githubanalysis.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "repositories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepositoryEntity {

    @Id
    private String id;

    @Column(name = "github_url", unique = true, nullable = false)
    private String githubUrl;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String language;

    private Integer stars;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "last_analyzed")
    private Instant lastAnalyzed;
}
