import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/apiClient";

const AuthContext = createContext(null);

const DEFAULT_INDUSTRY = "retail";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, obj=user
  const [industry, setIndustry] = useState(
    localStorage.getItem("industry") || DEFAULT_INDUSTRY,
  );
  const [businessPerms, setBusinessPerms] = useState({
    modules: {},
    role_permissions: {},
    allowed_industries: [],
  });

  const loadPerms = useCallback(async () => {
    try {
      const { data } = await api.get("/permissions");
      const perms = data || {};
      setBusinessPerms({
        modules: perms.modules || {},
        role_permissions: perms.role_permissions || {},
        allowed_industries: perms.allowed_industries || [],
      });
      // Force industry into the tenant's allow-list.
      const allowed = perms.allowed_industries || [];
      if (allowed.length > 0) {
        const cur = localStorage.getItem("industry");
        if (!cur || !allowed.includes(cur)) {
          const next = allowed[0];
          setIndustry(next);
          localStorage.setItem("industry", next);
        }
      }
    } catch {
      setBusinessPerms({ modules: {}, role_permissions: {}, allowed_industries: [] });
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      await loadPerms();
    } catch {
      setUser(false);
    }
  }, [loadPerms]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data?.token) localStorage.setItem("token", data.token);
    setUser(data);
    await loadPerms();
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data?.token) localStorage.setItem("token", data.token);
    setUser(data);
    await loadPerms();
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch { /* ignore */ }
    localStorage.removeItem("token");
    setUser(false);
    setBusinessPerms({ modules: {}, role_permissions: {}, allowed_industries: [] });
  };

  const impersonateTenant = async (tenantId) => {
    const { data } = await api.post(`/platform/tenants/${tenantId}/impersonate`);
    if (data?.token) localStorage.setItem("token", data.token);
    await bootstrap();
    return data;
  };

  const stopImpersonation = async () => {
    const { data } = await api.post("/platform/stop-impersonation");
    if (data?.token) localStorage.setItem("token", data.token);
    await bootstrap();
    return data;
  };

  const changeIndustry = (i) => {
    setIndustry(i);
    localStorage.setItem("industry", i);
  };

  return (
    <AuthContext.Provider
      value={{
        user, industry, businessPerms,
        login, register, logout, changeIndustry,
        impersonateTenant, stopImpersonation,
        formatApiError, refresh: bootstrap, refreshPerms: loadPerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
