"use client";

import * as React from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { appTheme } from "./theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
