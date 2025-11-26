import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Zap, Brain, LogIn } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-cyber-darker text-neon-white flex flex-col items-center justify-center p-4">
      <header className="text-center mb-12">
        <h1 className="text-6xl font-extrabold text-neon-purple drop-shadow-neon mb-4">
          NeonFlow AI DJ
        </h1>
        <p className="text-xl text-neon-pink">
          Tu DJ personal impulsado por Inteligencia Artificial y Spotify.
        </p>
      </header>

      <main className="max-w-4xl w-full">
        <section className="grid md:grid-cols-3 gap-8 mb-12">
          <FeatureCard 
            icon={<Music className="w-8 h-8 text-neon-purple" />}
            title="Mezclas Perfectas"
            description="Transiciones suaves y profesionales entre canciones, como un DJ real."
          />
          <FeatureCard 
            icon={<Brain className="w-8 h-8 text-neon-purple" />}
            title="IA Inteligente"
            description="Nuestro algoritmo analiza el BPM y la tonalidad para crear un flujo musical ininterrumpido."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-neon-purple" />}
            title="Autoplay Infinito"
            description="Nunca te quedes sin música. La IA recomienda y añade pistas automáticamente."
          />
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold text-neon-pink mb-6">
            ¿Listo para la mejor experiencia musical?
          </h2>
          <Link 
            to="/login" 
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-lg text-cyber-darker bg-neon-green hover:bg-neon-green/80 transition duration-300 transform hover:scale-105"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Iniciar Sesión con Spotify
          </Link>
        </section>
      </main>

      <footer className="mt-12 text-sm text-neon-white/50">
        <p>&copy; 2025 NeonFlow AI DJ. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-cyber-dark p-6 rounded-xl shadow-2xl border border-neon-purple/30 hover:border-neon-purple transition duration-300">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-neon-white mb-2">{title}</h3>
    <p className="text-neon-white/70">{description}</p>
  </div>
);

export default LandingPage;
