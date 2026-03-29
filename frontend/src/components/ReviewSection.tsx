import { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, Edit2, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Review {
  id: number;
  user_id: number;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

interface ReviewStats {
  avg_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

interface ReviewSectionProps {
  productId: number;
}

function StarRating({
  rating,
  size = 16,
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive ? star <= (hovered || rating) : star <= Math.round(rating);
        return (
          <Star
            key={star}
            size={size}
            className={`transition-colors ${
              filled ? 'text-yellow-400' : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            fill={filled ? 'currentColor' : 'none'}
            onClick={() => interactive && onRate?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
          />
        );
      })}
    </div>
  );
}

export default function ReviewSection({ productId }: ReviewSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    avg_rating: 0,
    total_reviews: 0,
    rating_distribution: {},
  });
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ rating: 0, title: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = useCallback(
    async (reset = false) => {
      try {
        const currentPage = reset ? 1 : page;
        const res = await reviewAPI.getProductReviews(productId, {
          sortBy: sortBy,
          page: currentPage,
          limit: 5,
        });
        const data = res.data.data;
        const reviewList = data.reviews || [];

        if (reset) {
          setReviews(reviewList);
          setPage(1);
        } else if (currentPage === 1) {
          setReviews(reviewList);
        } else {
          setReviews((prev) => [...prev, ...reviewList]);
        }

        // Backend returns stats as { average_rating, total_reviews, rating_distribution: [{rating, count}] }
        const s = data.stats || {};
        const dist: Record<string, number> = {};
        if (Array.isArray(s.rating_distribution)) {
          s.rating_distribution.forEach((d: any) => { dist[d.rating] = d.count; });
        } else if (s.rating_distribution) {
          Object.assign(dist, s.rating_distribution);
        }

        setStats({
          avg_rating: s.average_rating ?? s.avg_rating ?? 0,
          total_reviews: s.total_reviews ?? 0,
          rating_distribution: dist,
        });
        setHasMore(reviewList.length === 5);
      } catch {
        // Stats may still render with defaults
      } finally {
        setLoading(false);
      }
    },
    [productId, sortBy, page],
  );

  const fetchMyReview = useCallback(async () => {
    if (!user) return;
    try {
      const res = await reviewAPI.getMyReview(productId);
      setMyReview(res.data.data);
    } catch {
      setMyReview(null);
    }
  }, [productId, user]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchReviews(true);
    fetchMyReview();
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 1) fetchReviews();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
    fetchReviews(true);
  }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = async () => {
    await Promise.all([fetchReviews(true), fetchMyReview()]);
  };

  const handleSubmit = async () => {
    if (formData.rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setSubmitting(true);
    try {
      if (myReview) {
        await reviewAPI.update(myReview.id, formData);
        toast.success('Review updated successfully');
      } else {
        await reviewAPI.create(productId, formData);
        toast.success('Review submitted successfully');
      }
      setShowForm(false);
      setFormData({ rating: 0, title: '', comment: '' });
      await refreshAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    try {
      await reviewAPI.delete(myReview.id);
      toast.success('Review deleted');
      setMyReview(null);
      await refreshAll();
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const handleEdit = () => {
    if (!myReview) return;
    setFormData({
      rating: myReview.rating,
      title: myReview.title || '',
      comment: myReview.comment || '',
    });
    setShowForm(true);
  };

  const handleHelpful = async (reviewId: number) => {
    if (!user) {
      toast.error('Please log in to mark reviews as helpful');
      return;
    }
    try {
      await reviewAPI.markHelpful(reviewId);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r,
        ),
      );
    } catch {
      toast.error('Already marked as helpful');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDistributionPercent = (star: number) => {
    const count = Number(stats.rating_distribution[star] ?? 0);
    return stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Loading reviews...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Average Rating */}
          <div className="flex flex-col items-center justify-center min-w-[160px]">
            <span className="text-5xl font-bold text-gray-900">
              {stats.avg_rating.toFixed(1)}
            </span>
            <StarRating rating={stats.avg_rating} size={22} />
            <span className="text-sm text-gray-500 mt-1">
              {stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Distribution Bars */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = getDistributionPercent(star);
              const count = Number(stats.rating_distribution[star] ?? 0);
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {star} star
                  </span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Write Review Button */}
      {user && !myReview && !showForm && (
        <button
          onClick={() => {
            setFormData({ rating: 0, title: '', comment: '' });
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Edit2 size={16} />
          Write a Review
        </button>
      )}

      {/* My Review Actions */}
      {user && myReview && !showForm && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">You have already reviewed this product.</span>
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 animate-in fade-in duration-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {myReview ? 'Edit Your Review' : 'Write a Review'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <StarRating
              rating={formData.rating}
              size={28}
              interactive
              onRate={(r) => setFormData((prev) => ({ ...prev, rating: r }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Summarize your experience"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your thoughts about this product..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-shadow"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Send size={16} />
              {submitting ? 'Submitting...' : myReview ? 'Update Review' : 'Submit Review'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sort + Review List */}
      {stats.total_reviews > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              All Reviews ({stats.total_reviews})
            </h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-gray-900">{review.user_name}</span>
                      <StarRating rating={review.rating} size={14} />
                      {review.verified_purchase && (
                        <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <h4 className="font-semibold text-gray-900 mt-2">{review.title}</h4>
                    )}
                    {review.comment && (
                      <p className="text-gray-600 mt-1.5 leading-relaxed">{review.comment}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-gray-400">
                        {formatDate(review.created_at)}
                      </span>
                      <button
                        onClick={() => handleHelpful(review.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                      >
                        <ThumbsUp size={13} />
                        Helpful ({review.helpful_count})
                      </button>
                    </div>
                  </div>

                  {user && review.user_id === user.id && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={handleEdit}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Edit review"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={handleDelete}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Load More Reviews
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {stats.total_reviews === 0 && !showForm && (
        <div className="text-center py-10 text-gray-500">
          <Star size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-700">No reviews yet</p>
          <p className="text-sm mt-1">Be the first to review this product.</p>
        </div>
      )}
    </div>
  );
}
