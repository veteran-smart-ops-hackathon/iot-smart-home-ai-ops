import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from '@/types';
import { sound } from '@/lib/sound';

export const DEFAULT_HOMEOWNER_PROFILE: UserProfile = {
  id: 'user-homeowner-01',
  name: 'Nguyễn Văn An',
  email: 'chuhogiadinh@smarthome.vn',
  role: 'homeowner',
  title: 'Chủ Hộ (Gia Đình)',
  description: 'Giám sát tiện nghi, an toàn, sức khỏe, hóa đơn điện & phê duyệt đề xuất AI',
};

export const DEFAULT_TECHNICIAN_PROFILE: UserProfile = {
  id: 'user-tech-01',
  name: 'Kỹ Sư Trưởng Trần Minh Quân',
  email: 'engineer.ops@smarthome.vn',
  role: 'technician',
  title: 'Kỹ Thuật Viên Vận Hành (L4 Ops)',
  description: 'Giám sát luồng MQTT thô, StateGraph Multi-Agent, Qdrant SOP & Khép vòng L5',
};

interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  login: (role: UserRole, customEmail?: string, customName?: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUserEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = 'aegis_auth_role';
const PROFILE_STORAGE_KEY = 'aegis_auth_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
      if (saved === 'technician' || saved === 'homeowner') return saved;
    }
    return 'homeowner';
  });

  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (savedProfile) {
        try {
          return JSON.parse(savedProfile);
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_HOMEOWNER_PROFILE;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(user));
    }
  }, [role, user]);

  const login = (newRole: UserRole, customEmail?: string, customName?: string) => {
    sound.playSuccess();
    const base = newRole === 'homeowner' ? DEFAULT_HOMEOWNER_PROFILE : DEFAULT_TECHNICIAN_PROFILE;
    const updated: UserProfile = {
      ...base,
      name: customName || base.name,
      email: customEmail || base.email,
    };
    setRole(newRole);
    setUser(updated);
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    sound.playClick();
    setIsAuthenticated(false);
    setIsLoginModalOpen(true);
  };

  const switchRole = (newRole: UserRole) => {
    sound.playClick();
    if (newRole === role) return;
    const nextProfile = newRole === 'homeowner' ? DEFAULT_HOMEOWNER_PROFILE : DEFAULT_TECHNICIAN_PROFILE;
    setRole(newRole);
    setUser(nextProfile);
  };

  const updateUserEmail = (email: string) => {
    setUser((prev) => ({
      ...prev,
      email,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoginModalOpen,
        setIsLoginModalOpen,
        login,
        logout,
        switchRole,
        updateUserEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
