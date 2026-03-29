import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WorkbenchPage } from "../features/workbench/workbench-page";
import { WorkbenchProvider } from "../features/workbench/workbench-provider";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <WorkbenchProvider>
        <WorkbenchPage />
      </WorkbenchProvider>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
