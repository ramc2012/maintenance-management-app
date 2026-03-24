import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Badge, Button, Modal, Input, message, Tooltip } from 'antd';
import { MessageSquare, Eye, Heart, ThumbsUp, Star, Pin, Send, RefreshCw } from 'lucide-react';
import axios from 'axios';

const REACTIONS = [
  { type: 'LIKE', icon: <ThumbsUp className="w-4 h-4" />, label: 'Like' },
  { type: 'LOVE', icon: <Heart className="w-4 h-4" />, label: 'Love' },
  { type: 'HELPFUL', icon: <Star className="w-4 h-4" />, label: 'Helpful' },
];

export const DiscussionForum: React.FC = () => {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscussion, setSelectedDiscussion] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDiscussions = useCallback(async () => {
    try {
      const res = await axios.get('/api/collaboration/discussions');
      setDiscussions(res.data || []);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscussions();

    const interval = setInterval(fetchDiscussions, 15000);
    const sync = () => fetchDiscussions();
    window.addEventListener('focus', sync);
    window.addEventListener('collaboration:update', sync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', sync);
      window.removeEventListener('collaboration:update', sync);
    };
  }, [fetchDiscussions]);

  const openDiscussion = async (id: string) => {
    try {
      const res = await axios.get(`/api/collaboration/discussions/${id}`);
      setSelectedDiscussion(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const addReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await axios.post('/api/collaboration/discussions/reply', {
        discussionId: selectedDiscussion.id,
        content: replyContent,
        authorId: 'current-user',
        authorName: 'Current User'
      });
      setReplyContent('');
      openDiscussion(selectedDiscussion.id);
      fetchDiscussions();
      window.dispatchEvent(new Event('collaboration:update'));
      message.success('Reply added');
    } catch (error) {
      message.error('Failed to add reply');
    }
  };

  const react = async (discussionId: string, reactionType: string) => {
    try {
      await axios.post('/api/collaboration/discussions/react', {
        discussionId,
        userId: 'current-user',
        reactionType
      });
      fetchDiscussions();
      if (selectedDiscussion) openDiscussion(selectedDiscussion.id);
      window.dispatchEvent(new Event('collaboration:update'));
    } catch (error) {
      message.error('Failed to react');
    }
  };

  const columns = [
    {
      title: 'Discussion',
      dataIndex: 'title',
      render: (t: string, r: any) => (
        <div>
          <div className="flex items-center gap-2">
            {r.isPinned && <Pin className="w-3 h-3 text-blue-400" />}
            <span className="text-white font-semibold cursor-pointer hover:text-blue-400" onClick={() => openDiscussion(r.id)}>{t}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">by {r.authorName} • {new Date(r.createdAt).toLocaleDateString()}</div>
        </div>
      )
    },
    { title: 'Category', dataIndex: 'category', render: (c: string) => c && <Tag color="blue">{c}</Tag> },
    { title: 'Replies', render: (_: any, r: any) => <Badge count={r._count?.replies || 0} showZero color="#374151" /> },
    { title: 'Views', dataIndex: 'viewCount', render: (v: number) => <span className="text-gray-400"><Eye className="w-3 h-3 inline mr-1" />{v}</span> },
    { title: 'Reactions', render: (_: any, r: any) => <span className="text-gray-400"><Heart className="w-3 h-3 inline mr-1" />{r._count?.reactions || 0}</span> }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5" />Discussion Forum</h2>
          <p className="text-gray-400 text-sm">Collaborate with live auto-refresh every 15 seconds</p>
          <p className="text-xs text-gray-500 mt-1">Last refreshed: {lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Not yet synced'}</p>
        </div>
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchDiscussions}>Refresh now</Button>
      </div>

      <Table
        dataSource={discussions}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({ onClick: () => openDiscussion(record.id) })}
      />

      <Modal open={!!selectedDiscussion} onCancel={() => setSelectedDiscussion(null)} title={<span className="text-white">{selectedDiscussion?.title}</span>} footer={null} width={700}>
        {selectedDiscussion && (
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-white whitespace-pre-wrap">{selectedDiscussion.content}</div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500">by {selectedDiscussion.authorName} • {new Date(selectedDiscussion.createdAt).toLocaleDateString()}</div>
                <div className="flex gap-2">
                  {REACTIONS.map(r => (
                    <Tooltip key={r.type} title={r.label}>
                      <Button type="text" size="small" icon={r.icon} onClick={() => react(selectedDiscussion.id, r.type)}>
                        {selectedDiscussion.reactions?.filter((x: any) => x.reactionType === r.type).length || 0}
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-400">Replies ({selectedDiscussion.replies?.length || 0})</div>
              {selectedDiscussion.replies?.map((reply: any) => (
                <div key={reply.id} className="bg-gray-800/50 p-3 rounded-lg ml-4">
                  <div className="text-white text-sm">{reply.content}</div>
                  <div className="text-xs text-gray-500 mt-1">by {reply.authorName} • {new Date(reply.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input.TextArea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write a reply..." rows={2} />
              <Button type="primary" icon={<Send className="w-4 h-4" />} onClick={addReply}>Reply</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DiscussionForum;
