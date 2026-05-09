import { Injectable } from "@nestjs/common";
import { RagConfigService } from "./rag-config.service";
import {
    RagArticleChunk
    , RagArticleChunkSource
} from "./types/rag-chunk.types";

@Injectable()
export class RagChunkingService {
    constructor(private readonly config: RagConfigService) { }

    createArticleChunks(article: RagArticleChunkSource): RagArticleChunk[] {
        var text = this.createArticleText(article);
        var normalizedText = this.normalizeText(text);

        if (!normalizedText) {
            return [];
        }

        var chunkSize = this.config.getChunkSize();
        var chunkOverlap = this.config.getChunkOverlap();
        var chunks = this.splitText(normalizedText, chunkSize, chunkOverlap);

        return chunks.map((chunk, index) => ({
            articleId: article.articleId,
            articleTitle: article.articleTitle,
            articleStatus: article.articleStatus,
            categoryId: article.categoryId,
            tags: article.tags,
            chunkIndex: index,
            chunk,
            updatedAt: article.updatedAt,
        }));
    }

    private createArticleText(article: RagArticleChunkSource): string {
        return [
            `Title: ${article.articleTitle}`,
            "",
            article.articleContent,
        ].join("\n");
    }

    private normalizeText(text: string): string {
        return text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    private splitText(text: string, chunkSize: number, chunkOverlap: number): string[] {
        var chunks: string[] = [];
        var start = 0;
        var step = chunkSize - chunkOverlap;

        while (start < text.length) {
            var rawEnd = Math.min(start + chunkSize, text.length);
            var end = this.findChunkEnd(text, start, rawEnd);
            var chunk = text.slice(start, end).trim();

            if (chunk) {
                chunks.push(chunk);
            }

            if (end >= text.length) {
                break;
            }

            start = Math.max(0, end - chunkOverlap);

            if (start >= end) {
                start = end + step;
            }
        }

        return chunks;
    }

    private findChunkEnd(text: string, start: number, rawEnd: number): number {
        if (rawEnd >= text.length) {
            return text.length;
        }

        var minEnd = start + Math.floor((rawEnd - start) * 0.75);
        var lastParagraphBreak = text.lastIndexOf("\n\n", rawEnd);

        if (lastParagraphBreak > minEnd) {
            return lastParagraphBreak;
        }

        var lastLineBreak = text.lastIndexOf("\n", rawEnd);

        if (lastLineBreak > minEnd) {
            return lastLineBreak;
        }

        var lastSpace = text.lastIndexOf(" ", rawEnd);

        if (lastSpace > minEnd) {
            return lastSpace;
        }

        return rawEnd;
    }
}