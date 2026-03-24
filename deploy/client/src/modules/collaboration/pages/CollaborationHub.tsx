import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { Home, MessageSquare, Lightbulb, Users } from 'lucide-react';
import { DiscussionForum } from '../components/DiscussionForum';
import { FeedbackBoard } from '../components/FeedbackBoard';
import { NewDiscussion } from '../components/NewDiscussion';
import { NewFeedback } from '../components/NewFeedback';

const { Content, Sider } = Layout;

const menuItems = [
  { key: 'discussions', icon: <MessageSquare className="w-4 h-4" />, label: 'Discussions' },
  { key: 'feedback', icon: <Lightbulb className="w-4 h-4" />, label: 'Feedback & Ideas' },
  { key: 'new-discussion', icon: <MessageSquare className="w-4 h-4" />, label: 'New Discussion' },
  { key: 'new-feedback', icon: <Lightbulb className="w-4 h-4" />, label: 'Submit Idea' },
];

interface CollaborationHubProps {
  defaultTab?: 'discussions' | 'feedback' | 'new-discussion' | 'new-feedback';
}

export const CollaborationHub: React.FC<CollaborationHubProps> = ({ defaultTab = 'discussions' }) => {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState(defaultTab);

  useEffect(() => {
    setActiveKey(defaultTab);
  }, [defaultTab]);

  const renderContent = () => {
    switch (activeKey) {
      case 'discussions': return <DiscussionForum />;
      case 'feedback': return <FeedbackBoard />;
      case 'new-discussion': return <NewDiscussion onSuccess={() => setActiveKey('discussions')} />;
      case 'new-feedback': return <NewFeedback onSuccess={() => setActiveKey('feedback')} />;
      default: return <DiscussionForum />;
    }
  };

  return (
    <Layout className="min-h-screen bg-gray-900">
      <Sider width={220} className="bg-gray-900 border-r border-gray-800" theme="dark">
        <div className="p-4 border-b border-gray-800">
          <Button type="primary" icon={<Home className="w-4 h-4" />} onClick={() => navigate('/')} className="w-full mb-4" ghost>
            Maintenance Hub
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">Collaboration</h1>
              <p className="text-xs text-gray-400">Discuss, vote, and share ideas</p>
            </div>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          onClick={({ key }) => setActiveKey(key as typeof activeKey)}
          className="bg-transparent border-none mt-2"
          theme="dark"
          items={menuItems}
        />
      </Sider>

      <Content className="bg-gray-950 p-6">
        {renderContent()}
      </Content>
    </Layout>
  );
};

export default CollaborationHub;
