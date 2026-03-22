import { createGlobalStyle } from "antd-style";
import { ConfigProvider, bailianTheme } from "@agentscope-ai/design";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import jaJP from "antd/locale/ja_JP";
import ruRU from "antd/locale/ru_RU";
import type { Locale } from "antd/es/locale";
import { theme as antdTheme } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import "dayjs/locale/ja";
import "dayjs/locale/ru";
import MainLayout from "./layouts/MainLayout";
import ProjectsPage from "./pages/Projects";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import LoginPage from "./pages/Login";
// import { authApi } from "./api/modules/auth";
// import { getApiUrl, getApiToken, clearAuthToken } from "./api/config";
import "./styles/layout.css";
import "./styles/form-override.css";

const antdLocaleMap: Record<string, Locale> = {
  zh: zhCN,
  en: enUS,
  ja: jaJP,
  ru: ruRU,
};

const dayjsLocaleMap: Record<string, string> = {
  zh: "zh-cn",
  en: "en",
  ja: "ja",
  ru: "ru",
};

const GlobalStyle = createGlobalStyle`
* {
  margin: 0;
  box-sizing: border-box;
}
`;

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "auth-required" | "ok">(
    "loading",
  );
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 检查本地存储的登录状态（套壳登录）
    const user = localStorage.getItem("copaw_user");
    if (user) {
      setStatus("ok");
      // 如果访问根路径，跳转到项目列表
      if (location.pathname === "/") {
        navigate("/projects", { replace: true });
      }
    } else {
      setStatus("auth-required");
    }
  }, [location.pathname, navigate]);

  if (status === "loading") return null;
  if (status === "auth-required")
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
        replace
      />
    );
  return <>{children}</>;
}

function getRouterBasename(pathname: string): string | undefined {
  return /^\/console(?:\/|$)/.test(pathname) ? "/console" : undefined;
}

function AppInner() {
  const basename = getRouterBasename(window.location.pathname);
  const { i18n } = useTranslation();
  const { isDark } = useTheme();
  const lang = i18n.resolvedLanguage || i18n.language || "en";
  const [antdLocale, setAntdLocale] = useState<Locale>(
    antdLocaleMap[lang] ?? enUS,
  );

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const shortLng = lng.split("-")[0];
      setAntdLocale(antdLocaleMap[shortLng] ?? enUS);
      dayjs.locale(dayjsLocaleMap[shortLng] ?? "en");
    };

    // Set initial dayjs locale
    dayjs.locale(dayjsLocaleMap[lang.split("-")[0]] ?? "en");

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  return (
    <BrowserRouter basename={basename}>
      <GlobalStyle />
      <ConfigProvider
        {...bailianTheme}
        prefix="copaw"
        prefixCls="copaw"
        locale={antdLocale}
        theme={{
          ...(bailianTheme as any)?.theme,
          algorithm: isDark
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <MainLayout />
              </AuthGuard>
            }
          />
        </Routes>
      </ConfigProvider>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
