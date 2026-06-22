package com.githubanalysis.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Base64;
import java.util.Map;

@Component
public class GitHubClient {

    private static final Logger log = LoggerFactory.getLogger(GitHubClient.class);
    private static final Duration META_TTL = Duration.ofHours(1);
    private static final Duration README_TTL = Duration.ofHours(6);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final WebClient webClient;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public GitHubClient(
            WebClient webClient,
            StringRedisTemplate redis,
            ObjectMapper objectMapper,
            @Value("${github.token:}") String token) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.webClient = token.isBlank() ? webClient
                : WebClient.builder().defaultHeader("Authorization", "Bearer " + token).build();
    }

    public Map<String, Object> fetchMetadata(String owner, String repo) {
        String key = "github:meta:" + owner + ":" + repo;
        String cached = cacheGet(key);
        if (cached != null) return parse(cached);

        Map<String, Object> data = webClient.get()
                .uri("https://api.github.com/repos/{owner}/{repo}", owner, repo)
                .retrieve()
                .bodyToMono(MAP_TYPE)
                .onErrorReturn(Map.of())
                .block();

        cacheSet(key, serialize(data), META_TTL);
        return data != null ? data : Map.of();
    }

    public String fetchReadme(String owner, String repo) {
        String key = "github:readme:" + owner + ":" + repo;
        String cached = cacheGet(key);
        if (cached != null) return cached;

        try {
            Map<String, Object> response = webClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/readme", owner, repo)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .onErrorReturn(Map.of())
                    .block();

            if (response == null || !response.containsKey("content")) return "";
            String content = new String(Base64.getDecoder()
                    .decode(((String) response.get("content")).replaceAll("\\s", "")));
            cacheSet(key, content, README_TTL);
            return content;
        } catch (Exception e) {
            log.warn("Failed to fetch README for {}/{}: {}", owner, repo, e.getMessage());
            return "";
        }
    }

    private String cacheGet(String key) {
        try { return redis.opsForValue().get(key); } catch (Exception e) { return null; }
    }

    private void cacheSet(String key, String value, Duration ttl) {
        try { redis.opsForValue().set(key, value, ttl); } catch (Exception e) { /* Redis optional */ }
    }

    private Map<String, Object> parse(String json) {
        try { return objectMapper.readValue(json, objectMapper.getTypeFactory()
                .constructMapType(Map.class, String.class, Object.class));
        } catch (Exception e) { return Map.of(); }
    }

    private String serialize(Object obj) {
        try { return objectMapper.writeValueAsString(obj); } catch (Exception e) { return "{}"; }
    }
}
