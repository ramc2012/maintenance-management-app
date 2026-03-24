import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Button, Modal, Input, message } from 'antd';
import { Lightbulb, MessageCircle, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import axios from 'axios';

export const FeedbackBoard: React.FC = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [commentContent, setCommentContent] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await axios.get('/api/collaboration/feedback');
      setFeedback(res.data || []);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();

    const interval = setInterval(fetchFeedback, 15000);
    const sync = () => fetchFeedback();
    window.addEventListener('focus', sync);
    window.addEventListener('collaboration:update', sync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', sync);
      window.removeEventListener('collaboration:update', sync);
    };
  }, [fetchFeedback]);

  const openFeedback = async (id: string) => {
    try {
      const res = await axios.get(`/api/collaboration/feedback/${id}`);
      setSelectedFeedback(res.data);
    } catch (error) { console.error('Error:', error); }
  };

  const vote = async (feedbackId: string, voteType: string) => {
    try {
      await axios.post('/api/collaboration/feedback/vote', { feedbackId, userId: 'current-user', voteType });
      fetchFeedback();
      if (selectedFeedback) openFeedback(selectedFeedback.id);
      window.dispatchEvent(new Event('collaboration:update'));
    } catch (error) { message.error('Failed to vote'); }
  };

  const addComment = async () => {
    if (!commentContent.trim()) return;
    try {
      await axios.post('/api/collaboration/feedback/comment', {
        feedbackId: selectedFeedback.id,
        content: commentContent,
        authorId: 'current-user',
        authorName: 'Current User'
      });
      setCommentContent('');
      openFeedback(selectedFeedback.id);
      fetchFeedback();
      window.dispatchEvent(new Event('collaboration:update'));
      message.success('Comment added');
    } catch (error) { message.error('Failed to add comment'); }
  };

  const columns = [
    {
      title: 'Votes',
      width: 80,
      render: (_: any, r: any) => (
        <div className="text-center">
          <Button type="text" size="small" icon={<ChevronUp className="w-4 h-4" />} onClick={(e) => { e.stopPropagation(); vote(r.id, 'UP'); }} />
          <div className="text-lg font-bold text-white">{r.upvotes - r.downvotes}</div>
          <Button type="text" size="small" icon={<ChevronDown className="w-4 h-4" />} onClick={(e) => { e.stopPropagation(); vote(r.id, 'DOWN'); }} />
        </div>
      )
    },
    {
      title: 'Idea',
      dataIndex: 'title',
      render: (t: string, r: any) => (
        <div>
          <span className="text-white font-semibold cursor-pointer hover:text-blue-400">{t}</span>
          <div className="text-xs text-gray-500 mt-1">by {r.authorName} • {new Date(r.createdAt).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      title: 'Category', dataIndex: 'category', render: (c: string) => {
        const colors: any = { FEATURE: 'blue', IMPROVEMENT: 'green', BUG: 'red', PROCESS: 'purple' };
        return <Tag color={colors[c] || 'default'}>{c}</Tag>;
      }
    },
    {
      title: 'Status', dataIndex: 'status', render: (s: string) => {
        const colors: any = { SUBMITTED: 'default', UNDER_REVIEW: 'blue', APPROVED: 'green', IMPLEMENTED: 'cyan', REJECTED: 'red' };
        return <Tag color={colors[s]}>{s.replace('_', ' ')}</Tag>;
      }
    },
    { title: 'Comments', render: (_: any, r: any) => <span className="text-gray-400"><MessageCircle className="w-3 h-3 inline mr-1" />{r._count?.comments || 0}</span> }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Lightbulb className="w-5 h-5" />Feedback & Ideas Board</h2>
          <p className="text-gray-400 text-sm">Near-real-time votes/comments with auto-refresh every 15 seconds</p>
          <p className="text-xs text-gray-500 mt-1">Last refreshed: {lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Not yet synced'}</p>
        </div>
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchFeedback}>Refresh now</Button>
      </div>

      <Table dataSource={feedback} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} onRow={(record) => ({ onClick: () => openFeedback(record.id) })} />

      <Modal open={!!selectedFeedback} onCancel={() => setSelectedFeedback(null)} title={<span className="text-white">{selectedFeedback?.title}</span>} footer={null} width={600}>
        {selectedFeedback && (
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex gap-4">
                <div className="text-center">
                  <Button type="text" icon={<ChevronUp className="w-5 h-5 text-green-400" />} onClick={() => vote(selectedFeedback.id, 'UP')} />
                  <div className="text-2xl font-bold text-white">{selectedFeedback.upvotes - selectedFeedback.downvotes}</div>
                  <Button type="text" icon={<ChevronDown className="w-5 h-5 text-red-400" />} onClick={() => vote(selectedFeedback.id, 'DOWN')} />
                </div>
                <div className="flex-1">
                  <div className="text-white whitespace-pre-wrap">{selectedFeedback.description}</div>
                  <div className="flex gap-2 mt-3">
                    <Tag>{selectedFeedback.category}</Tag>
                    <Tag>{selectedFeedback.status}</Tag>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-400">Comments ({selectedFeedback.comments?.length || 0})</div>
              {selectedFeedback.comments?.map((comment: any) => (
                <div key={comment.id} className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="text-white text-sm">{comment.content}</div>
                  <div className="text-xs text-gray-500 mt-1">by {comment.authorName} • {new Date(comment.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input.TextArea value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="Add a comment..." rows={2} />
              <Button type="primary" onClick={addComment}>Comment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeedbackBoard;
