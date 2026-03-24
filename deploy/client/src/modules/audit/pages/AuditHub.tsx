import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Card,
  Statistic,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Button,
  Row,
  Col,
  message,
  Badge,
  Progress,
  Space,
  Tooltip,
  Divider,
  Spin,
  Empty,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Eye,
  Edit3,
  Filter,
  BarChart3,
  ListChecks,
  Home,
  Trash2,
} from "lucide-react";
import axios from "axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../core/components/Layout";
import { useAuth } from "../../../context/AuthContext";


const { TextArea } = Input;
const { Option } = Select;

// ── Constants ───────────────────────────────────────────────────────────────

const AGENCY_OPTIONS = ["INTERNAL", "QHSE", "DGMS", "OISD", "OTHER"] as const;
type Agency = (typeof AGENCY_OPTIONS)[number];

const SERVICE_OPTIONS = [
  "DS",
  "Electrical",
  "Mechanical",
  "Instrumentation",
  "Production",
  "Safety",
  "Admin",
] as const;

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const SEVERITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
type Severity = (typeof SEVERITY_OPTIONS)[number];

const STATUS_COLOR: Record<Status, string> = {
  OPEN: "blue",
  IN_PROGRESS: "orange",
  CLOSED: "green",
  OVERDUE: "red",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  LOW: "cyan",
  MEDIUM: "gold",
  HIGH: "orange",
  CRITICAL: "red",
};

// ── Types ───────────────────────────────────────────────────────────────────

interface AuditAction {
  id: string;
  _id?: string;
  description: string;
  assignedTo: string;
  targetDate: string;
  status: Status;
  completedDate?: string;
  remarks?: string;
}

interface Observation {
  id: string;
  _id?: string;
  observationNo: string;
  agency: Agency;
  auditDate: string;
  installationId: string;
  installationName?: string;
  department: string;
  service: string;
  category: string;
  severity: Severity;
  observation: string;
  reference: string;
  targetDate: string;
  reportedBy: string;
  assignedTo: string;
  remarks: string;
  status: Status;
  actions: AuditAction[];
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  overdue: number;
  overdueActions: number;
  pendingByAgency: { agency: string; count: number }[];
  pendingByService: { service: string; count: number }[];
  pendingBySeverity: { severity: string; count: number }[];
}

interface Installation {
  id: string;
  installationId?: string;
  location?: string;
  name?: string;
}

interface Department {
  id: string;
  _id?: string;
  name: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export const AuditHub: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // State: active tab
  const [activeTab, setActiveTab] = useState("dashboard");

  // State: dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // State: observations
  const [observations, setObservations] = useState<Observation[]>([]);
  const [obsLoading, setObsLoading] = useState(false);
  const [obsPagination, setObsPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  // State: filters
  const [filterAgency, setFilterAgency] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterSeverity, setFilterSeverity] = useState<string | undefined>();

  // State: modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addActionModalOpen, setAddActionModalOpen] = useState(false);

  // State: dropdowns
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // State: submitting
  const [submitting, setSubmitting] = useState(false);

  // State: action tracking
  const [actionStatusFilter, setActionStatusFilter] = useState<string | undefined>();

  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [actionForm] = Form.useForm();

  // ── Fetchers ────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const { data } = await axios.get("/api/audit/dashboard");
      setDashboard(data);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const fetchObservations = useCallback(
    async (page = 1, pageSize = 15) => {
      setObsLoading(true);
      try {
        const params: Record<string, any> = { page, pageSize };
        if (filterAgency) params.agency = filterAgency;
        if (filterStatus) params.status = filterStatus;
        if (filterSeverity) params.severity = filterSeverity;
        const { data } = await axios.get("/api/audit/observations", { params });
        setObservations(data.data || data.observations || data);
        const pg = data.pagination || {};
        setObsPagination({
          current: pg.page || data.page || page,
          pageSize: pg.pageSize || data.limit || pageSize,
          total: pg.total || data.total || (Array.isArray(data) ? data.length : 0),
        });
      } catch (err: any) {
        message.error(err?.response?.data?.message || "Failed to load observations");
      } finally {
        setObsLoading(false);
      }
    },
    [filterAgency, filterStatus, filterSeverity]
  );

  const fetchInstallations = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/equipment/installations");
      setInstallations(data.data || data);
    } catch {
      // silently fail, user can still type
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/org/hierarchy");
      const deptArray = data.departments || data.data || (Array.isArray(data) ? data : []);
      setDepartments(deptArray);
    } catch {
      // silently fail
    }
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDashboard();
    fetchInstallations();
    fetchDepartments();
  }, [fetchDashboard, fetchInstallations, fetchDepartments]);

  useEffect(() => {
    if (activeTab === "observations" || activeTab === "actions") {
      fetchObservations();
    }
  }, [activeTab, fetchObservations]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCreateObservation = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        auditDate: values.auditDate?.toISOString(),
        targetDate: values.targetDate?.toISOString(),
      };
      await axios.post("/api/audit/observations", payload);
      message.success("Observation created successfully");
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchObservations();
      fetchDashboard();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to create observation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateObservation = async (values: any) => {
    if (!selectedObs) return;
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        auditDate: values.auditDate?.toISOString(),
        targetDate: values.targetDate?.toISOString(),
      };
      await axios.put(`/api/audit/observations/${selectedObs.id}`, payload);
      message.success("Observation updated successfully");
      setEditMode(false);
      setDetailModalOpen(false);
      editForm.resetFields();
      fetchObservations();
      fetchDashboard();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to update observation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAction = async (values: any) => {
    if (!selectedObs) return;
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        targetDate: values.targetDate?.toISOString(),
      };
      await axios.post(
        `/api/audit/observations/${selectedObs.id}/actions`,
        payload
      );
      message.success("Action added successfully");
      setAddActionModalOpen(false);
      actionForm.resetFields();
      // refresh the selected observation from server
      const { data: refreshed } = await axios.get(`/api/audit/observations/${selectedObs.id}`);
      setSelectedObs(refreshed);
      fetchObservations();
      fetchDashboard();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to add action");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateActionStatus = async (
    observationId: string,
    actionId: string,
    status: Status
  ) => {
    try {
      await axios.put(
        `/api/audit/observations/${observationId}/actions/${actionId}`,
        { status, ...(status === "CLOSED" ? { completedDate: new Date().toISOString() } : {}) }
      );
      message.success("Action status updated");
      if (selectedObs && selectedObs.id === observationId) {
        const { data: refreshed } = await axios.get(`/api/audit/observations/${observationId}`);
        setSelectedObs(refreshed);
      }
      fetchObservations();
      fetchDashboard();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to update action");
    }
  };

  const handleDeleteObservation = async (id: string) => {
    try {
      await axios.delete(`/api/audit/observations/${id}`);
      message.success("Observation deleted");
      fetchObservations();
      fetchDashboard();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to delete observation");
    }
  };

  const openDetail = (record: Observation, edit = false) => {
    setSelectedObs(record);
    setEditMode(edit);
    if (edit) {
      editForm.setFieldsValue({
        ...record,
        auditDate: record.auditDate ? dayjs(record.auditDate) : undefined,
        targetDate: record.targetDate ? dayjs(record.targetDate) : undefined,
      });
    }
    setDetailModalOpen(true);
  };

  const handleFilterApply = () => {
    fetchObservations(1, obsPagination.pageSize);
  };

  const handleFilterClear = () => {
    setFilterAgency(undefined);
    setFilterStatus(undefined);
    setFilterSeverity(undefined);
  };

  // ── Collect all actions across observations ─────────────────────────────

  const allActions: (AuditAction & { observationId: string; observationNo: string })[] = [];
  observations.forEach((obs) => {
    (obs.actions || []).forEach((action) => {
      allActions.push({ ...action, observationId: obs.id, observationNo: obs.observationNo });
    });
  });

  const filteredActions = actionStatusFilter
    ? allActions.filter((a) => a.status === actionStatusFilter)
    : allActions;

  // ── Dashboard Tab ───────────────────────────────────────────────────────

  const renderDashboard = () => {
    if (dashboardLoading) {
      return (
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin size="large" />
        </div>
      );
    }
    if (!dashboard) {
      return <Empty description="No dashboard data available" />;
    }

    const closedPercent =
      dashboard.total > 0 ? Math.round((dashboard.closed / dashboard.total) * 100) : 0;

    return (
      <div>
        {/* Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={4}>
            <Card hoverable>
              <Statistic
                title="Total Observations"
                value={dashboard.total}
                prefix={<FileText size={18} style={{ marginRight: 6 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card hoverable>
              <Statistic
                title="Open"
                value={dashboard.open}
                valueStyle={{ color: "#1890ff" }}
                prefix={<Shield size={18} style={{ marginRight: 6 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card hoverable>
              <Statistic
                title="In Progress"
                value={dashboard.inProgress}
                valueStyle={{ color: "#fa8c16" }}
                prefix={<Clock size={18} style={{ marginRight: 6 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card hoverable>
              <Statistic
                title="Closed"
                value={dashboard.closed}
                valueStyle={{ color: "#52c41a" }}
                prefix={<CheckCircle size={18} style={{ marginRight: 6 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card hoverable>
              <Statistic
                title="Overdue"
                value={dashboard.overdue}
                valueStyle={{ color: "#ff4d4f" }}
                prefix={<AlertTriangle size={18} style={{ marginRight: 6 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card hoverable>
              <Statistic
                title="Overdue Actions"
                value={dashboard.overdueActions}
                valueStyle={{ color: "#ff4d4f" }}
                prefix={<AlertTriangle size={18} style={{ marginRight: 6 }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Closure Progress */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={8}>
            <Card title="Closure Progress" size="small">
              <Progress
                type="circle"
                percent={closedPercent}
                strokeColor="#52c41a"
                format={(p) => `${p}%`}
              />
              <div style={{ marginTop: 12, color: "#888" }}>
                {dashboard.closed} of {dashboard.total} observations closed
              </div>
            </Card>
          </Col>

          {/* Pending by Agency */}
          <Col xs={24} md={8}>
            <Card title="Pending by Agency" size="small">
              {(dashboard.pendingByAgency || []).length === 0 ? (
                <Empty description="No pending observations" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                (dashboard.pendingByAgency || []).map((item) => {
                  const maxCount = Math.max(...(dashboard.pendingByAgency || []).map((i) => i.count), 1);
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.agency} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 2,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{item.agency}</span>
                        <Badge count={item.count} style={{ backgroundColor: "#1890ff" }} />
                      </div>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor="#1890ff"
                        size="small"
                      />
                    </div>
                  );
                })
              )}
            </Card>
          </Col>

          {/* Pending by Service */}
          <Col xs={24} md={8}>
            <Card title="Pending by Service" size="small">
              {(dashboard.pendingByService || []).length === 0 ? (
                <Empty description="No pending observations" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                (dashboard.pendingByService || []).map((item) => {
                  const maxCount = Math.max(...(dashboard.pendingByService || []).map((i) => i.count), 1);
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.service} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 2,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{item.service}</span>
                        <Badge count={item.count} style={{ backgroundColor: "#722ed1" }} />
                      </div>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor="#722ed1"
                        size="small"
                      />
                    </div>
                  );
                })
              )}
            </Card>
          </Col>
        </Row>

        {/* Pending by Severity */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card title="Pending by Severity" size="small">
              <Space size="large" wrap>
                {(dashboard.pendingBySeverity || []).map((item) => (
                  <Tag
                    key={item.severity}
                    color={SEVERITY_COLOR[item.severity as Severity] || "default"}
                    style={{ fontSize: 14, padding: "6px 16px" }}
                  >
                    {item.severity}: {item.count}
                  </Tag>
                ))}
                {(dashboard.pendingBySeverity || []).length === 0 && (
                  <span style={{ color: "#888" }}>No pending observations</span>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // ── Observations Table Columns ──────────────────────────────────────────

  const observationColumns: ColumnsType<Observation> = [
    {
      title: "Obs No",
      dataIndex: "observationNo",
      key: "observationNo",
      width: 110,
      sorter: (a, b) => (a.observationNo || "").localeCompare(b.observationNo || ""),
    },
    {
      title: "Agency",
      dataIndex: "agency",
      key: "agency",
      width: 100,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: "Audit Date",
      dataIndex: "auditDate",
      key: "auditDate",
      width: 110,
      render: (val: string) => (val ? dayjs(val).format("DD-MMM-YYYY") : "-"),
      sorter: (a, b) =>
        new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime(),
    },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (val: Severity) => (
        <Tag color={SEVERITY_COLOR[val] || "default"}>{val}</Tag>
      ),
    },
    {
      title: "Observation",
      dataIndex: "observation",
      key: "observation",
      ellipsis: true,
      render: (val: string) => (
        <Tooltip title={val}>{val?.length > 80 ? val.slice(0, 80) + "..." : val}</Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (val: Status) => (
        <Tag color={STATUS_COLOR[val] || "default"}>{val?.replace("_", " ")}</Tag>
      ),
    },
    {
      title: "Target Date",
      dataIndex: "targetDate",
      key: "targetDate",
      width: 110,
      render: (val: string) => {
        if (!val) return "-";
        const isOverdue = dayjs(val).isBefore(dayjs(), "day");
        return (
          <span style={{ color: isOverdue ? "#ff4d4f" : undefined, fontWeight: isOverdue ? 600 : 400 }}>
            {dayjs(val).format("DD-MMM-YYYY")}
          </span>
        );
      },
      sorter: (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    },
    {
      title: "Assigned To",
      dataIndex: "assignedTo",
      key: "assignedTo",
      width: 130,
      ellipsis: true,
    },
    {
      title: "Actions",
      key: "actionsCount",
      width: 80,
      align: "center",
      render: (_: any, record: Observation) => (
        <Badge count={record.actions?.length || 0} showZero style={{ backgroundColor: "#1890ff" }} />
      ),
    },
    {
      title: "",
      key: "ops",
      width: isAdmin ? 120 : 90,
      render: (_: any, record: Observation) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<Eye size={15} />}
              onClick={() => openDetail(record, false)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<Edit3 size={15} />}
              onClick={() => openDetail(record, true)}
            />
          </Tooltip>
          {isAdmin && (
            <Popconfirm title="Delete this observation?" onConfirm={() => handleDeleteObservation(record.id)}>
              <Tooltip title="Delete">
                <Button type="text" size="small" danger icon={<Trash2 size={15} />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── Observations Tab ────────────────────────────────────────────────────

  const renderObservations = () => (
    <div>
      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col>
            <Filter size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
            <span style={{ fontWeight: 500 }}>Filters:</span>
          </Col>
          <Col>
            <Select
              placeholder="Agency"
              allowClear
              value={filterAgency}
              onChange={setFilterAgency}
              style={{ width: 140 }}
            >
              {AGENCY_OPTIONS.map((a) => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Status"
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 140 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <Option key={s} value={s}>
                  {s.replace("_", " ")}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Severity"
              allowClear
              value={filterSeverity}
              onChange={setFilterSeverity}
              style={{ width: 140 }}
            >
              {SEVERITY_OPTIONS.map((s) => (
                <Option key={s} value={s}>
                  {s}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Space>
              <Button type="primary" size="small" onClick={handleFilterApply}>
                Apply
              </Button>
              <Button
                size="small"
                onClick={() => {
                  handleFilterClear();
                  // Re-fetch is triggered by effect since filters change
                  setTimeout(() => fetchObservations(1, obsPagination.pageSize), 0);
                }}
              >
                Clear
              </Button>
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<Plus size={15} />}
              onClick={() => setCreateModalOpen(true)}
            >
              New Observation
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Table
        rowKey="id"
        columns={observationColumns}
        dataSource={observations}
        loading={obsLoading}
        size="small"
        scroll={{ x: 1100 }}
        pagination={{
          current: obsPagination.current,
          pageSize: obsPagination.pageSize,
          total: obsPagination.total,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          onChange: (page, pageSize) => fetchObservations(page, pageSize),
        }}
      />
    </div>
  );

  // ── Action Tracking Tab ─────────────────────────────────────────────────

  const actionColumns: ColumnsType<
    AuditAction & { observationId: string; observationNo: string }
  > = [
    {
      title: "Observation",
      dataIndex: "observationNo",
      key: "observationNo",
      width: 120,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Assigned To",
      dataIndex: "assignedTo",
      key: "assignedTo",
      width: 140,
    },
    {
      title: "Target Date",
      dataIndex: "targetDate",
      key: "targetDate",
      width: 120,
      render: (val: string) => {
        if (!val) return "-";
        const overdue = dayjs(val).isBefore(dayjs(), "day");
        return (
          <span style={{ color: overdue ? "#ff4d4f" : undefined }}>
            {dayjs(val).format("DD-MMM-YYYY")}
          </span>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (val: Status) => (
        <Tag color={STATUS_COLOR[val] || "default"}>{val?.replace("_", " ")}</Tag>
      ),
    },
    {
      title: "Completed",
      dataIndex: "completedDate",
      key: "completedDate",
      width: 120,
      render: (val: string) => (val ? dayjs(val).format("DD-MMM-YYYY") : "-"),
    },
    {
      title: "",
      key: "ops",
      width: 140,
      render: (_: any, record) => (
        <Select
          size="small"
          value={record.status}
          style={{ width: 120 }}
          onChange={(val: Status) =>
            handleUpdateActionStatus(record.observationId, record.id, val)
          }
        >
          {STATUS_OPTIONS.map((s) => (
            <Option key={s} value={s}>
              {s.replace("_", " ")}
            </Option>
          ))}
        </Select>
      ),
    },
  ];

  const renderActionTracking = () => (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col>
            <Filter size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
            <span style={{ fontWeight: 500 }}>Filter by Status:</span>
          </Col>
          <Col>
            <Select
              placeholder="All Statuses"
              allowClear
              value={actionStatusFilter}
              onChange={setActionStatusFilter}
              style={{ width: 160 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <Option key={s} value={s}>
                  {s.replace("_", " ")}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Table
        rowKey="id"
        columns={actionColumns}
        dataSource={filteredActions}
        loading={obsLoading}
        size="small"
        scroll={{ x: 900 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        }}
      />
    </div>
  );

  // ── Observation Form Fields (shared between create & edit) ──────────────

  const renderObservationFormFields = () => (
    <>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="agency" label="Agency" rules={[{ required: true, message: "Required" }]}>
            <Select placeholder="Select Agency">
              {AGENCY_OPTIONS.map((a) => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="auditDate"
            label="Audit Date"
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD-MMM-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="installationId" label="Installation">
            <Select placeholder="Select Installation" allowClear showSearch optionFilterProp="children">
              {installations.map((inst) => (
                <Option key={inst.id} value={inst.id}>
                  {inst.installationId || inst.location || inst.name || inst.id}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="department" label="Department">
            <Select placeholder="Select Department" allowClear showSearch optionFilterProp="children">
              {departments.map((dep) => (
                <Option key={dep.id} value={dep.id}>
                  {dep.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="service"
            label="Service"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select placeholder="Select Service">
              {SERVICE_OPTIONS.map((s) => (
                <Option key={s} value={s}>
                  {s}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="category" label="Category">
            <Input placeholder="e.g. Fire Safety, Pressure Vessels" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            name="severity"
            label="Severity"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select placeholder="Select Severity">
              {SEVERITY_OPTIONS.map((s) => (
                <Option key={s} value={s}>
                  <Tag color={SEVERITY_COLOR[s]} style={{ margin: 0 }}>
                    {s}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="targetDate"
            label="Target Date"
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD-MMM-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="reference" label="Reference">
            <Input placeholder="Clause/Standard reference" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="observation"
        label="Observation"
        rules={[{ required: true, message: "Required" }]}
      >
        <TextArea rows={3} placeholder="Describe the audit observation" />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="reportedBy" label="Reported By">
            <Input placeholder="Auditor name" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="assignedTo"
            label="Assigned To"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="Responsible person" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="status" label="Status">
            <Select placeholder="Status">
              {STATUS_OPTIONS.map((s) => (
                <Option key={s} value={s}>
                  {s.replace("_", " ")}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="remarks" label="Remarks">
        <TextArea rows={2} placeholder="Additional remarks" />
      </Form.Item>
    </>
  );

  // ── Detail / Edit Modal ─────────────────────────────────────────────────

  const renderDetailModal = () => {
    if (!selectedObs) return null;

    const detailActionColumns: ColumnsType<AuditAction> = [
      { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
      { title: "Assigned To", dataIndex: "assignedTo", key: "assignedTo", width: 130 },
      {
        title: "Target",
        dataIndex: "targetDate",
        key: "targetDate",
        width: 110,
        render: (val: string) => (val ? dayjs(val).format("DD-MMM-YYYY") : "-"),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (val: Status) => (
          <Tag color={STATUS_COLOR[val] || "default"}>{val?.replace("_", " ")}</Tag>
        ),
      },
      {
        title: "",
        key: "ops",
        width: 120,
        render: (_: any, record: AuditAction) => (
          <Select
            size="small"
            value={record.status}
            style={{ width: 110 }}
            onChange={(val: Status) =>
              handleUpdateActionStatus(selectedObs.id, record.id, val)
            }
          >
            {STATUS_OPTIONS.map((s) => (
              <Option key={s} value={s}>
                {s.replace("_", " ")}
              </Option>
            ))}
          </Select>
        ),
      },
    ];

    if (editMode) {
      return (
        <Modal
          title="Edit Observation"
          open={detailModalOpen}
          onCancel={() => {
            setDetailModalOpen(false);
            setEditMode(false);
            editForm.resetFields();
          }}
          width={900}
          footer={null}
          destroyOnClose
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateObservation}
            size="small"
          >
            {renderObservationFormFields()}
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Space>
                <Button
                  onClick={() => {
                    setDetailModalOpen(false);
                    setEditMode(false);
                    editForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Save Changes
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>
      );
    }

    return (
      <Modal
        title={
          <Space>
            <FileText size={18} />
            <span>Observation: {selectedObs.observationNo}</span>
            <Tag color={STATUS_COLOR[selectedObs.status]}>{selectedObs.status?.replace("_", " ")}</Tag>
          </Space>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={950}
        footer={
          <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
        }
        destroyOnClose
      >
        <Row gutter={[16, 12]}>
          <Col span={8}>
            <strong>Agency:</strong> <Tag>{selectedObs.agency}</Tag>
          </Col>
          <Col span={8}>
            <strong>Audit Date:</strong>{" "}
            {selectedObs.auditDate ? dayjs(selectedObs.auditDate).format("DD-MMM-YYYY") : "-"}
          </Col>
          <Col span={8}>
            <strong>Severity:</strong>{" "}
            <Tag color={SEVERITY_COLOR[selectedObs.severity]}>{selectedObs.severity}</Tag>
          </Col>
          <Col span={8}>
            <strong>Service:</strong> {selectedObs.service || "-"}
          </Col>
          <Col span={8}>
            <strong>Category:</strong> {selectedObs.category || "-"}
          </Col>
          <Col span={8}>
            <strong>Reference:</strong> {selectedObs.reference || "-"}
          </Col>
          <Col span={8}>
            <strong>Target Date:</strong>{" "}
            {selectedObs.targetDate ? dayjs(selectedObs.targetDate).format("DD-MMM-YYYY") : "-"}
          </Col>
          <Col span={8}>
            <strong>Reported By:</strong> {selectedObs.reportedBy || "-"}
          </Col>
          <Col span={8}>
            <strong>Assigned To:</strong> {selectedObs.assignedTo || "-"}
          </Col>
        </Row>

        <Divider style={{ margin: "16px 0" }} />

        <div style={{ marginBottom: 12 }}>
          <strong>Observation:</strong>
          <div
            style={{
              marginTop: 4,
              padding: "8px 12px",
              background: "#fafafa",
              borderRadius: 6,
              border: "1px solid #f0f0f0",
              whiteSpace: "pre-wrap",
            }}
          >
            {selectedObs.observation}
          </div>
        </div>

        {selectedObs.remarks && (
          <div style={{ marginBottom: 12 }}>
            <strong>Remarks:</strong>
            <div
              style={{
                marginTop: 4,
                padding: "8px 12px",
                background: "#fafafa",
                borderRadius: 6,
                border: "1px solid #f0f0f0",
              }}
            >
              {selectedObs.remarks}
            </div>
          </div>
        )}

        <Divider style={{ margin: "16px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <strong>Actions ({selectedObs.actions?.length || 0})</strong>
          <Button
            type="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => setAddActionModalOpen(true)}
          >
            Add Action
          </Button>
        </div>

        {selectedObs.actions && selectedObs.actions.length > 0 ? (
          <Table
            rowKey="id"
            columns={detailActionColumns}
            dataSource={selectedObs.actions}
            size="small"
            pagination={false}
          />
        ) : (
          <Empty description="No actions yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Modal>
    );
  };

  // ── Sidebar Navigation ─────────────────────────────────────────────────

  const sidebarMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "observations", label: "Observations", icon: Shield },
    { id: "actions", label: "Action Tracking", icon: ListChecks },
  ];

  const SidebarContent = (
    <div className="space-y-1">
      <Button type="primary" icon={<Home className="w-4 h-4" />} onClick={() => navigate("/hub")} className="w-full mb-4" ghost>
        Maintenance Hub
      </Button>
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Audit</div>
      {sidebarMenuItems.map(item => (
        <button key={item.id} onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === item.id ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
          <item.icon className={`w-4 h-4 mr-3 ${activeTab === item.id ? 'text-red-600' : 'text-gray-400'}`} />
          {item.label}
        </button>
      ))}
    </div>
  );

  const SidebarIcons = (
    <>
      {sidebarMenuItems.map(item => (
        <Tooltip key={item.id} title={item.label} placement="right">
          <button onClick={() => setActiveTab(item.id)}
            className={`w-full flex justify-center p-2 rounded ${activeTab === item.id ? 'bg-red-100 dark:bg-red-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-red-600' : 'text-gray-400'}`} />
          </button>
        </Tooltip>
      ))}
    </>
  );

  // ── Main Render ─────────────────────────────────────────────────────────

  return (
    <Layout sidebarContent={SidebarContent} sidebarIcons={SidebarIcons}>
      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>
            <Shield size={22} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Audit Observations
          </h2>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'dashboard',
            label: <span><FileText size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />Dashboard</span>,
            children: renderDashboard()
          },
          {
            key: 'observations',
            label: <span><Shield size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />Observations</span>,
            children: renderObservations()
          },
          {
            key: 'actions',
            label: <span><CheckCircle size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />Action Tracking</span>,
            children: renderActionTracking()
          }
        ]} />
      </div>

      {/* Create Observation Modal */}
      <Modal
        title="New Audit Observation"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        width={900}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateObservation}
          size="small"
          initialValues={{ status: "OPEN" }}
        >
          {renderObservationFormFields()}
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button
                onClick={() => {
                  setCreateModalOpen(false);
                  createForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Create Observation
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Detail / Edit Modal */}
      {renderDetailModal()}

      {/* Add Action Modal */}
      <Modal
        title="Add Action"
        open={addActionModalOpen}
        onCancel={() => {
          setAddActionModalOpen(false);
          actionForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={actionForm} layout="vertical" onFinish={handleAddAction} size="small">
          <Form.Item
            name="description"
            label="Action Description"
            rules={[{ required: true, message: "Required" }]}
          >
            <TextArea rows={3} placeholder="Describe the corrective/preventive action" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedTo"
                label="Assigned To"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="Responsible person" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="targetDate"
                label="Target Date"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD-MMM-YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label="Remarks">
            <TextArea rows={2} placeholder="Optional remarks" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setAddActionModalOpen(false);
                  actionForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Add Action
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
};
