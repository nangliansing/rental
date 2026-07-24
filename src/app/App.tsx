import { RouterProvider } from "react-router-dom"

import { AuthProvider } from "@/features/auth/AuthProvider"
import { NotificationProvider } from "@/features/notifications"

import { router } from "./router"

export function App() {
    return (
        <AuthProvider>
            <NotificationProvider>
                <RouterProvider router={router} />
            </NotificationProvider>
        </AuthProvider>
    )
}
