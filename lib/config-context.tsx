"use client";

import { createContext, useContext, useState } from "react";
import type { Config } from "@/lib/types";

type Ctx = {
  config: Config | null;
  setConfig: (c: Config) => void;
};

const ConfigContext = createContext<Ctx>({ config: null, setConfig: () => {} });

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useSharedConfig() {
  return useContext(ConfigContext);
}
