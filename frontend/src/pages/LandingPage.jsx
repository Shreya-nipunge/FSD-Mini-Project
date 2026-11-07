import React from 'react';
import { Link } from 'react-router-dom';
import { Map, ListFilter, ShieldAlert, ArrowRight, Upload, Search, Activity, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-blue-500" />
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">CrimeMap</span>
                <span className="hidden sm:block text-xs text-slate-400 font-medium">From Crime Data → Crime Intelligence</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium hover:text-blue-400 transition-colors">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium hover:text-blue-400 transition-colors">How It Works</button>
              <Link to="/get-started" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                Get Started
              </Link>
              <Link to="/get-started" className="flex items-center gap-1 rounded-lg px-4 py-2 border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300">
                Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 min-h-screen flex flex-col justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="flex flex-col items-start text-left z-10 relative mt-10">
              <div className="mb-2 relative">
                {/* Subtle soft glow behind text instead of pill shape */}
                <div className="absolute -inset-8 bg-blue-500/20 blur-[60px] rounded-full -z-10"></div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
                  <span className="block text-white drop-shadow-md">CrimeMap</span>
                </h1>
              </div>
              <p className="mt-4 text-xl md:text-2xl font-medium text-blue-400">
                From Crime Data → Crime Intelligence
              </p>
              <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-lg leading-relaxed">
                Analyze crime patterns, detect hotspots, and explore crime insights using interactive maps and visual analytics.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link 
                  to="/get-started" 
                  className="px-8 py-4 text-lg font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-1 flex justify-center items-center gap-2"
                >
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-8 py-4 text-lg font-medium rounded-xl text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all hover:-translate-y-1 text-center"
                >
                  See How It Works
                </button>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative group z-10 w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <img 
                src="/hero_illustration.png" 
                alt="Officers analyzing crime maps" 
                className="relative rounded-2xl shadow-2xl border border-slate-700/50 w-full object-cover transform transition duration-500 hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent inline-block">Powerful Features</h2>
            <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">Discover the tools designed to provide deep insights into regional crime data.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10 shadow-black/20 group">
              <div className="bg-blue-500/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <Map className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-200">Crime Hotspot Detection</h3>
              <p className="text-slate-400 leading-relaxed">
                Interactive heatmaps highlight high-risk areas globally with precise visualization.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/10 shadow-black/20 group">
              <div className="bg-indigo-500/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                <ListFilter className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-200">Crime Categorization</h3>
              <p className="text-slate-400 leading-relaxed">
                Incidents categorized based on legal classifications for detailed structured analysis.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-purple-500/10 shadow-black/20 group">
              <div className="bg-purple-500/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                <Search className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-200">Advanced Filters</h3>
              <p className="text-slate-400 leading-relaxed">
                Filter crimes by region, gender, and crime type to isolate specific analytical needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 border-y border-slate-800/50 transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100">How CrimeMap Works</h2>
            <p className="mt-4 text-slate-400 text-lg">A simple 4-step process to leverage data for safety.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Step 1</span>
              <h4 className="text-lg font-semibold text-slate-200 mb-2">Upload or Access Crime Data</h4>
              <p className="text-sm text-slate-400">System securely ingests recent incident logs.</p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center mb-6">
                <Map className="w-8 h-8 text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Step 2</span>
              <h4 className="text-lg font-semibold text-slate-200 mb-2">Explore Crime Map</h4>
              <p className="text-sm text-slate-400">Navigate the interactive map visualization.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center mb-6">
                <Activity className="w-8 h-8 text-purple-400" />
              </div>
              <span className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-2">Step 3</span>
              <h4 className="text-lg font-semibold text-slate-200 mb-2">Analyze Patterns</h4>
              <p className="text-sm text-slate-400">Identify hotspots and statistical anomalies.</p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Step 4</span>
              <h4 className="text-lg font-semibold text-slate-200 mb-2">Make Safety Decisions</h4>
              <p className="text-sm text-slate-400">Inform policies and resource allocation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden transparent">
        <div className="absolute inset-0 bg-blue-600/5 border-t border-b border-blue-500/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Explore Crime Insights?</h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Join the platform today to view detailed interactive maps and real-time statistics.
          </p>
          <Link 
            to="/get-started" 
            className="inline-flex items-center px-8 py-4 text-lg font-bold rounded-xl text-slate-900 bg-white hover:bg-slate-100 shadow-xl shadow-white/10 transition-transform hover:scale-105"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/50 transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-slate-500" />
            <div>
              <span className="text-lg font-bold text-slate-300">CrimeMap</span>
              <span className="block text-xs text-slate-600">From Crime Data → Crime Intelligence</span>
            </div>
          </div>
          
          <div className="flex space-x-6">
            <button onClick={() => scrollToSection('features')} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">How It Works</button>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Contact</a>
          </div>

          <p className="text-xs text-slate-600">Built for Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}
