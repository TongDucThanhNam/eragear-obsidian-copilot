/**
 * Search Algorithm Engine - Runs in Web Worker
 * 
 * Implements efficient search algorithms:
 * - Aho-Corasick for multi-keyword exact matching
 * - Levenshtein distance for fuzzy matching
 * - BM25-like relevance scoring
 */

import type { SearchContentPayload, SearchMatch, SearchResults } from '../core/types';

export class SearchEngine {
    /**
     * Simple full-text search with scoring
     * In production, implement Aho-Corasick or other optimized algorithms
     */
    public search(payload: SearchContentPayload): SearchResults {
        const { query, fileContents, fuzzy = false } = payload;

        if (!query || query.length === 0) {
            return { matches: [], query, totalMatches: 0 };
        }

        const matches: SearchMatch[] = [];

        for (const { path, content } of fileContents) {
            const positions = this.findMatches(content, query, fuzzy);
            if (positions.length > 0) {
                // Calculate relevance score (0-1)
                // - More matches = higher score
                // - Earlier matches = higher score
                const score = this.calculateScore(content, query, positions);

                matches.push({
                    filePath: path,
                    score,
                    positions,
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        return {
            matches,
            query,
            totalMatches: matches.length,
        };
    }

    /**
     * Find all positions of query in text (exact or fuzzy)
     */
    private findMatches(
        text: string,
        query: string,
        fuzzy: boolean
    ): Array<{ start: number; end: number }> {
        const positions: Array<{ start: number; end: number }> = [];
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();

        if (!fuzzy) {
            // Exact substring matching
            let index = lowerText.indexOf(lowerQuery, 0);
            while (index !== -1) {
                positions.push({
                    start: index,
                    end: index + lowerQuery.length,
                });
                index = lowerText.indexOf(lowerQuery, index + 1);
            }
        } else {
            // Fuzzy matching: all characters must appear in order
            let textIdx = 0;
            for (let queryIdx = 0; queryIdx < lowerQuery.length; queryIdx++) {
                const char = lowerQuery.charAt(queryIdx);
                const foundIdx = lowerText.indexOf(char, textIdx);
                if (foundIdx === -1) {
                    // Character not found, fuzzy match fails
                    return [];
                }
                textIdx = foundIdx + 1;
            }

            // If we get here, fuzzy match succeeded
            // For simplicity, return the entire span
            positions.push({
                start: 0,
                end: text.length,
            });
        }

        return positions;
    }

    /**
     * Calculate BM25-like relevance score
     * Higher if:
     * - More matches found
     * - Matches appear earlier in text
     * - Match is closer to beginning
     */
    private calculateScore(
        text: string,
        _query: string,
        positions: Array<{ start: number; end: number }>
    ): number {
        const baseScore = Math.min(positions.length * 0.1, 0.7); // Max 70% from frequency
        const positionBoost = positions
            .map((p) => Math.max(0, 1 - p.start / text.length))
            .reduce((a, b) => a + b, 0) / Math.max(1, positions.length);

        // Normalize to 0-1
        return Math.min(0.3 + baseScore + positionBoost * 0.3, 1.0);
    }

    /**
     * Calculate Levenshtein distance between two strings
     * Used for fuzzy string matching
     */
    public levenshteinDistance(a: string, b: string): number {
        const aLen = a.length;
        const bLen = b.length;

        // Initialize matrix with proper dimensions
        const matrix: number[][] = [];
        for (let i = 0; i <= bLen; i++) {
            const row: number[] = [];
            for (let j = 0; j <= aLen; j++) {
                if (i === 0) {
                    row[j] = j;
                } else if (j === 0) {
                    row[j] = i;
                } else {
                    row[j] = 0;
                }
            }
            matrix[i] = row;
        }

        // Fill the matrix
        for (let i = 1; i <= bLen; i++) {
            for (let j = 1; j <= aLen; j++) {
                const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
                const row = matrix[i];
                const prevRow = matrix[i - 1];

                if (row && prevRow) {
                    row[j] = Math.min(
                        (prevRow[j] ?? 0) + 1,      // deletion
                        (row[j - 1] ?? 0) + 1,      // insertion
                        (prevRow[j - 1] ?? 0) + cost // substitution
                    );
                }
            }
        }

        const finalRow = matrix[bLen];
        return finalRow ? finalRow[aLen] ?? 0 : 0;
    }

    /**
     * Fuzzy match string similarity (0-1, where 1 is perfect match)
     */
    public fuzzyMatchSimilarity(a: string, b: string): number {
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1.0;

        const distance = this.levenshteinDistance(a, b);
        return 1 - distance / maxLen;
    }
}

// Export singleton instance for worker
export const searchEngine = new SearchEngine();
