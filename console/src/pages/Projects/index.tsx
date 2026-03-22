import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, Button, Modal, Form, Input, message, Popconfirm, Space, Typography, Select, Tag, Steps, Radio
} from "antd";
const { OptGroup } = Select;
import { Plus, Edit, Delete, PlayCircle, Square, Box, Settings, Sparkles } from "lucide-react";

const { Title, Text } = Typography;

const APP_VERSION = "v0.3.0";

const PRESET_MODELS = [
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "o3", label: "o3", provider: "OpenAI" },
  { value: "o4-mini", label: "o4-mini", provider: "OpenAI" },
  { value: "qwen3-max", label: "Qwen3 Max", provider: "阿里云" },
  { value: "deepseek-v3.2", label: "DeepSeek-V3.2", provider: "阿里云" },
  { value: "glm-5", label: "GLM-5", provider: "智谱" },
  { value: "ky-1.2-30b-moe-instruct-1031", label: "kywx (ky-1.2-30b-moe-instruct-1031)", provider: "BossSoft" },
];

const BOSS_SOFT_CONFIG = {
  provider_id: "myprovider",
  provider_name: "BossSoft",
  api_url: "https://chat.bosssoft.com.cn/v1"
};

interface Project {
  id: string;
  name: string;
  description: string;
  projectType: "copaw" | "openclaw";
  model?: string;
  apiKey?: string;
  skills?: string[];
  createdAt: string;
  status: "running" | "stopped";
  containerName?: string;
  containerUrl?: string;
}

const STORAGE_KEY = "copaw_projects";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);

  const [useCustomModel, setUseCustomModel] = useState(false);
  const [containerStarting, setContainerStarting] = useState(false);
  const [createdPort, setCreatedPort] = useState<number>(8090);
  const [containerReady, setContainerReady] = useState(false);
  const [currentContainerName, setCurrentContainerName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState("");
  const [configModelLoading, setConfigModelLoading] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("copaw_user");
    if (!user) {
      navigate("/login");
      return;
    }
    loadProjects();
  }, [navigate]);

  const loadProjects = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setProjects(JSON.parse(stored));
  };

  const saveProjects = (data: Project[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProjects(data);
  };

  const handleFinish = async () => {
    const values = form.getFieldsValue(true);
    const newProject: Project = {
      id: currentProjectId || Date.now().toString(),
      name: values.name,
      description: values.description,
      projectType: values.projectType || "copaw",
      createdAt: new Date().toISOString(),
      status: containerReady ? "running" : "stopped",
      containerName: currentContainerName,
      containerUrl: `http://192.168.92.128:${createdPort}`
    };
    saveProjects([...projects, newProject]);
    setModalVisible(false);
    form.resetFields();
    setCurrentStep(0);
    setUseCustomModel(false);
    setContainerStarting(false);
    setContainerReady(false);
    setCurrentContainerName("");
    setCurrentProjectId("");
    setCreatedPort(8090);
    message.success("项目创建成功");
  };

  const handleDelete = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project?.containerName) {
      try {
        await fetch(`/api/docker/containers/${project.containerName}`, { method: "DELETE" });
      } catch (e) { console.error("删除容器失败:", e); }
    }
    saveProjects(projects.filter(p => p.id !== id));
    message.success("删除成功");
  };

  const handleStop = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project?.containerName) { message.error("该项目没有关联容器"); return; }
    try {
      message.loading({ content: "正在停止容器...", key: "stop" });
      const response = await fetch(`/api/docker/containers/${project.containerName}/stop`, { method: "POST" });
      const result = await response.json();
      if (response.ok && result.success) {
        saveProjects(projects.map(p => p.id === id ? { ...p, status: "stopped" as const } : p));
        message.success({ content: "容器已停止", key: "stop" });
      } else {
        message.error({ content: result.detail || "停止容器失败", key: "stop" });
      }
    } catch (error) {
      message.error({ content: "停止容器失败", key: "stop" });
    }
  };

  const handleStart = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project?.containerName) { message.error("该项目没有关联容器"); return; }
    try {
      message.loading({ content: "正在启动容器...", key: "start" });
      const response = await fetch(`/api/docker/containers/${project.containerName}/start`, { method: "POST" });
      const result = await response.json();
      if (response.ok && result.success) {
        saveProjects(projects.map(p => p.id === id ? { ...p, status: "running" as const } : p));
        message.success({ content: "容器已启动", key: "start" });
      } else {
        message.error({ content: result.detail || "启动容器失败", key: "start" });
      }
    } catch (error) {
      message.error({ content: "启动容器失败", key: "start" });
    }
  };

  const handleEnterProject = (project: Project) => {
    localStorage.setItem("copaw_current_project", JSON.stringify(project));
    if (project.containerUrl) {
      window.open(project.containerUrl, "_blank");
    } else {
      window.location.href = "/chat";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("copaw_user");
    localStorage.removeItem("copaw_current_project");
    navigate("/login");
  };

  const columns = [
    { title: "项目类型", dataIndex: "projectType", key: "projectType",
      render: (type: string) => <Tag color={type === "openclaw" ? "blue" : "orange"}>{type === "openclaw" ? "🦞 OpenClaw" : "🦞 CoPAW"}</Tag> },
    { title: "项目名称", dataIndex: "name", key: "name" },
    { title: "描述", dataIndex: "description", key: "description" },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt",
      render: (text: string) => new Date(text).toLocaleString("zh-CN") },
    { title: "状态", dataIndex: "status", key: "status",
      render: (status: string) => <span style={{ color: status === "running" ? "green" : "#999" }}>{status === "running" ? "运行中" : "已停止"}</span> },
    { title: "操作", key: "action",
      render: (_: any, record: Project) => (
        <Space>
          {record.status === "running" ? (
            <Button type="link" icon={<Square size={16} />} onClick={() => handleStop(record.id)}>停止</Button>
          ) : (
            <Button type="link" icon={<PlayCircle size={16} />} onClick={() => handleStart(record.id)}>启动</Button>
          )}
          <Button type="link" icon={<PlayCircle size={16} />} onClick={() => handleEnterProject(record)} disabled={record.status !== "running"}>进入</Button>
          <Button type="link" icon={<Edit size={16} />} onClick={() => { setEditingProject(record); form.setFieldsValue(record); setModalVisible(true); }}>编辑</Button>
          <Popconfirm title="确定删除此项目？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<Delete size={16} />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={3}>🐲 小龙虾项目列表 <span style={{fontSize:14,color:'#888',fontWeight:400}}>{APP_VERSION}</span></Title>
        <Space>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => { setEditingProject(null); form.resetFields(); setModalVisible(true); }}>新建项目</Button>
          <Button onClick={handleLogout}>退出登录</Button>
        </Space>
      </div>
      <Table dataSource={projects} columns={columns} rowKey="id" locale={{ emptyText: "暂无项目，点击新建项目开始" }} />
      <Modal
        title={editingProject ? "编辑项目" : "新建项目 - 第 " + (currentStep + 1) + " 步"}
        open={modalVisible}
        width={700}
        footer={null}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingProject(null); setCurrentStep(0); setUseCustomModel(false); setContainerStarting(false); setContainerReady(false); setCurrentContainerName(""); setCurrentProjectId(""); }}
      >
        {!editingProject && <Steps current={currentStep} style={{ marginBottom: 24 }}><Steps.Step title="基本信息" icon={<Box />} /><Steps.Step title="配置模型" icon={<Settings />} /><Steps.Step title="选择技能" icon={<Sparkles />} /></Steps>}
        <Form form={form} layout="vertical">
          {currentStep === 0 && (
            <>
              <Form.Item name="projectType" label="项目类型" initialValue="copaw" rules={[{ required: true, message: "请选择项目类型" }]}>
                <Select>
                  <Select.Option value="copaw"><Space><Box size={14} />CoPAW (小龙虾)</Space></Select.Option>
                  <Select.Option value="openclaw"><Space><Box size={14} />OpenClaw (开放爪)</Space></Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="name" label="项目名称" rules={[{ required: true, message: "请输入项目名称" }]}><Input placeholder="例如：我的小龙虾助手" /></Form.Item>
              <Form.Item name="description" label="项目描述"><Input.TextArea placeholder="项目用途描述..." rows={3} /></Form.Item>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" loading={containerStarting} onClick={async () => {
                  try {
                    const values = await form.validateFields();
                    setContainerStarting(true);
                    message.loading({ content: "正在创建容器...", key: "create" });
                    const projectId = Date.now().toString();
                    setCurrentProjectId(projectId);
                    const response = await fetch("/api/docker/create-container", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ project_name: values.name, project_type: values.projectType || "copaw" })
                    });
                    const result = await response.json();
                    if (response.ok && result.success) {
                      setCurrentContainerName(result.container_name);
                      setCurrentProjectId(result.project_id);
                      setCreatedPort(result.port);
                      setContainerReady(true);
                      setContainerStarting(false);
                      setCurrentStep(1);
                      message.success({ content: `容器创建成功！访问地址: ${result.url}`, key: "create" });
                    } else {
                      setContainerStarting(false);
                      message.error({ content: result.detail || "创建容器失败", key: "create" });
                    }
                  } catch (e) { message.error("表单验证失败"); setContainerStarting(false); }
                }}>下一步：创建容器</Button>
              </div>
            </>
          )}
          {currentStep === 1 && (
            <>
              <Form.Item label="模型来源">
                <Radio.Group value={useCustomModel ? "custom" : "preset"} onChange={(e) => setUseCustomModel(e.target.value === "custom")}>
                  <Radio value="preset">使用预设模型</Radio>
                  <Radio value="custom">自定义模型 (OpenAI 兼容)</Radio>
                </Radio.Group>
              </Form.Item>
              {useCustomModel ? (
                <>
                  <Form.Item name="apiUrl" label="API 地址" rules={[{ required: true, message: "请输入 API 地址" }]} extra="OpenAI 兼容的 API 地址，如 https://api.openai.com/v1"><Input placeholder="https://api.openai.com/v1" /></Form.Item>
                  <Form.Item label="API Key" extra="为了保障密钥安全，请在项目启动后在模型列表中添加"><Input.TextArea placeholder="为了保障密钥安全，请在项目启动后在模型列表中添加" disabled rows={2} /></Form.Item>
                  <Form.Item name="model" label="模型名称" rules={[{ required: true, message: "请输入模型名称" }]} extra="支持的模型列表请查看对应的 API 文档"><Input placeholder="例如：gpt-4o, gpt-4o-mini, claude-3-opus" /></Form.Item>
                </>
              ) : (
                <Form.Item name="model" label="选择模型" rules={[{ required: true, message: "请选择模型" }]}>
                  <Select placeholder="选择一个预设模型">
                    <OptGroup label="OpenAI">{PRESET_MODELS.filter(m => m.provider === "OpenAI").map(m => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}</OptGroup>
                    <OptGroup label="阿里云">{PRESET_MODELS.filter(m => m.provider === "阿里云").map(m => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}</OptGroup>
                    <OptGroup label="智谱">{PRESET_MODELS.filter(m => m.provider === "智谱").map(m => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}</OptGroup>
                    <OptGroup label="BossSoft">{PRESET_MODELS.filter(m => m.provider === "BossSoft").map(m => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}</OptGroup>
                  </Select>
                </Form.Item>
              )}
              <Space style={{ marginTop: 16 }}>
                <Button onClick={() => setCurrentStep(2)}>稍后配置</Button>
                <Button type="primary" loading={configModelLoading} onClick={async () => {
                  try {
                    setConfigModelLoading(true);
                    const values = form.validateFields();
                    message.loading({ content: "正在配置模型...", key: "config" });
                    const configData: any = { container_name: currentContainerName };
                    if (useCustomModel) {
                      configData.provider_id = "myprovider"; configData.provider_name = "BossSoft";
                      configData.api_url = (await values).apiUrl; configData.model = (await values).model; configData.model_name = (await values).model;
                    } else {
                      configData.model = (await values).model;
                      if ((await values).model === "ky-1.2-30b-moe-instruct-1031") {
                        configData.provider_id = BOSS_SOFT_CONFIG.provider_id; configData.provider_name = BOSS_SOFT_CONFIG.provider_name;
                        configData.api_url = BOSS_SOFT_CONFIG.api_url; configData.model_name = "ky-1.2-30b-moe-instruct-1031";
                      }
                    }
                    const response = await fetch("/api/docker/config-model", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(configData) });
                    const result = await response.json();
                    if (response.ok && result.success) message.success({ content: "模型配置成功！", key: "config" });
                    else message.warning({ content: result.detail || "配置失败，可稍后重试", key: "config" });
                    setCurrentStep(2);
                  } catch (e) { message.error("配置失败"); } finally { setConfigModelLoading(false); }
                }}>下一步</Button>
              </Space>
            </>
          )}
          {currentStep === 2 && (
            <>
              <Text strong style={{ display: "block", marginBottom: 8 }}>以下为 CoPaw 内置 Skills，创建项目后可随时在控制台启用/禁用</Text>
              <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid #f0f0f0", borderRadius: 8, padding: "8px 12px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <th style={{ textAlign: "left", padding: "4px 8px 4px 0", color: "#888" }}>Skill</th>
                      <th style={{ textAlign: "left", padding: "4px 8px", color: "#888" }}>说明</th>
                      <th style={{ textAlign: "left", padding: "4px 0 4px 8px", color: "#888" }}>来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>cron</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>定时任务管理（创建/查询/暂停/恢复/删除定时任务）</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="blue">自建</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>file_reader</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>读取与摘要文本类文件（.txt, .md, .json, .csv, .log, .py 等）</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="blue">自建</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>dingtalk_channel_connect</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>辅助完成钉钉频道接入流程</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="blue">自建</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>himalaya</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>通过 CLI 管理邮件（IMAP/SMTP），支持多账户与附件管理</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="green">OpenClaw</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>news</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>从指定新闻站点查询最新新闻，支持政治/财经/社会/国际/科技/体育/娱乐等分类摘要</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="blue">自建</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>pdf</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>PDF 阅读/提取文字表格/合并拆分/旋转/水印/创建/填表/加密解密/OCR 等</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="orange">anthropics/skills</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>docx</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>Word 文档（.docx）创建/阅读/编辑，含目录/页眉页脚/表格/图片/修订与批注</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="orange">anthropics/skills</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>pptx</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>PPT（.pptx）创建/阅读/编辑，含模板/版式/备注与批注</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="orange">anthropics/skills</Tag></td></tr>
                    <tr style={{ borderBottom: "1px solid #f5f5f5" }}><td style={{ padding: "6px 8px 6px 0" }}><Tag>xlsx</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>表格（.xlsx/.xlsm/.csv/.tsv）读取/编辑/创建/格式整理，支持公式与数据分析</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="orange">anthropics/skills</Tag></td></tr>
                    <tr><td style={{ padding: "6px 8px 6px 0" }}><Tag>browser_visible</Tag></td><td style={{ padding: "6px 8px", color: "#444" }}>以可见模式（headed）启动真实浏览器窗口，适用于演示/调试/需要人工参与的场景</td><td style={{ padding: "6px 0 6px 8px" }}><Tag color="blue">自建</Tag></td></tr>
                  </tbody>
                </table>
              </div>
              <Space style={{ marginTop: 16 }}>
                <Button onClick={handleFinish}>稍后配置</Button>
                <Button type="primary" onClick={handleFinish}>完成</Button>
              </Space>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
