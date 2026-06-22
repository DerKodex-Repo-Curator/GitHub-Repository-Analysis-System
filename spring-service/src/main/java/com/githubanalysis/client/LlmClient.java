package com.githubanalysis.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Component
public class LlmClient {

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<Map<String, Object>>() {};

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String model;
    private final boolean enabled;

    public static class AnalysisResult {
        public final String summary;
        public final double complexityScore;
        public final List<String> topics;

        public AnalysisResult(String summary, double complexityScore, List<String> topics) {
            this.summary = summary;
            this.complexityScore = complexityScore;
            this.topics = topics;
        }
    }

    public LlmClient(
            WebClient webClient,
            ObjectMapper objectMapper,
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-4o-mini}") String model) {
        this.objectMapper = objectMapper;
        this.model = model;
        this.enabled = !apiKey.isBlank();
        this.webClient = enabled
                ? WebClient.builder()
                        .defaultHeader("Authorization", "Bearer " + apiKey)
                        .defaultHeader("Content-Type", "application/json")
                        .build()
                : webClient;
    }

    public AnalysisResult analyze(String repoText) {
        if (!enabled) {
            log.info("No OPENAI_API_KEY — returning stub analysis");
            return stub();
        }

        String prompt = "Analyze this GitHub repository and respond in JSON with exactly these fields:\n"
                + "{\"summary\": \"2-3 sentence summary\", \"complexity_score\": <1-10>, \"topics\": [\"topic1\"]}\n\n"
                + "Repository content:\n"
                + repoText.substring(0, Math.min(repoText.length(), 3000));

        try {
            Map<String, Object> response = webClient.post()
                    .uri("https://api.openai.com/v1/chat/completions")
                    .bodyValue(Map.of(
                            "model", model,
                            "messages", List.of(Map.of("role", "user", "content", prompt)),
                            "response_format", Map.of("type", "json_object")
                    ))
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();

            String content = extractContent(response);
            Map<String, Object> parsed = objectMapper.readValue(content, objectMapper.getTypeFactory()
                    .constructMapType(Map.class, String.class, Object.class));

            @SuppressWarnings("unchecked")
            List<String> topics = (List<String>) parsed.get("topics");

            return new AnalysisResult(
                    (String) parsed.get("summary"),
                    ((Number) parsed.get("complexity_score")).doubleValue(),
                    topics
            );
        } catch (Exception e) {
            log.error("LLM call failed: {}", e.getMessage());
            return stub();
        }
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> response) {
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    private AnalysisResult stub() {
        return new AnalysisResult(
                "Add OPENAI_API_KEY to enable live analysis.",
                5.0,
                List.of("java", "spring-boot", "graphql")
        );
    }
}
