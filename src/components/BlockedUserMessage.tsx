import { Button } from './ui/button';
import { Mail, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BlockedUserMessageProps {
  suspendedUntil?: string;
}

export function BlockedUserMessage({ suspendedUntil }: BlockedUserMessageProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState(false);

  useEffect(() => {
    if (suspendedUntil) {
      const suspendDate = new Date(suspendedUntil);
      const now = new Date();
      
      if (suspendDate > now) {
        setIsTemporary(true);
        
        // Actualizar contador cada segundo
        const interval = setInterval(() => {
          const now = new Date();
          const diff = suspendDate.getTime() - now.getTime();
          
          if (diff <= 0) {
            setTimeRemaining('00:00');
            clearInterval(interval);
            // Recargar la página cuando expire
            window.location.reload();
            return;
          }
          
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [suspendedUntil]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Fondo degradado animado verde-amarillo como en las imágenes */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-yellow-400 to-green-500 animate-gradient-shift"></div>
      
      {/* Patrón de fondo estilo matrix */}
      <div className="absolute inset-0 opacity-10">
        <div className="matrix-rain"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-xl mx-4">
        {/* Card oscura semi-transparente */}
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-800 overflow-hidden">
          
          {/* Sección del ícono */}
          <div className="flex items-center justify-center py-12">
            {/* Ícono de candado prohibido - igual que en la imagen */}
            <div className="relative">
              {/* Círculo rojo */}
              <div className="w-40 h-40 rounded-full bg-red-600 flex items-center justify-center shadow-2xl">
                {/* Candado */}
                <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1C8.676 1 6 3.676 6 7v2H5c-1.104 0-2 .896-2 2v10c0 1.104.896 2 2 2h14c1.104 0 2-.896 2-2V11c0-1.104-.896-2-2-2h-1V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm-1 10c0-.552.448-1 1-1s1 .448 1 1v3c0 .552-.448 1-1 1s-1-.448-1-1v-3z"/>
                </svg>
              </div>
              {/* Círculo de prohibición superpuesto */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-48 h-48 text-red-600" fill="none" stroke="currentColor" strokeWidth="10" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
            </div>
          </div>

          {/* Título principal en MAYÚSCULAS ROJO */}
          <div className="px-8 pb-4 text-center">
            <h1 className="text-4xl md:text-5xl text-red-500 uppercase tracking-wider drop-shadow-lg" style={{ letterSpacing: '0.1em' }}>
              USUARIO BLOQUEADO
            </h1>
          </div>

          {/* Mensaje de suspensión temporal en AMARILLO */}
          {isTemporary && (
            <div className="px-8 pb-6 text-center">
              <p className="text-yellow-400 text-xl md:text-2xl">
                Su cuenta ha sido suspendida temporalmente.
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 h-auto text-lg uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 w-full sm:w-auto"
              onClick={() => window.location.href = 'mailto:johnvalenciazp@gmail.com'}
            >
              <Mail className="w-5 h-5 mr-2" />
              CONTACTAR SOPORTE
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-6 h-auto text-lg uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 w-full sm:w-auto"
              onClick={() => window.open('https://wa.me/573106507940', '_blank')}
            >
              <Info className="w-5 h-5 mr-2" />
              MÁS INFORMACIÓN
            </Button>
          </div>

          {/* Temporizador para usuarios suspendidos */}
          {isTemporary && timeRemaining && (
            <div className="px-8 pb-8">
              <div className="bg-transparent text-center space-y-2">
                <p className="text-white text-xl tracking-wider">Tiempo de espera:</p>
                <div className="text-7xl md:text-8xl text-white font-mono tracking-wider drop-shadow-2xl" style={{ textShadow: '0 0 30px rgba(255, 255, 255, 0.5)' }}>
                  {timeRemaining}
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de pie */}
          {!isTemporary && (
            <div className="px-8 pb-8 text-center">
              <p className="text-gray-400 text-base">
                Por favor contacte al administrador para resolver esta situación.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease-in-out infinite;
        }
        
        @keyframes matrix-fall {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        
        .matrix-rain {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 30px 30px;
          animation: matrix-fall 25s linear infinite;
          width: 100%;
          height: 200%;
        }
      `}</style>
    </div>
  );
}
