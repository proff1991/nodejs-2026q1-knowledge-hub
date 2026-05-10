import { Injectable } from "@nestjs/common";
import { RagSearchCandidate } from "./types/rag-search.types";

@Injectable()
export class RagRerankingService {
    rerank(query: string, candidates: RagSearchCandidate[]): RagSearchCandidate[] {
        return candidates
            .map((candidate) => this.rerankCandidate(query, candidate))
            .sort((left, right) => right.rerankScore - left.rerankScore);
    }

    private rerankCandidate(query: string, candidate: RagSearchCandidate): RagSearchCandidate {
        var titleScore = this.calculateLexicalScore(query, candidate.articleTitle);
        var chunkScore = this.calculateLexicalScore(query, candidate.chunk);
        var phraseScore = this.calculatePhraseScore(query, candidate.chunk);
        var semanticSimilarity = candidate.semanticSimilarity ?? 0;
        var lexicalScore = Math.max(candidate.lexicalScore ?? 0, chunkScore);
        var rerankScore =
            semanticSimilarity * 0.7
            + lexicalScore * 0.2
            + titleScore * 0.07
            + phraseScore * 0.03;

        return {
            ...candidate
            , similarity: rerankScore
            , lexicalScore
            , rerankScore
        };
    }

    private calculatePhraseScore(query: string, text: string): number {
        var normalizedQuery = this.normalizeText(query);
        var normalizedText = this.normalizeText(text);

        if (!normalizedQuery || !normalizedText) {
            return 0;
        }

        return normalizedText.includes(normalizedQuery) ? 1 : 0;
    }

    private calculateLexicalScore(query: string, text: string): number {
        var queryTerms = this.getTerms(query);
        var textTerms = this.getTerms(text);

        if (queryTerms.length === 0 || textTerms.length === 0) {
            return 0;
        }

        var textTermSet = new Set(textTerms);
        var matchedTerms = queryTerms.filter((term) => textTermSet.has(term));

        return matchedTerms.length / queryTerms.length;
    }

    private getTerms(value: string): string[] {
        return this.normalizeText(value)
            .split(" ")
            .filter((term) => term.length >= 3);
    }

    private normalizeText(value: string): string {
        return value
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
}
