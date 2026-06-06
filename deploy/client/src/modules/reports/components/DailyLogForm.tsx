import React, { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Card,
  DatePicker,
  Select,
  Input,
  TimePicker,
  InputNumber,
  Button,
  Row,
  Col,
  message,
  Divider
} from 'antd';
import { ClockCircleOutlined, FileTextOutlined, TeamOutlined, SettingOutlined, AlertOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import { disciplineToLabel, type Discipline } from '../../../utils/workspace';
import { canonicalServiceKey, displayService, uniqueServiceOptions } from '../../../utils/serviceGroups';

const { TextArea } = Input;
const { Option } = Select;

interface DailyLogFormProps {
  onSuccess?: () => void;
  initialData?: any;
  discipline?: Discipline;
}

export const DailyLogForm: React.FC<DailyLogFormProps> = ({ onSuccess, initialData, discipline }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [installations, setInstallations] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [manpower, setManpower] = useState<any[]>([]);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  
  // Cascading filter state
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedJobType, setSelectedJobType] = useState<string>('PM');
  const lockedSection = discipline ? disciplineToLabel(discipline) : null;

  // Get user's default section from their profile
  const userDefaultSection = lockedSection || (user as any)?.section || 'Instrumentation';

  // Get unique services from installations
  const serviceOptions = useMemo(() => {
    return uniqueServiceOptions(installations.map(i => i.type));
  }, [installations]);

  // Filter installations based on selected service
  const filteredInstallations = useMemo(() => {
    if (!selectedService) return installations;
    return installations.filter(inst => canonicalServiceKey(inst.type) === selectedService);
  }, [installations, selectedService]);

  // Fetch reference data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          axios.get('/api/equipment/installations', { params: discipline ? { discipline } : undefined }),
          axios.get('/api/equipment/instruments', { params: discipline ? { discipline } : undefined }),
          axios.get('/api/equipment/running-equip', { params: discipline ? { discipline } : undefined }),
          axios.get('/api/maintenance/manpower')
        ]);

        // Handle Installations
        if (results[0].status === 'fulfilled') {
          setInstallations(results[0].value.data);
        } else {
          console.error('Failed to fetch installations:', results[0].reason);
        }

        // Handle Equipment (Instruments + Running Equip)
        const instruments = results[1].status === 'fulfilled' ? results[1].value.data : [];
        const runningEquip = results[2].status === 'fulfilled' ? results[2].value.data : [];
        
        if (results[1].status === 'rejected') console.error('Failed to fetch instruments:', results[1].reason);
        if (results[2].status === 'rejected') console.error('Failed to fetch running equipment:', results[2].reason);

        const combinedEquipment = [
          ...instruments.map((i: any) => ({
            tag: i.tagId,
            label: `[I] ${i.tagId} - ${i.description}`,
            type: 'INSTRUMENT'
          })),
          ...runningEquip.map((e: any) => ({
            tag: e.equipmentTag,
            label: `[E] ${e.equipmentTag} - ${e.description}`,
            type: 'RUNNING_EQUIPMENT'
          }))
        ];
        setEquipment(combinedEquipment);

        // Handle Manpower
        if (results[3].status === 'fulfilled') {
          setManpower(results[3].value.data);
        } else {
          console.error('Failed to fetch manpower:', results[3].reason);
        }
      } catch (error) {
        console.error('Unexpected error during data fetch:', error);
      }
    };
    fetchData();
  }, [discipline]);

  useEffect(() => {
    if (lockedSection) {
      form.setFieldValue('section', lockedSection);
    }
  }, [form, lockedSection]);

  // Handle service change - reset installation
  const handleServiceChange = (service: string) => {
    setSelectedService(service);
    form.setFieldValue('installationId', undefined);
  };

  // Handle job type change
  const handleJobTypeChange = (jobType: string) => {
    setSelectedJobType(jobType);
  };

  // Calculate hours when time range changes
  const handleTimeChange = (times: [Dayjs | null, Dayjs | null] | null) => {
    if (times && times[0] && times[1]) {
      const start = times[0];
      const end = times[1];
      const diffMinutes = end.diff(start, 'minute');
      const hours = Math.round((diffMinutes / 60) * 100) / 100;
      setCalculatedHours(hours > 0 ? hours : 0);
      form.setFieldValue('durationHours', hours > 0 ? hours : 0);
    } else {
      setCalculatedHours(0);
      form.setFieldValue('durationHours', 0);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const [startTime, endTime] = values.timeRange || [null, null];
      const baseDate = values.date;
      
      // Build payload
      const payload: any = {
        date: values.date.format('YYYY-MM-DD'),
        installationId: values.installationId,
        department: displayService(selectedService || values.department),
        section: values.section,
        ...(discipline ? { primaryDiscipline: discipline } : {}),
        jobType: values.jobType,
        reportCriticality: values.reportCriticality,
        equipmentTag: values.equipmentTag,
        equipmentType: equipment.find(e => e.tag === values.equipmentTag)?.type,
        notificationNo: values.notificationNo,
        description: values.description,
        status: values.status,
        startTime: startTime ? baseDate.hour(startTime.hour()).minute(startTime.minute()).toISOString() : null,
        endTime: endTime ? baseDate.hour(endTime.hour()).minute(endTime.minute()).toISOString() : null,
        durationHours: calculatedHours,
        remarks: values.remarks,
        teamMemberIds: values.teamMemberIds || [],
        createdBy: user?.username || 'system'
      };

      // Add BD-specific times if job type is BD
      if (values.jobType === 'BD') {
        if (values.bdReportTime) {
          payload.bdReportTime = baseDate.hour(values.bdReportTime.hour()).minute(values.bdReportTime.minute()).toISOString();
        }
        if (values.teamReportTime) {
          payload.teamReportTime = baseDate.hour(values.teamReportTime.hour()).minute(values.teamReportTime.minute()).toISOString();
        }
        if (values.jobCompletionTime) {
          payload.jobCompletionTime = baseDate.hour(values.jobCompletionTime.hour()).minute(values.jobCompletionTime.minute()).toISOString();
        }
      }

      if (initialData?.id) {
        await axios.put(`/api/maintenance/logs/${initialData.id}`, payload);
        message.success('Log updated successfully');
      } else {
        await axios.post('/api/maintenance/logs', payload);
        message.success('Daily log submitted successfully');
      }

      form.resetFields();
      setCalculatedHours(0);
      setSelectedService(null);
      setSelectedJobType('PM');
      onSuccess?.();
    } catch (error) {
      message.error('Failed to submit log');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        date: dayjs(),
        jobType: 'PM',
        reportCriticality: 1,
        status: 'In Progress',
        section: userDefaultSection
      }}
    >
      {/* Section A: Context & Scope */}
      <Card 
        title={<><SettingOutlined /> Context & Scope</>}
        size="small" 
        className="mb-4"
        style={{ borderLeft: '3px solid #1890ff' }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="department" label="Service" rules={[{ required: true }]}>
              <Select 
                placeholder="Select service" 
                onChange={handleServiceChange}
                allowClear
              >
                {serviceOptions.map((service) => (
                  <Option key={service.value} value={service.value}>{service.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="section" label="Section" rules={[{ required: true }]}>
              <Select disabled={Boolean(lockedSection)}>
                <Option value="Mechanical">Mechanical</Option>
                <Option value="Electrical">Electrical</Option>
                <Option value="Instrumentation">Instrumentation</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="installationId" label="Installation" rules={[{ required: true }]}>
              <Select 
                placeholder={selectedService ? "Select installation" : "Select service first"}
                showSearch 
                optionFilterProp="children"
                disabled={!selectedService}
              >
                {filteredInstallations.map((inst) => (
                  <Option key={inst.id} value={inst.id}>
                    {inst.installationId}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Section B: Job Classification */}
      <Card 
        title={<><FileTextOutlined /> Job Classification</>}
        size="small" 
        className="mb-4"
        style={{ borderLeft: '3px solid #52c41a' }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="jobType" label="Job Type" rules={[{ required: true }]}>
              <Select onChange={handleJobTypeChange}>
                <Option value="PM">PM - Preventive Maintenance</Option>
                <Option value="BD">BD - Breakdown</Option>
                <Option value="ERECTION">ERECTION</Option>
                <Option value="DISMANTLING">DISMANTLING</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="reportCriticality" label="Report Level" rules={[{ required: true }]}>
              <Select>
                <Option value={1}>★ Routine (Daily)</Option>
                <Option value={2}>★★ Significant (Monthly)</Option>
                <Option value={3}>★★★ Critical (Annual)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select>
                <Option value="Open">Open</Option>
                <Option value="In Progress">In Progress</Option>
                <Option value="Closed">Closed</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* BD-specific time fields */}
        {selectedJobType === 'BD' && (
          <>
            <Divider plain>
              <AlertOutlined style={{ color: '#f5222d' }} /> Breakdown Timeline
            </Divider>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item name="bdReportTime" label="BD Reporting Time" rules={[{ required: true }]}>
                  <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="When BD reported" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="teamReportTime" label="Team Reporting Time" rules={[{ required: true }]}>
                  <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="When team reached" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="jobCompletionTime" label="Job Completion Time" rules={[{ required: true }]}>
                  <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="When job completed" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Card>

      {/* Section C: Job Details */}
      <Card 
        title={<><TeamOutlined /> Job Details</>}
        size="small" 
        className="mb-4"
        style={{ borderLeft: '3px solid #722ed1' }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="equipmentTag" label="Equipment">
              <Select 
                placeholder="Search Equipment..." 
                showSearch 
                optionFilterProp="children"
                allowClear
              >
                {equipment.map((eq) => (
                  <Option key={eq.tag} value={eq.tag}>{eq.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="notificationNo" label="Notification/Permit No.">
              <Input placeholder="Optional" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item 
          name="description" 
          label="Description" 
          rules={[{ required: true, message: 'Please enter job description' }]}
        >
          <TextArea 
            rows={4} 
            placeholder="Brief job details... (e.g., Laid LEL BN & SS cables from JB to transmitter location)"
          />
        </Form.Item>
        <Form.Item name="teamMemberIds" label="Team Members">
          <Select
            mode="multiple"
            placeholder="Select team members"
            optionFilterProp="children"
            allowClear
          >
            {manpower.map((m) => (
              <Option key={m.id} value={m.id}>{m.name} ({m.designation || m.department})</Option>
            ))}
          </Select>
        </Form.Item>
      </Card>

      {/* Section D: Time & Duration (for non-BD jobs) */}
      {selectedJobType !== 'BD' && (
        <Card 
          title={<><ClockCircleOutlined /> Time & Duration</>}
          size="small" 
          className="mb-4"
          style={{ borderLeft: '3px solid #fa8c16' }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={10}>
              <Form.Item name="timeRange" label="Time Window" rules={[{ required: true }]}>
                <TimePicker.RangePicker 
                  format="HH:mm" 
                  style={{ width: '100%' }}
                  onChange={handleTimeChange}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="durationHours" label="Total Hours">
                <InputNumber 
                  value={calculatedHours} 
                  disabled 
                  style={{ width: '100%' }}
                  suffix="hrs"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="remarks" label="Remarks">
                <Input placeholder="NA" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )}

      {/* Remarks for BD */}
      {selectedJobType === 'BD' && (
        <Form.Item name="remarks" label="Remarks" className="mb-4">
          <Input placeholder="Additional remarks" />
        </Form.Item>
      )}

      {/* Submit Button */}
      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          size="large"
          block
          style={{ 
            height: 48, 
            fontSize: 16, 
            fontWeight: 600,
            background: selectedJobType === 'BD' 
              ? 'linear-gradient(135deg, #f5222d 0%, #cf1322 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          {selectedJobType === 'BD' ? '🚨 SUBMIT BREAKDOWN REPORT' : 'SUBMIT REPORT'}
        </Button>
      </Form.Item>
    </Form>
  );
};
