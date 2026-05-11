'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { MessageSquare, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommentData {
  id: number;
  market_address: string;
  user_address: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  updated_at: string;
  replies?: CommentData[];
}

interface CommentsResponse {
  comments: CommentData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function getAvatarFallback(addr: string): string {
  // Take first two non-hex characters or just the first two chars after 0x
  return (addr.slice(2, 4) || '??').toUpperCase();
}

// ---------------------------------------------------------------------------
// Single Comment Component
// ---------------------------------------------------------------------------

function CommentItem({
  comment,
  userAddress,
  onReply,
  onDelete,
  depth = 0,
}: {
  comment: CommentData;
  userAddress?: string;
  onReply: (parentId: number) => void;
  onDelete: (id: number) => void;
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const isOwner = userAddress?.toLowerCase() === comment.user_address.toLowerCase();
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-4 border-l border-border/40' : ''}`}>
      <div className="flex gap-3 py-3">
        {/* Avatar */}
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {getAvatarFallback(comment.user_address)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {formatAddress(comment.user_address)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {timeAgo(comment.created_at)}
            </span>
            {isOwner && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                you
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground/90 mt-1 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Reply
            </button>
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {hasReplies && (
        <div>
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-1 ml-2"
          >
            {showReplies ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div className="space-y-0">
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  userAddress={userAddress}
                  onReply={onReply}
                  onDelete={onDelete}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments Section Component
// ---------------------------------------------------------------------------

interface CommentsSectionProps {
  marketAddress: string;
}

export default function CommentsSection({ marketAddress }: CommentsSectionProps) {
  const { address, isConnected } = useAccount();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [total, setTotal] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchComments = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/markets/by-address/${marketAddress}/comments?page=${pageNum}&limit=20`);
      if (res.ok) {
        const data: CommentsResponse = await res.json();
        setComments(data.comments);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [marketAddress]);

  useEffect(() => {
    if (marketAddress) fetchComments(page);
  }, [marketAddress, page, fetchComments]);

  const handleSubmit = async () => {
    if (!address || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/markets/by-address/${marketAddress}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_address: address,
          content: newComment.trim(),
          parent_id: replyTo,
        }),
      });
      if (res.ok) {
        setNewComment('');
        setReplyTo(null);
        fetchComments(1);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!address) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_address: address }),
      });
      if (res.ok) {
        fetchComments(page);
      }
    } catch {
      // silent
    }
  };

  const handleReply = (parentId: number) => {
    setReplyTo(parentId);
    // Scroll to input
    document.getElementById('comment-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Discussions</span>
        {total > 0 && (
          <Badge variant="secondary" className="text-xs">
            {total}
          </Badge>
        )}
      </div>

      <Separator />

      {/* New Comment Form */}
      <div className="space-y-2" id="comment-input">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Replying to comment #{replyTo}</span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-primary hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
        <Textarea
          placeholder={isConnected ? 'Share your thoughts...' : 'Connect wallet to comment'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={!isConnected || submitting}
          className="min-h-[80px] text-sm resize-none bg-background/60"
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {newComment.length}/2000
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isConnected || !newComment.trim() || submitting}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted/30" />
              <div className="flex-1 space-y-2">
                <div className="w-24 h-3 bg-muted/30 rounded" />
                <div className="w-full h-12 bg-muted/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No discussions yet. Be the first to comment!
          </p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-border/30">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              userAddress={address}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
