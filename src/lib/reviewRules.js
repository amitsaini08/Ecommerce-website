export const REVIEW_RULES = {
  MAX_COMMENT_CHARS: 1000,
  MAX_MEDIA_FILES: 4,
};

export function validateReview({ rating, comment, mediaUrls }) {
  const errors = {};

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = 'Please select a rating from 1 to 5';
  }
  if ((comment || '').length > REVIEW_RULES.MAX_COMMENT_CHARS) {
    errors.comment = `Comment must be ${REVIEW_RULES.MAX_COMMENT_CHARS} characters or less`;
  }
  if ((mediaUrls || []).length > REVIEW_RULES.MAX_MEDIA_FILES) {
    errors.media = `You can attach up to ${REVIEW_RULES.MAX_MEDIA_FILES} photos or videos`;
  }
  return errors;
}