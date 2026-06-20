import React from 'react';
import { Download, Monitor, Smartphone, ShieldCheck, Clock, Zap, Server, Globe } from 'lucide-react';

function App() {
  return (
    <>
      <div className="bg-glow"></div>
      <div className="container">
        
        {/* Navbar */}
        <nav className="navbar">
          <div className="logo">
            <Monitor size={28} color="#a5b4fc" />
            KeenFresh
          </div>
          <div>
            <a href="#download" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <Download size={18} /> Get App
            </a>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="hero">
          <div className="hero-tag">✨ The Ultimate Remote Controller</div>
          <h1>Unchain Yourself <br /><span>From Your Desk</span></h1>
          <p>
            Whether you are a developer compiling huge codebases, a professional rendering 4K video, or just someone who hates sitting hunched over a laptop—KeenFresh gives you complete control of your Windows PC from anywhere in the world using just your phone.
          </p>
          <a href="#download" className="btn-primary">
            <Download size={24} />
            Download for Windows
          </a>
        </header>

        {/* The Problem (Pain Points) */}
        <h2 className="section-title">The Desktop Dilemma</h2>
        <div className="grid">
          <div className="card">
            <div className="card-icon red">
              <Clock size={24} />
            </div>
            <h3>Waiting on Tasks</h3>
            <p>You start a massive software build, a database migration, or a video render. You are glued to your chair just waiting for it to finish so you can check for errors.</p>
          </div>
          <div className="card">
            <div className="card-icon red">
              <Zap size={24} />
            </div>
            <h3>Interrupting Life</h3>
            <p>You want to grab a coffee, make lunch, or lay on the couch, but you are terrified of missing a critical notification, email, or a sudden crash screen on your desktop.</p>
          </div>
          <div className="card">
            <div className="card-icon red">
              <Monitor size={24} />
            </div>
            <h3>Clunky Remote Apps</h3>
            <p>Traditional remote desktop apps are slow, pixelated, require complicated port-forwarding, and drain your mobile battery. You just want a simple, beautiful controller.</p>
          </div>
        </div>

        {/* Highlight Solution */}
        <section className="highlight-section">
          <h2>Your PC, Now in Your Pocket.</h2>
          <p>KeenFresh is a lightning-fast SaaS platform that securely pairs your Windows Desktop to your Smartphone browser. No apps to install on your phone. Just scan a QR code, and you have instant, low-latency control.</p>
        </section>

        {/* Features */}
        <h2 className="section-title">Why KeenFresh?</h2>
        <div className="grid">
          <div className="card">
            <div className="card-icon blue">
              <Smartphone size={24} />
            </div>
            <h3>Web-Based Mobile App</h3>
            <p>Don't clutter your phone with more apps. Just go to <strong>app.keenfresh.com</strong>, scan the QR code on your desktop, and instantly turn your phone into a secure trackpad and keyboard.</p>
          </div>
          <div className="card">
            <div className="card-icon green">
              <Globe size={24} />
            </div>
            <h3>Global Cloud Relay</h3>
            <p>Forget messy local Wi-Fi requirements or firewall nightmares. KeenFresh uses a globally distributed AWS & Cloudflare architecture to connect you from anywhere with an internet connection.</p>
          </div>
          <div className="card">
            <div className="card-icon blue">
              <ShieldCheck size={24} />
            </div>
            <h3>Enterprise Security</h3>
            <p>Your connection is secured via WebRTC and WSS (WebSocket Secure). End-to-end encrypted signaling means nobody can intercept your keystrokes or mouse movements.</p>
          </div>
        </div>

        {/* Self Hosting Guide */}
        <h2 className="section-title">For Developers</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="card" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div className="card-icon" style={{ flexShrink: 0, width: '80px', height: '80px' }}>
              <Server size={40} />
            </div>
            <div>
              <h3>Want to self-host the Relay Server?</h3>
              <p>KeenFresh is open-source friendly. We provide a completely containerized <code>docker-compose.yml</code> so you can spin up your own secure signaling server on AWS EC2 or DigitalOcean in under 5 minutes. Check out our GitHub repository for the full Cloudflare and AWS deployment guide!</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <section id="download" className="highlight-section" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(5, 5, 10, 0.5))' }}>
          <h2>Ready to Step Away?</h2>
          <p>Download the lightweight Windows client today and experience true freedom.</p>
          <button className="btn-primary" style={{ padding: '1.25rem 3rem', fontSize: '1.25rem' }}>
            <Download size={28} />
            Download KeenFresh Setup.exe
          </button>
        </section>

        {/* Footer */}
        <footer>
          <p>&copy; {new Date().getFullYear()} KeenFresh Remote Architecture. Built for the modern professional.</p>
        </footer>

      </div>
    </>
  );
}

export default App;
