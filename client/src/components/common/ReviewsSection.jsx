import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { reviewService } from '../../services/portalService';
import StarRating from './StarRating';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function DistributionBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ width: 14, textAlign: 'right', color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#FBBF24', fontSize: 11 }}>★</span>
      <div style={{ flex: 1, height: 8, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
            borderRadius: 8,
            transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>
      <span style={{ width: 28, color: '#94a3b8', fontSize: 12 }}>{count}</span>
    </div>
  );
}

function ReviewCard({ review, onDelete, currentUserId, isAdmin }) {
  const initials = review.student?.name
    ? review.student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const canDelete = isAdmin || review.student?.id === currentUserId;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #f1f5f9',
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {review.student?.avatar ? (
          <img
            src={review.student.avatar}
            alt={review.student.name}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f1f5f9' }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
          }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{review.student?.name || 'Anonymous'}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{timeAgo(review.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StarRating value={review.rating} size={16} />
          {canDelete && (
            <button
              onClick={() => onDelete(review.id)}
              style={{
                background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                fontSize: 13, padding: '2px 6px', borderRadius: 6,
                opacity: 0.7, transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.target.style.opacity = 1}
              onMouseLeave={e => e.target.style.opacity = 0.7}
              title="Delete review"
              aria-label="Delete review"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {/* Comment */}
      <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.65 }}>{review.comment}</p>
    </div>
  );
}

/**
 * ReviewsSection — displays reviews and average ratings for a course or instructor.
 *
 * Props:
 *  type         {string}   'course' | 'instructor'
 *  targetId     {string}   courseId or instructorId
 *  targetLabel  {string}   Used in UI (e.g. "this course" / "this trainer")
 *  isEnrolled   {boolean}  Whether the current student can leave a review
 */
export default function ReviewsSection({ type, targetId, targetLabel = 'this course', isEnrolled = false }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'ADMIN';
  const hasReviewed = reviews.some(r => r.student?.id === user?.id);
  const canReview = isStudent && isEnrolled && !hasReviewed;

  const fetchReviews = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const fn = type === 'instructor' ? reviewService.getByInstructor : reviewService.getByCourse;
      const res = await fn(targetId);
      const data = res.data?.data;
      setReviews(data?.reviews || []);
      setAverage(data?.average || 0);
      setCount(data?.count || 0);
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, [targetId, type]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Please select a star rating.');
    if (!comment.trim()) return toast.error('Please write a comment.');
    setSubmitting(true);
    try {
      const payload = { rating, comment };
      if (type === 'course') payload.courseId = targetId;
      else payload.instructorId = targetId;
      await reviewService.create(payload);
      toast.success('Review submitted!');
      setRating(0);
      setComment('');
      fetchReviews();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await reviewService.delete(id);
      toast.success('Review removed.');
      fetchReviews();
    } catch {
      toast.error('Could not delete review.');
    }
  };

  // Rating distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    label: star,
    count: reviews.filter(r => r.rating === star).length,
  }));

  return (
    <section style={{ marginTop: 48 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
          Ratings &amp; Reviews
        </h2>
        <span style={{ fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: 20 }}>
          {count} {count === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* Summary + Distribution */}
      {count > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr',
          gap: 28,
          background: 'linear-gradient(135deg, #fefce8 0%, #fff7ed 100%)',
          border: '1px solid #fde68a',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 28,
          alignItems: 'center',
        }}>
          {/* Big average */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#92400e', lineHeight: 1 }}>{average.toFixed(1)}</div>
            <StarRating value={average} size={20} style={{ justifyContent: 'center', marginTop: 6 }} />
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 4 }}>out of 5</div>
          </div>
          {/* Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dist.map(d => (
              <DistributionBar key={d.label} label={d.label} count={d.count} total={count} />
            ))}
          </div>
        </div>
      )}

      {/* Write a review — only enrolled students who haven't reviewed yet */}
      {canReview && (
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #bae6fd',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 28,
        }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0369a1' }}>
            Write a Review
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#0284c7' }}>Share your experience with {targetLabel}</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Star selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', minWidth: 60 }}>Your rating</span>
              <StarRating value={rating} onChange={setRating} size={28} />
              {rating > 0 && (
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </span>
              )}
            </div>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`What did you think about ${targetLabel}? Share your honest experience…`}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid #bae6fd',
                fontSize: 14,
                color: '#1e293b',
                background: '#fff',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#0284c7'}
              onBlur={e => e.target.style.borderColor = '#bae6fd'}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting || !rating}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: rating ? 'linear-gradient(135deg, #0369a1, #0284c7)' : '#e2e8f0',
                  color: rating ? '#fff' : '#94a3b8',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: rating ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Show a note if student but already reviewed */}
      {isStudent && isEnrolled && hasReviewed && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 12,
          padding: '12px 16px',
          fontSize: 13,
          color: '#166534',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          You've already reviewed {targetLabel}. Your review is shown below.
        </div>
      )}

      {/* Login prompt */}
      {!user && (
        <div style={{
          background: '#fafafa',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '14px 18px',
          fontSize: 13,
          color: '#64748b',
          marginBottom: 20,
          textAlign: 'center',
        }}>
          <a href="/login" style={{ color: '#6366f1', fontWeight: 600 }}>Log in</a> and enroll to leave a review.
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: '#fafafa', borderRadius: 14,
          border: '1px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⭐</div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>No reviews yet. Be the first to review {targetLabel}!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onDelete={handleDelete}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </section>
  );
}
