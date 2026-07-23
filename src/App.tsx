import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { HydrationGate } from '@/components/auth/HydrationGate'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { EmployeeLayout } from '@/components/layout/EmployeeLayout'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { DesignationsPage } from '@/pages/admin/DesignationsPage'
import { DepartmentsPage } from '@/pages/admin/DepartmentsPage'
import { ClientsPage } from '@/pages/admin/ClientsPage'
import { EmployeesPage } from '@/pages/admin/EmployeesPage'
import { ProjectsPage } from '@/pages/admin/ProjectsPage'
import { AdminProjectBoardPage } from '@/pages/admin/AdminProjectBoardPage'
import { MyProjectsPage } from '@/pages/employee/MyProjectsPage'
import { ProjectBoardPage } from '@/pages/employee/ProjectBoardPage'
import { ClientProjectsPage } from '@/pages/client/ClientProjectsPage'
import { ClientProjectBoardPage } from '@/pages/client/ClientProjectBoardPage'
import { MyAssignedTasksPage } from '@/pages/tasks/MyAssignedTasksPage'
import { PersonalTodosPage } from '@/pages/todos/PersonalTodosPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationGate>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="designations" element={<DesignationsPage />} />
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="todos" element={<PersonalTodosPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:projectId" element={<AdminProjectBoardPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute role="employee" />}>
              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<MyProjectsPage />} />
                <Route path="tasks" element={<MyAssignedTasksPage />} />
                <Route path="todos" element={<PersonalTodosPage />} />
                <Route path="projects/:projectId" element={<ProjectBoardPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute role="client" />}>
              <Route path="/client" element={<ClientLayout />}>
                <Route index element={<ClientProjectsPage />} />
                <Route path="tasks" element={<MyAssignedTasksPage />} />
                <Route path="projects/:projectId" element={<ClientProjectBoardPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </HydrationGate>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
