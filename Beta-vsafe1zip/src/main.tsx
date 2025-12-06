import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { UserProvider } from "./state/PlanContext.tsx";
import { AuthProvider } from "./state/AuthContext.tsx";
import { EntriesProvider } from "./state/EntriesContext.tsx";
import { ThemeProvider } from "./state/ThemeContext.tsx";
import "./index.css";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <UserProvider>
      <AuthProvider>
        <EntriesProvider>
          <App />
        </EntriesProvider>
      </AuthProvider>
    </UserProvider>
  </ThemeProvider>
);
  