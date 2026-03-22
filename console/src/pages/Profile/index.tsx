import { Card, Typography } from "antd";

const { Title, Text } = Typography;

export default function ProfilePage() {
  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={2}>🎉 恭喜加菜单成功！</Title>
        <Text>这是你的个人中心页面，内容待定...</Text>
      </Card>
    </div>
  );
}