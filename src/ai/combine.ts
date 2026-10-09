/**
 * How the scanner combines its two AI opinions. Kept free of other imports so
 * the training scripts (scripts/training) can evaluate exactly this logic.
 */
import type { WasteResult } from './classifyWaste';

/** At or above this confidence we show the result; below it, the user picks. */
export const CONFIDENCE_THRESHOLD = 0.7;

/** How sure ImageNet must be about a different category before we ask instead of answering. */
const IMAGENET_VETO = 0.8;

/**
 * Combine the trained waste head with the ImageNet mapping.
 * The trained head decides. But if ImageNet clearly recognises the object as a
 * DIFFERENT category (e.g. it is sure it's a plastic bottle), we don't guess:
 * the confidence drops below the 70% threshold and the user is asked.
 * Compared on 5-fold cross-validation (scripts/training), this kept answers
 * right ~97% of the time with the fewest wrong answers for a reasonable ask rate.
 */
export function combineOpinions(trained: WasteResult, imagenet: WasteResult): WasteResult {
  const result = { ...trained };
  const imagenetSure = imagenet.category !== 'notwaste' && imagenet.confidence >= IMAGENET_VETO;
  if (imagenetSure && imagenet.category !== trained.category) {
    result.confidence = Math.min(result.confidence, CONFIDENCE_THRESHOLD - 0.05);
  } else if (imagenet.category === trained.category) {
    result.item = imagenet.item; // ImageNet names the item, e.g. "Banana peel"
  }
  return result;
}
