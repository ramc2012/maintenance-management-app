import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
  notification,
} from "antd";
import {
  Briefcase,
  Building2,
  CheckCircle,
  ClipboardList,
  Key,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  User,
  UserCog,
} from "lucide-react";
import { Layout } from "../../core/components/Layout";
import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/runtime";

const API = API_BASE_URL;
const { Option } = Select;

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin", adminOnly: true },
  { value: "HOD", label: "HOD", adminOnly: true },
  { value: "ENGINEER", label: "Engineer" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "TECHNICIAN", label: "Technician" },
  { value: "USER", label: "User" },
  { value: "VIEWER", label: "Viewer" },
  { value: "PROCUREMENT_OFFICER", label: "Procurement Officer" },
  { value: "L1", label: "Procurement L1" },
  { value: "L2", label: "Procurement L2" },
  { value: "L3", label: "Procurement L3" },
  { value: "L4", label: "Procurement L4" },
  { value: "CONTRACTOR_COORDINATOR", label: "Contractor Coordinator" },
  { value: "CONTRACTOR_TECHNICIAN", label: "Contractor Technician" },
];

const MANAGER_ELIGIBLE_ROLES = new Set([
  "ADMIN",
  "HOD",
  "ENGINEER",
  "SUPERVISOR",
  "CONTRACTOR_COORDINATOR",
]);

interface DepartmentOption {
  id: string;
  name: string;
}

interface ManagerSummary {
  id: string;
  username: string;
  role: string;
  jobTitle?: string | null;
}

interface UserData {
  id: string;
  username: string;
  role: string;
  phone?: string | null;
  jobTitle?: string | null;
  departmentId?: string | null;
  department?: DepartmentOption | null;
  managerId?: string | null;
  manager?: ManagerSummary | null;
  createdAt: string;
  lastLogin?: string | null;
  canCreateWorkOrder: boolean;
  canCloseWorkOrder: boolean;
}

interface OrgHierarchyResponse {
  departments?: DepartmentOption[];
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const selectedDepartmentId = Form.useWatch("departmentId", form);
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

  const canManageUsers = currentUser?.role === "ADMIN" || currentUser?.role === "HOD";
  const canModifyPrivilegedUsers = currentUser?.role === "ADMIN";
  const canEditUser = (record: UserData) =>
    canManageUsers && (canModifyPrivilegedUsers || !["ADMIN", "HOD"].includes(record.role));

  const visibleRoleOptions = ROLE_OPTIONS.filter((role) => !role.adminOnly || currentUser?.role === "ADMIN");

  const managerOptions = useMemo(
    () =>
      users
        .filter((candidate) => MANAGER_ELIGIBLE_ROLES.has(candidate.role))
        .sort((left, right) => left.username.localeCompare(right.username)),
    [users],
  );

  const scopedManagerOptions = useMemo(() => {
    if (!selectedDepartmentId) {
      return managerOptions;
    }
    return managerOptions.filter(
      (candidate) => candidate.departmentId === selectedDepartmentId || !candidate.departmentId,
    );
  }, [managerOptions, selectedDepartmentId]);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchBootstrap();
  }, [token]);

  const fetchBootstrap = async () => {
    let usersLoaded = false;
    let departmentsLoaded = false;
    try {
      setLoading(true);
      const [usersRes, orgRes] = await Promise.allSettled([
        fetch(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/org/hierarchy`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (usersRes.status === "fulfilled") {
        if (usersRes.value.ok) {
          const userData = (await usersRes.value.json()) as UserData[];
          setUsers(userData);
          usersLoaded = true;
        } else {
          setUsers([]);
        }
      } else {
        setUsers([]);
      }

      if (orgRes.status === "fulfilled" && orgRes.value.ok) {
        const orgData = (await orgRes.value.json()) as OrgHierarchyResponse;
        setDepartments(orgData.departments || []);
        departmentsLoaded = true;
      } else {
        setDepartments([]);
      }
    } catch (error: any) {
      notification.error({ message: error?.message || "Failed to load user management data" });
    } finally {
      if (!usersLoaded) {
        notification.error({ message: "Failed to fetch users" });
      }
      if (!departmentsLoaded) {
        notification.error({ message: "Failed to fetch departments" });
      }
      setLoading(false);
    }
  };

  const handleCreateUser = async (values: Record<string, unknown>) => {
    if (!canManageUsers) {
      notification.error({ message: "Your role can view users but cannot create them" });
      return;
    }
    try {
      const payload = {
        ...values,
        username: String(values.username || "").trim(),
        password: String(values.password || ""),
        phone: values.phone ? String(values.phone).trim() : undefined,
        jobTitle: values.jobTitle ? String(values.jobTitle).trim() : undefined,
      };

      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notification.error({ message: err.message || "Failed to create user" });
        return;
      }

      notification.success({ message: "User created successfully" });
      setShowModal(false);
      form.resetFields();
      fetchBootstrap();
    } catch {
      notification.error({ message: "Failed to create user" });
    }
  };

  const handleResetPassword = async (values: { newPassword: string }) => {
    if (!selectedUser) return;
    if (!canEditUser(selectedUser)) {
      notification.error({ message: "Your role can view this user but cannot edit it" });
      return;
    }
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
        const err = await res.json().catch(() => ({}));
        notification.error({ message: err.message || "Failed to reset password" });
      }
    } catch {
      notification.error({ message: "Failed to reset password" });
    }
  };

  const handleDeleteUser = async (id: string) => {
    const target = users.find((user) => user.id === id);
    if (!target || !canEditUser(target)) {
      notification.error({ message: "Your role can view this user but cannot delete it" });
      return;
    }
    try {
      const res = await fetch(`${API}/auth/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        notification.success({ message: "User deleted successfully" });
        fetchBootstrap();
      } else {
        const err = await res.json().catch(() => ({}));
        notification.error({ message: err.message || "Failed to delete user" });
      }
    } catch {
      notification.error({ message: "Failed to delete user" });
    }
  };

  const handleTogglePermission = async (
    userId: string,
    field: "canCreateWorkOrder" | "canCloseWorkOrder",
    value: boolean,
  ) => {
    const target = users.find((user) => user.id === userId);
    if (!target || !canEditUser(target)) {
      notification.error({ message: "Your role can view this user but cannot edit permissions" });
      return;
    }
    try {
      const res = await fetch(`${API}/auth/users/${userId}/permissions`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u)));
      } else {
        const err = await res.json().catch(() => ({}));
        notification.error({ message: err.message || "Failed to update permission" });
      }
    } catch {
      notification.error({ message: "Error updating permission" });
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchText.trim().toLowerCase();
    const matchesSearch =
      !query ||
      user.username.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      String(user.jobTitle || "").toLowerCase().includes(query) ||
      String(user.department?.name || "").toLowerCase().includes(query) ||
      String(user.manager?.username || "").toLowerCase().includes(query);

    const matchesDepartment = !departmentFilter || user.departmentId === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const getRoleTag = (role: string) => {
    if (role === "ADMIN") return { color: "red", icon: <ShieldAlert className="w-3 h-3 mr-1" /> };
    if (role === "HOD" || role === "ENGINEER" || role === "SUPERVISOR") {
      return { color: "blue", icon: <UserCog className="w-3 h-3 mr-1" /> };
    }
    if (role.includes("CONTRACTOR")) return { color: "purple", icon: <Briefcase className="w-3 h-3 mr-1" /> };
    return { color: "green", icon: <CheckCircle className="w-3 h-3 mr-1" /> };
  };

  const columns = [
    {
      title: "User",
      key: "user",
      render: (_: unknown, record: UserData) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-blue-400">{record.username}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{record.jobTitle || "No title assigned"}</div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 160,
      render: (role: string) => {
        const tag = getRoleTag(role);
        return (
          <Tag color={tag.color} className="flex items-center w-fit">
            {tag.icon}
            {role}
          </Tag>
        );
      },
    },
    {
      title: "Department",
      key: "department",
      render: (_: unknown, record: UserData) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{record.department?.name || "Unassigned"}</span>
      ),
    },
    {
      title: "Manager",
      key: "manager",
      render: (_: unknown, record: UserData) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-gray-200">{record.manager?.username || "Unassigned"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{record.manager?.role || ""}</div>
        </div>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_: unknown, record: UserData) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {record.phone ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {record.phone}
            </span>
          ) : (
            "Not set"
          )}
        </div>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (createdAt: string) => new Date(createdAt).toLocaleDateString("en-IN"),
    },
    {
      title: (
        <Tooltip title="Can create new Work Orders">
          <span className="flex items-center gap-1 cursor-help">
            <ClipboardList className="w-3 h-3" />
            Create WO
          </span>
        </Tooltip>
      ),
      dataIndex: "canCreateWorkOrder",
      key: "canCreateWorkOrder",
      width: 120,
      render: (value: boolean, record: UserData) => (
        <Switch
          size="small"
          checked={value}
          disabled={!canEditUser(record)}
          onChange={(checked) => handleTogglePermission(record.id, "canCreateWorkOrder", checked)}
        />
      ),
    },
    {
      title: (
        <Tooltip title="Can close / complete Work Orders">
          <span className="flex items-center gap-1 cursor-help">
            <ClipboardList className="w-3 h-3" />
            Close WO
          </span>
        </Tooltip>
      ),
      dataIndex: "canCloseWorkOrder",
      key: "canCloseWorkOrder",
      width: 120,
      render: (value: boolean, record: UserData) => (
        <Switch
          size="small"
          checked={value}
          disabled={!canEditUser(record)}
          onChange={(checked) => handleTogglePermission(record.id, "canCloseWorkOrder", checked)}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      render: (_: unknown, record: UserData) => (
        <div className="flex gap-2">
          <Tooltip title={canEditUser(record) ? "Reset Password" : "View only for your role"}>
            <Button
              size="small"
              icon={<Key className="w-3 h-3" />}
              disabled={!canEditUser(record)}
              onClick={() => {
                setSelectedUser(record);
                setShowResetModal(true);
              }}
            />
          </Tooltip>
          {record.id !== currentUser?.id && canEditUser(record) && (
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create users with department ownership, reporting managers, and work-order permissions.
          </p>
        </div>
        {canManageUsers ? (
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              form.setFieldsValue({
                role: "TECHNICIAN",
                canCreateWorkOrder: false,
                canCloseWorkOrder: false,
              });
              setShowModal(true);
            }}
          >
            Create User
          </Button>
        ) : null}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            placeholder="Search by username, title, department or manager…"
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Filter by department"
            value={departmentFilter || undefined}
            onChange={(value) => setDepartmentFilter(value || "")}
          >
            {departments.map((department) => (
              <Option key={department.id} value={department.id}>
                {department.name}
              </Option>
            ))}
          </Select>
        </div>
      </div>

      <Table
        dataSource={filteredUsers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
        scroll={{ x: 1200 }}
        footer={() => (
          <div className="text-right font-bold text-gray-700 dark:text-gray-300">
            Total Users: {filteredUsers.length}
          </div>
        )}
      />

      <Modal
        title="Create New User"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          onFinish={handleCreateUser}
          layout="vertical"
          initialValues={{
            role: "TECHNICIAN",
            canCreateWorkOrder: false,
            canCloseWorkOrder: false,
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true }, { min: 6, message: "Use at least 6 characters" }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select>
                {visibleRoleOptions.map((role) => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="departmentId" label="Department">
              <Select allowClear showSearch optionFilterProp="children" placeholder="Select department">
                {departments.map((department) => (
                  <Option key={department.id} value={department.id}>
                    {department.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="managerId" label="Reporting Manager">
              <Select allowClear showSearch optionFilterProp="children" placeholder="Select reporting manager">
                {scopedManagerOptions.map((manager) => (
                  <Option key={manager.id} value={manager.id}>
                    {manager.username} ({manager.role}
                    {manager.department?.name ? ` • ${manager.department.name}` : ""})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="jobTitle" label="Job Title">
              <Input placeholder="e.g. Field Technician" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Contact number" />
            </Form.Item>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 mb-4">
            Department and reporting manager are used to map field users into the right Mechanical, Electrical, or
            Instrumentation workspace automatically.
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-5">
            <Form.Item name="canCreateWorkOrder" label="Allow work-order creation" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="canCloseWorkOrder" label="Allow work-order closure" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Button type="primary" htmlType="submit" block>
            Create User
          </Button>
        </Form>
      </Modal>

      <Modal
        title={`Reset Password — ${selectedUser?.username}`}
        open={showResetModal}
        onCancel={() => {
          setShowResetModal(false);
          setSelectedUser(null);
        }}
        footer={null}
      >
        <Form form={resetForm} onFinish={handleResetPassword} layout="vertical">
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[{ required: true }, { min: 6, message: "Use at least 6 characters" }]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Update Password
          </Button>
        </Form>
      </Modal>
    </Layout>
  );
};
