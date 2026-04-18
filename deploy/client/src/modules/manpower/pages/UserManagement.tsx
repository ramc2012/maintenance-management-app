import React, { useState, useEffect } from "react";
import { Table, Button, Input, Modal, Form, Select, notification, Tag, Tooltip, Popconfirm, Switch } from "antd";
import { Plus, Search, User, Key, Trash2, ShieldAlert, CheckCircle, ClipboardList } from "lucide-react";
import { Layout } from "../../core/components/Layout";
import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/runtime";

const API = API_BASE_URL;
const { Option } = Select;

interface UserData {
  id: string;
  username: string;
  role: "ADMIN" | "USER" | "VIEWER";
  createdAt: string;
  canCreateWorkOrder: boolean;
  canCloseWorkOrder: boolean;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const { token, user: currentUser } = useAuth();

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const sidebarContent = (
    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Manpower Management
    </div>
  );

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
      else notification.error({ message: "Failed to fetch users" });
    } catch {
      notification.error({ message: "Failed to fetch users" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values: any) => {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(values),
      });
      if (res.ok) {
        notification.success({ message: "User created successfully" });
        setShowModal(false);
        form.resetFields();
        fetchUsers();
      } else {
        const err = await res.json();
        notification.error({ message: err.message || "Failed to create user" });
      }
    } catch {
      notification.error({ message: "Failed to create user" });
    }
  };

  const handleResetPassword = async (values: any) => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`${API}/auth/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ newPassword: values.newPassword }),
      });
      if (res.ok) {
        notification.success({ message: "Password reset successfully" });
        setShowResetModal(false);
        resetForm.resetFields();
        setSelectedUser(null);
      } else {
        notification.error({ message: "Failed to reset password" });
      }
    } catch {
      notification.error({ message: "Failed to reset password" });
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`${API}/auth/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        notification.success({ message: "User deleted successfully" });
        fetchUsers();
      } else {
        notification.error({ message: "Failed to delete user" });
      }
    } catch {
      notification.error({ message: "Failed to delete user" });
    }
  };

  const handleTogglePermission = async (userId: string, field: "canCreateWorkOrder" | "canCloseWorkOrder", value: boolean) => {
    try {
      const res = await fetch(`${API}/auth/users/${userId}/permissions`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
      } else {
        notification.error({ message: "Failed to update permission" });
      }
    } catch {
      notification.error({ message: "Error updating permission" });
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      render: (text: string) => <span className="font-medium text-gray-900 dark:text-blue-400">{text}</span>,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => {
        const color = role === "ADMIN" ? "red" : role === "VIEWER" ? "green" : "blue";
        const icon = role === "ADMIN" ? <ShieldAlert className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />;
        return <Tag color={color} className="flex items-center w-fit">{icon}{role}</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleDateString("en-IN"),
      width: 110,
    },
    {
      title: (
        <Tooltip title="Can create new Work Orders">
          <span className="flex items-center gap-1 cursor-help">
            <ClipboardList className="w-3 h-3" /> Create WO
          </span>
        </Tooltip>
      ),
      dataIndex: "canCreateWorkOrder",
      key: "canCreateWorkOrder",
      width: 110,
      render: (val: boolean, record: UserData) => (
        <Switch
          size="small"
          checked={val}
          disabled={record.role === "ADMIN"}
          onChange={v => handleTogglePermission(record.id, "canCreateWorkOrder", v)}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
      ),
    },
    {
      title: (
        <Tooltip title="Can close / complete Work Orders">
          <span className="flex items-center gap-1 cursor-help">
            <ClipboardList className="w-3 h-3" /> Close WO
          </span>
        </Tooltip>
      ),
      dataIndex: "canCloseWorkOrder",
      key: "canCloseWorkOrder",
      width: 110,
      render: (val: boolean, record: UserData) => (
        <Switch
          size="small"
          checked={val}
          disabled={record.role === "ADMIN"}
          onChange={v => handleTogglePermission(record.id, "canCloseWorkOrder", v)}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: UserData) => (
        <div className="flex gap-2">
          <Tooltip title="Reset Password">
            <Button
              size="small"
              icon={<Key className="w-3 h-3" />}
              onClick={() => { setSelectedUser(record); setShowResetModal(true); }}
            />
          </Tooltip>
          {record.id !== (currentUser as any)?.id && (
            <Popconfirm title="Delete this user?" onConfirm={() => handleDeleteUser(record.id)}>
              <Button danger size="small" icon={<Trash2 className="w-3 h-3" />} />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout sidebarContent={sidebarContent}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Manpower Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage system users, roles and work-order permissions</p>
        </div>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          Create User
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <Input
          placeholder="Search users…"
          prefix={<Search className="w-4 h-4 text-gray-400" />}
          className="max-w-md"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      <Table
        dataSource={filteredUsers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
        footer={() => (
          <div className="text-right font-bold text-gray-700 dark:text-gray-300">
            Total Users: {filteredUsers.length}
          </div>
        )}
      />

      {/* Create User Modal */}
      <Modal title="Create New User" open={showModal} onCancel={() => setShowModal(false)} footer={null}>
        <Form form={form} onFinish={handleCreateUser} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select>
              <Option value="ADMIN">Admin</Option>
              <Option value="USER">User</Option>
              <Option value="VIEWER">Viewer</Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Create User</Button>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password — ${selectedUser?.username}`}
        open={showResetModal}
        onCancel={() => { setShowResetModal(false); setSelectedUser(null); }}
        footer={null}
      >
        <Form form={resetForm} onFinish={handleResetPassword} layout="vertical">
          <Form.Item name="newPassword" label="New Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Update Password</Button>
        </Form>
      </Modal>
    </Layout>
  );
};
