import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext(null);

const parseStoredUser = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem("dineforUser") || "null"
    );

    if (!value?.token) return null;

    if (
      value.authProvider === "local" &&
      value.isEmailVerified === false
    ) {
      localStorage.removeItem("dineforUser");
      return null;
    }

    return value;
  } catch {
    localStorage.removeItem("dineforUser");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(parseStoredUser());
    setLoading(false);
  }, []);

  const login = (userData) => {
    if (!userData?.token) {
      throw new Error("Authentication token is missing.");
    }

    if (
      userData.authProvider === "local" &&
      userData.isEmailVerified !== true
    ) {
      throw new Error(
        "Email verification is required before login."
      );
    }

    setUser(userData);
    localStorage.setItem(
      "dineforUser",
      JSON.stringify(userData)
    );
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("dineforUser");
  };

  const updateUser = (userData) => {
    const updated = {
      ...(user || {}),
      ...userData,
    };

    setUser(updated);
    localStorage.setItem(
      "dineforUser",
      JSON.stringify(updated)
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isLoggedIn: Boolean(user),
        token: user?.token,
        role: user?.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};

export default AuthContext;
