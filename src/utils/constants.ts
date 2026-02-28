/**
 * constants.ts — Application-wide constants
 *
 * Centralized location for shared constants to avoid duplication
 * and make configuration changes easier.
 */

/**
 * Similarity score threshold for flagging potential plagiarism.
 * Scores >= this value are marked as flagged in responses.
 *
 * Range: [0, 1]
 *   0.75 → high confidence plagiarism (75%+ structural similarity)
 *   0.65 → medium confidence
 *   0.40 → low confidence
 */
export const FLAG_THRESHOLD = 0.75;
