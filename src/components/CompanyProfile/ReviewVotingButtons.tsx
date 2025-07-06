import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Flag, Share2 } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ReportModal from './ReportModal';

interface ReviewVotingButtonsProps {
  reviewId: string;
  reviewUserId: string;
  contentType?: 'review' | 'reply';
  replyId?: string;
}

interface Vote {
  id?: string;
  userId: string;
  reviewId: string;
  helpful: boolean;
  createdAt: Date;
}

const ReviewVotingButtons: React.FC<ReviewVotingButtonsProps> = ({ 
  reviewId,
  reviewUserId, 
  contentType = 'review',
  replyId
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [notHelpfulCount, setNotHelpfulCount] = useState(0);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [loading, setLoading] = useState(false);
  const [votesLoading, setVotesLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  // Check if user can vote (not admin, not company, not own review)
  const canVote = currentUser && 
                 currentUser.role === 'user' && 
                 currentUser.uid !== reviewUserId;
                
  // Check if user can report (any logged in user except admin and not own content)
  const canReport = currentUser && 
                  currentUser.uid !== reviewUserId &&
                  currentUser.role !== 'admin';

  // Load votes for this review
  useEffect(() => {
    const loadVotes = async () => {
      if (!reviewId) return;
      
      try {
        setVotesLoading(true);
        
        // Get all votes for this review
        const votesQuery = query(
          collection(db, 'reviewVotes'),
          where('reviewId', '==', reviewId)
        );
        
        const votesSnapshot = await getDocs(votesQuery);
        const votes = votesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vote[];
        
        // Count helpful and not helpful votes
        const helpful = votes.filter(vote => vote.helpful).length;
        const notHelpful = votes.filter(vote => !vote.helpful).length;
        
        setHelpfulCount(helpful);
        setNotHelpfulCount(notHelpful);
        
        // Find user's vote if they're logged in
        if (currentUser) {
          const userVoteDoc = votes.find(vote => vote.userId === currentUser.uid);
          if (userVoteDoc) {
            setUserVote(userVoteDoc);
          }
        }
      } catch (error) {
        console.error('Error loading review votes:', error);
      } finally {
        setVotesLoading(false);
      }
    };
    
    loadVotes();
  }, [reviewId, currentUser]);

  // Handle voting
  const handleVote = async (helpful: boolean) => {
    if (!currentUser || !canVote) return;
    
    try {
      setLoading(true);
      
      // If user already voted
      if (userVote) {
        // If clicking the same button, remove the vote
        if (userVote.helpful === helpful) {
          // Delete vote document
          if (userVote.id) {
            await deleteDoc(doc(db, 'reviewVotes', userVote.id));
          }
          
          // Update local state
          setUserVote(null);
          if (helpful) {
            setHelpfulCount(prev => Math.max(0, prev - 1));
          } else {
            setNotHelpfulCount(prev => Math.max(0, prev - 1));
          }
        } else {
          // If clicking the other button, change the vote
          if (userVote.id) {
            // Update vote document
            await updateDoc(doc(db, 'reviewVotes', userVote.id), {
              helpful: helpful
            });
          }
          
          // Update local state
          setUserVote({ ...userVote, helpful });
          if (helpful) {
            setHelpfulCount(prev => prev + 1);
            setNotHelpfulCount(prev => Math.max(0, prev - 1));
          } else {
            setHelpfulCount(prev => Math.max(0, prev - 1));
            setNotHelpfulCount(prev => prev + 1);
          }
        }
      } else {
        // Create new vote
        const newVote: Omit<Vote, 'id'> = {
          userId: currentUser.uid,
          reviewId,
          helpful,
          createdAt: new Date()
        };
        
        // Add to Firestore
        const voteRef = doc(collection(db, 'reviewVotes'));
        await setDoc(voteRef, newVote);
        
        // Update local state
        setUserVote({ ...newVote, id: voteRef.id });
        if (helpful) {
          setHelpfulCount(prev => prev + 1);
        } else {
          setNotHelpfulCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error voting on review:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
      
      {/* Helpful Button */}
      <button
        onClick={() => handleVote(true)}
        disabled={!canVote || loading || votesLoading}
        className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg text-sm ${
          userVote?.helpful === true 
            ? 'bg-green-100 text-green-700' 
            : 'text-gray-600 hover:bg-gray-100'
        } transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed`}
        title={canVote ? (translations?.markAsHelpful || 'Mark as helpful') : (translations?.cannotVote || 'You cannot vote')}
      >
        <ThumbsUp className={`h-4 w-4 ${userVote?.helpful === true ? 'fill-current' : ''}`} />
        <span>
          {translations?.helpful || 'Helpful'} 
          {helpfulCount > 0 && ` (${helpfulCount})`}
        </span>
      </button>

      {/* Not Helpful Button */}
      <button
        onClick={() => handleVote(false)}
        disabled={!canVote || loading || votesLoading}
        className={`flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg text-sm ${
          userVote?.helpful === false 
            ? 'bg-red-100 text-red-700' 
            : 'text-gray-600 hover:bg-gray-100'
        } transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed`}
        title={canVote ? (translations?.markAsNotHelpful || 'Mark as not helpful') : (translations?.cannotVote || 'You cannot vote')}
      >
        <ThumbsDown className={`h-4 w-4 ${userVote?.helpful === false ? 'fill-current' : ''}`} />
        <span>
          {translations?.notHelpful || 'Not Helpful'}
          {notHelpfulCount > 0 && ` (${notHelpfulCount})`}
        </span>
      </button>
      
      {/* Report Button */}
      {canReport && (
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors duration-200"
          title={translations?.reportContent || 'Report content'}
        >
          <Flag className="h-4 w-4" />
          <span>{translations?.report || 'Report'}</span>
        </button>
      )}
      
      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          contentId={contentType === 'review' ? reviewId : replyId || ''}
          contentType={contentType}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default ReviewVotingButtons;