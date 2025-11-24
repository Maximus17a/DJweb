import { Music, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AIStatusBadge from '../AI/AIStatusBadge';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="glass border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-neon rounded-lg">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">NeonFlow</h1>
              <p className="text-xs text-gray-500">AI DJ</p>
            </div>
          </div>

          {/* AI Status Badge */}
          <div className="hidden md:block">
            <AIStatusBadge />
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-3 glass px-4 py-2 rounded-lg">
                <div className="w-8 h-8 bg-gradient-neon rounded-full flex items-center justify-center">
                  {user.images?.[0]?.url ? (
                    <img
                      src={user.images[0].url}
                      alt={user.display_name}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-xs text-gray-500">
                    {user.product === 'premium' ? 'Premium' : 'Free'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Status Badge Mobile */}
        <div className="md:hidden mt-4">
          <AIStatusBadge />
        </div>
      </div>
    </nav>
  );
}
