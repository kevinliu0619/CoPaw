import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Typography, message } from "antd";

const { Title } = Typography;

// 调用本地后端代理接口（解决 CORS 问题）
const LOGIN_API = "/api/auth/external-login";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    console.log("开始登录...", values.username);
    
    try {
      const response = await fetch(LOGIN_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      console.log("响应状态:", response.status);
      const data = await response.json();
      console.log("登录响应:", data);

      if (response.ok && data.code === 0) {
        // 登录成功，保存用户信息到 localStorage
        localStorage.setItem("copaw_user", JSON.stringify({
          username: values.username,
          token: data.data?.token || "",
          loginTime: Date.now()
        }));
        message.success("登录成功！");
        navigate("/projects");
      } else {
        // 登录失败
        message.error(data.message || data.detail || "用户名或密码错误");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("登录请求失败:", error);
      message.error("登录请求失败: " + error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f5f5"
    }}>
      <Card style={{ width: 400, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3}>🐱 CoPaw 管理后台</Title>
        </div>
        
        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix="👤" placeholder="请输入用户名" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password prefix="🔒" placeholder="请输入密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}