"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { HappinessLevel, ServiceAnalysisData } from "../../types/service-analysis";

interface ReviewComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceAnalysisData) => Promise<void>;
  title: string;
  type: 'request' | 'order';
}

const happinessOptions = [
  { value: HappinessLevel.EXTREMELY_HAPPY, label: 'Extremely Happy', emoji: '😍', color: 'text-green-600' },
  { value: HappinessLevel.VERY_HAPPY, label: 'Very Happy', emoji: '😊', color: 'text-green-500' },
  { value: HappinessLevel.JUST_OK, label: 'Just Ok', emoji: '😐', color: 'text-yellow-500' },
  { value: HappinessLevel.UNHAPPY, label: 'Unhappy', emoji: '😟', color: 'text-orange-500' },
  { value: HappinessLevel.HORRIBLE, label: 'Horrible', emoji: '😡', color: 'text-red-500' },
];

const ReviewComponent = ({ isOpen, onClose, onSubmit, title, type }: ReviewComponentProps) => {
  const [happiness, setHappiness] = useState<HappinessLevel | ''>('');
  const [reason, setReason] = useState('');
  const [suggestedImprovement, setSuggestedImprovement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOption = happinessOptions.find(option => option.value === happiness);
  const isPositive = happiness === HappinessLevel.EXTREMELY_HAPPY || happiness === HappinessLevel.VERY_HAPPY;
  const isNegative = happiness === HappinessLevel.UNHAPPY || happiness === HappinessLevel.HORRIBLE;

  const getReasonPlaceholder = () => {
    if (isPositive) return "What went right? Tell us what made your experience great!";
    if (isNegative) return "What went wrong? Help us understand what happened.";
    return `Tell us about your ${type} experience...`;
  };

  const getReasonLabel = () => {
    if (isPositive) return "What went right?";
    if (isNegative) return "What went wrong?";
    return `About your ${type}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!happiness || !reason.trim() || !suggestedImprovement.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate overall sentiment based on happiness level
      let overall_sentiment = 'neutral';
      if (happiness === HappinessLevel.EXTREMELY_HAPPY || happiness === HappinessLevel.VERY_HAPPY) {
        overall_sentiment = 'positive';
      } else if (happiness === HappinessLevel.UNHAPPY || happiness === HappinessLevel.HORRIBLE) {
        overall_sentiment = 'negative';
      }

      await onSubmit({
        happiness,
        reason: reason.trim(),
        suggested_improvement: suggestedImprovement.trim(),
        overall_sentiment,
      });

      // Reset form
      setHappiness('');
      setReason('');
      setSuggestedImprovement('');
      onClose();
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setHappiness('');
    setReason('');
    setSuggestedImprovement('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-900">Share Your Feedback</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">{title}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Happiness Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How do you feel about how your {type} was handled?
              </label>
              <div className="space-y-2">
                {happinessOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      happiness === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="happiness"
                      value={option.value}
                      checked={happiness === option.value}
                      onChange={(e) => setHappiness(e.target.value as HappinessLevel)}
                      className="sr-only"
                    />
                    <span className="text-2xl">{option.emoji}</span>
                    <span className={`font-medium ${option.color}`}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reason */}
            {happiness && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="block text-sm font-medium text-gray-700">
                  {getReasonLabel()}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={getReasonPlaceholder()}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </motion.div>
            )}

            {/* Suggested Improvement */}
            {happiness && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="block text-sm font-medium text-gray-700">
                  Anything our waiter can do to {isPositive ? 'make your experience even better' : 'fix this'}?
                </label>
                <textarea
                  value={suggestedImprovement}
                  onChange={(e) => setSuggestedImprovement(e.target.value)}
                  placeholder={
                    isPositive
                      ? "How can we make your experience even more amazing?"
                      : "What would you like us to improve or do differently?"
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!happiness || !reason.trim() || !suggestedImprovement.trim() || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ReviewComponent;
