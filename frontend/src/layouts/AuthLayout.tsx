import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-slate-900 dark:to-slate-800 px-4 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400">
            PharmaSaaS
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Pharmacy & Shop Management Platform
          </p>
        </div>
        <div className="card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
