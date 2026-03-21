/**
 * @file memory.js
 * Semantic similarity search over historical requests.
 * Uses keyword token overlap (Jaccard-style) to find similar past events.
 *
 * This is intentionally simple for the hackathon — no embeddings or vector DB.
 * In production, swap with a proper semantic search using embeddings stored
 * in pgvector or Pinecone.
 */

/**
 * Tokenizes a string into a Set of lowercase words (>2 chars, no punctuation).
 * Stop words are filtered to improve signal quality.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenize(text) {
  if (!text) return new Set();

  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'will', 'have',
    'are', 'was', 'were', 'been', 'has', 'had', 'our', 'your', 'their',
    'not', 'but', 'all', 'can', 'its', 'any', 'more', 'also', 'who',
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

/**
 * Computes Jaccard similarity between two token sets.
 * Score = |intersection| / |union|, ranging from 0.0 to 1.0.
 *
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number} Similarity score 0-1
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Finds the top 3 most similar historical requests to a new incoming request.
 * Compares on eventDescription + eventName + eventCity tokens combined.
 *
 * Use case: "Similar requests" panel in the admin detail view, helping admins
 * see how comparable events were routed and resolved in the past.
 *
 * @param {Object} newRequest - The new or candidate request object
 * @param {Array<Object>} allRequests - All existing requests from the store
 * @returns {Array<{ request: Object, similarityScore: number }>} Top 3 matches, sorted descending
 */
export function findSimilarRequests(newRequest, allRequests) {
  // Build token set for the new request (combine all text fields)
  const newTokens = tokenize(
    [newRequest.eventDescription, newRequest.eventName, newRequest.eventCity, newRequest.requestorName]
      .filter(Boolean)
      .join(' ')
  );

  const scored = allRequests
    // Exclude the request itself if it's already in the store
    .filter((r) => r.id !== newRequest.id)
    .map((r) => {
      const rTokens = tokenize(
        [r.eventDescription, r.eventName, r.eventCity, r.requestorName]
          .filter(Boolean)
          .join(' ')
      );

      const similarityScore = jaccardSimilarity(newTokens, rTokens);

      return { request: r, similarityScore };
    })
    // Sort descending by score
    .sort((a, b) => b.similarityScore - a.similarityScore)
    // Return top 3
    .slice(0, 3);

  return scored;
}
