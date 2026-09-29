import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { RoleProvider } from "../lib/role-context";

export const metadata = {
  title: "Dulce Miel — Gestión",
  description: "Ventas, compras e inventario de Dulce Miel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <RoleProvider>{children}</RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
