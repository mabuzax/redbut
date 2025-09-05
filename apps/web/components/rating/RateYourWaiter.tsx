import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

// Define interfaces for data structures
interface RatingCategoryProps {
  label: string;
  prompt: string;
  value: number;
  onChange: (value: number) => void;
}

interface RateYourWaiterProps {
  userId: string;
  token: string;
  waiterId: string; // Assuming a fixed waiter for now, or passed as prop
  onRatingSubmitted?: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper component for star rating
const StarRating: React.FC<RatingCategoryProps> = ({ label, prompt, value, onChange }) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{label}</h3>
      <p className="text-sm text-gray-600 mb-3">{prompt}</p>
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-8 w-8 cursor-pointer transition-colors ${
              i < value ? 'text-yellow-500' : 'text-gray-300'
            }`}
            fill="currentColor"
            onClick={() => onChange(i + 1)}
          />
        ))}
      </div>
    </div>
  );
};

interface RateYourWaiterProps {
  userId: string;
  token: string;
  waiterId: string; // Assuming a fixed waiter for now, or passed as prop
  onRatingSubmitted?: () => void;
}

const RateYourWaiter: React.FC<RateYourWaiterProps> = ({ userId, token, waiterId, onRatingSubmitted }) => {
  const [friendliness, setFriendliness] = useState(0);
  const [orderAccuracy, setOrderAccuracy] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [attentiveness, setAttentiveness] = useState(0);
  const [knowledge, setKnowledge] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    // Basic validation
    if ([friendliness, orderAccuracy, speed, attentiveness, knowledge].every(rating => rating === 0)) {
      setSubmitError('Please provide a rating for all categories.');
      setIsSubmitting(false);
      return;
    }

    try {

      const data = JSON.stringify({
          userId,
          waiterId,
          friendliness: friendliness || 1,
          orderAccuracy: orderAccuracy || 1,
          speed: speed || 1,
          attentiveness: attentiveness || 1,
          knowledge: knowledge || 1,
          comment: comment.trim() === '' ? null : comment.trim(),
        })

        console.log('Submitting rating data:', data);
      const response = await api.post('/api/v1/waiter/ratings', JSON.parse(data));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit rating.');
      }

      setSubmitSuccess(true);
      if (onRatingSubmitted) {
        onRatingSubmitted();
      }

    } catch (err: any) {
      setSubmitError(err.message || 'An unknown error occurred.');
      console.error('Rating submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Add a useEffect to monitor submitSuccess state
  useEffect(() => {
    if (submitSuccess) {
      console.log('Rating submitted successfully');
    }
  }, [submitSuccess]);

  // Remove the duplicate useEffect and log statements

  if (submitSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full p-4 text-center"
      >
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-700">Your feedback has been submitted successfully.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto my-8"
    >
      <h2 className="text-2xl font-bold text-primary-700 mb-6 text-center">Rate Your Waiter</h2>
      <form onSubmit={handleSubmit}>
        <StarRating
          label="Friendliness & Professional Courtesy"
          prompt="How friendly and welcoming was your server?"
          value={friendliness}
          onChange={setFriendliness}
        />
        <StarRating
          label="Order Accuracy & Menu Knowledge"
          prompt="How accurately did the waiter take and deliver your order?"
          value={orderAccuracy}
          onChange={setOrderAccuracy}
        />
        <StarRating
          label="Speed & Responsiveness"
          prompt="Rate the promptness of service from ordering to first bite."
          value={speed}
          onChange={setSpeed}
        />
        <StarRating
          label="Attentiveness & Proactivity"
          prompt="How attentive was your server to refills and additional requests?"
          value={attentiveness}
          onChange={setAttentiveness}
        />
        <StarRating
          label="Product Knowledge & Recommendations"
          prompt="How knowledgeable was the waiter about the menu and specials?"
          value={knowledge}
          onChange={setKnowledge}
        />

        <div className="mb-6">
          <label htmlFor="comment" className="block text-gray-700 text-sm font-bold mb-2">
            What stood out for you?
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="In your own words, what was Good and/or Bad."
            rows={4}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline resize-none"
          />
        </div>

        {submitError && (
          <p className="text-red-500 text-center mb-4">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
          }`}
        >
          {isSubmitting ? (
            <Loader2 className="inline-block w-5 h-5 animate-spin mr-2" />
          ) : (
            <Star className="inline-block w-5 h-5 mr-2" />
          )}
          <span>{isSubmitting ? 'Submitting...' : 'Submit Rating'}</span>
        </button>
      </form>
    </motion.div>
  );
};

export default RateYourWaiter;
