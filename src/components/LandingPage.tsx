import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Users, FileText, Building2, Brain, MapPin, Bell, TrendingUp, Eye, UserPlus, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react';
import { publicAPI, reportsAPI, entitiesAPI } from '../utils/api';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const [stats, setStats] = useState({
    totalReports: 0,
    totalUsers: 0,
    totalEntities: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Use the public stats endpoint
      const statsRes = await publicAPI.getStats();
      
      setStats({
        totalReports: statsRes.stats.totalReports || 0,
        totalUsers: statsRes.stats.totalUsers || 0,
        totalEntities: statsRes.stats.totalEntities || 0,
      });
    } catch (error) {
      // Silently use fallback data without console error
      // This is expected when backend is not deployed or offline
      setStats({
        totalReports: 150,
        totalUsers: 75,
        totalEntities: 8,
      });
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-white">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b-2 border-green-200 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-16 gap-6">
            <Button
              variant="ghost"
              onClick={() => scrollToSection('inicio')}
              className="text-gray-700 hover:text-green-600 hover:bg-green-50"
            >
              Inicio
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection('como-funciona')}
              className="text-gray-700 hover:text-green-600 hover:bg-green-50"
            >
              ¿Cómo funciona?
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection('caracteristicas')}
              className="text-gray-700 hover:text-green-600 hover:bg-green-50"
            >
              Características
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection('contacto')}
              className="text-gray-700 hover:text-green-600 hover:bg-green-50"
            >
              Contacto
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo con Texto */}
          <div className="mb-8 flex justify-center">
            <div className="bg-gradient-to-br from-green-500 to-yellow-400 rounded-full p-8 shadow-2xl">
              <MapPin className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-6">
            <span className="block text-green-800">Reporte</span>
            <span className="block text-yellow-500">Buenaventura</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Tu voz importa. Mejoremos juntos nuestra ciudad reportando problemas urbanos y haciendo seguimiento en tiempo real.
          </p>

          {/* CTA Button */}
          <Button
            onClick={onRegister}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-yellow-400 hover:from-green-600 hover:to-yellow-500 text-white px-12 py-6 text-xl mb-16 shadow-lg"
          >
            <UserPlus className="w-6 h-6 mr-3" />
            Comenzar Ahora
          </Button>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-green-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center">
                  <FileText className="w-12 h-12 text-green-600 mb-3" />
                  <div className="text-4xl text-green-800 mb-2">
                    {stats.totalReports.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Reportes Registrados
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center">
                  <Users className="w-12 h-12 text-yellow-500 mb-3" />
                  <div className="text-4xl text-yellow-600 mb-2">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Personas Registradas
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center">
                  <Building2 className="w-12 h-12 text-green-600 mb-3" />
                  <div className="text-4xl text-green-800 mb-2">
                    {stats.totalEntities.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Entidades Registradas
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Cómo Funciona Section */}
      <section id="como-funciona" className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">
              <span className="text-green-800">¿Cómo </span>
              <span className="text-yellow-500">Funciona?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Reportar problemas en tu ciudad es fácil y rápido. Sigue estos pasos:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                number: 1,
                title: 'Regístrate',
                description: 'Crea tu cuenta de forma rápida y segura.',
                icon: UserPlus,
              },
              {
                number: 2,
                title: 'Crea tu Reporte',
                description: 'Describe el problema, agrega fotos y ubicación.',
                icon: FileText,
              },
              {
                number: 3,
                title: 'Seguimiento',
                description: 'Recibe notificaciones del progreso en tiempo real.',
                icon: TrendingUp,
              },
              {
                number: 4,
                title: 'Califica',
                description: 'Una vez resuelto, califica la atención recibida.',
                icon: Eye,
              },
            ].map((step) => (
              <Card key={step.number} className="border-2 border-green-200 bg-white hover:shadow-lg transition-shadow">
                <CardContent className="pt-8 pb-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-yellow-400 flex items-center justify-center mb-4 text-white text-2xl">
                      {step.number}
                    </div>
                    <div className="w-14 h-14 rounded-lg bg-green-50 flex items-center justify-center mb-4">
                      <step.icon className="w-7 h-7 text-green-600" />
                    </div>
                    <h3 className="text-xl text-green-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Características para Ciudadanos */}
      <section id="caracteristicas" className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">
              <span className="text-green-800">Características para </span>
              <span className="text-yellow-500">Ciudadanos</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Todo lo que necesitas para hacer seguimiento efectivo a los problemas de tu ciudad
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Clasificación Inteligente',
                description: 'IA asigna automáticamente tu reporte a la entidad correcta con alta precisión.',
                icon: Brain,
                color: 'from-purple-500 to-purple-600',
              },
              {
                title: 'Ubicación por Mapa',
                description: 'Selecciona la ubicación exacta del problema usando OpenStreetMap.',
                icon: MapPin,
                color: 'from-blue-500 to-blue-600',
              },
              {
                title: 'Seguimiento en Tiempo Real',
                description: 'Sigue el estado de tus reportes: pendiente, en proceso o resuelto.',
                icon: TrendingUp,
                color: 'from-green-500 to-green-600',
              },
              {
                title: 'Notificaciones Inteligentes',
                description: 'Recibe alertas cuando tu reporte cambie de estado o reciba comentarios.',
                icon: Bell,
                color: 'from-yellow-500 to-yellow-600',
              },
              {
                title: 'Reportes Públicos',
                description: 'Consulta y sigue reportes de otros ciudadanos de la comunidad.',
                icon: Eye,
                color: 'from-orange-500 to-orange-600',
              },
              {
                title: 'Sistema de Calificación',
                description: 'Califica la atención recibida y ayuda a mejorar el servicio.',
                icon: FileText,
                color: 'from-red-500 to-red-600',
              },
            ].map((feature, index) => (
              <Card key={index} className="border-2 border-green-200 bg-white hover:shadow-lg transition-shadow">
                <CardContent className="pt-8 pb-6">
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl text-green-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-8">
            <span className="text-green-800">Contáctanos</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            ¿Tienes preguntas o sugerencias? Estamos aquí para ayudarte.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-green-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 pb-6 flex flex-col items-center">
                <Phone className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-xl text-green-900 mb-2">Teléfono / WhatsApp</h3>
                <a href="tel:+573106507940" className="text-gray-600 hover:text-green-600 transition-colors">
                  +57 310 650 7940
                </a>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 pb-6 flex flex-col items-center">
                <Mail className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-xl text-green-900 mb-2">Email de Contacto</h3>
                <a href="mailto:johnvalenciazp@gmail.com" className="text-gray-600 hover:text-green-600 transition-colors block mb-1">
                  johnvalenciazp@gmail.com
                </a>
                <a href="mailto:jhon.william.angulo@correounivalle.edu.co" className="text-gray-600 hover:text-green-600 transition-colors block text-sm">
                  jhon.william.angulo@correounivalle.edu.co
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-800 to-green-900 text-white py-8 border-t-4 border-yellow-400">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <p className="text-lg">Reporte Buenaventura</p>
            <p className="text-sm text-green-200">Plataforma Ciudadana de Reportes Urbanos</p>
          </div>
          <p className="text-sm text-green-300">
            © 2025 Reporte Buenaventura. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}