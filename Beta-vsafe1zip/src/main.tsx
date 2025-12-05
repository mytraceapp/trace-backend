import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { UserProvider } from "./state/PlanContext.tsx";
import { EntriesProvider } from "./state/EntriesContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <EntriesProvider>
      <App />
    </EntriesProvider>
  </UserProvider>
);
  