"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import userService from "@/services/userService";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    userService.getUserDetails().then((res) => setUser(res.data)).catch(() => {});
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
