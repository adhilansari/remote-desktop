import { Download, Monitor, Smartphone, ShieldCheck, Coffee, Ghost, Cpu, Server, Globe } from 'lucide-react';

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
            <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <Download size={18} /> Get App
            </a>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="hero">
          <div className="hero-tag">✨ Stop Pretending to Work at Your Desk</div>
          <h1>Unchain Yourself <br /><span>From the Keyboard</span></h1>
          <p>
            Whether you are waiting for an absurdly long video render, pretending to be active on Slack, or just running a code compilation that takes longer than a Lord of the Rings movie—KeenFresh puts your entire PC in your pocket so you can finally go make a sandwich.
          </p>
          <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary">
            <Download size={24} />
            Download for Windows
          </a>
        </header>

        {/* The Problem (Pain Points) */}
        <h2 className="section-title">The "I Can't Leave My Desk" Support Group</h2>
        <div className="grid">
          <div className="card">
            <div className="card-icon red">
              <Cpu size={24} />
            </div>
            <h3>The "Compiling" Excuse</h3>
            <p>Your code is building. You want to lie on the couch, but what if it fails after 15 minutes and needs a single key press? KeenFresh lets you monitor the build from your sofa.</p>
          </div>
          <div className="card">
            <div className="card-icon red">
              <Coffee size={24} />
            </div>
            <h3>The Coffee Run Anxiety</h3>
            <p>You step away to grab coffee, terrified that your boss just sent an urgent message. With KeenFresh, your desktop screen is right on your phone. Problem solved.</p>
          </div>
          <div className="card">
            <div className="card-icon red">
              <Ghost size={24} />
            </div>
            <h3>The Ghost Worker</h3>
            <p>We won't tell anyone if you're using KeenFresh to jiggle your mouse from the bathroom so your Teams status stays "Available." We just build the tools.</p>
          </div>
        </div>

        {/* Highlight Solution */}
        <section className="highlight-section">
          <h2>Your PC, Now in Your Pocket.</h2>
          <p>Traditional remote apps are clunky, require you to install bloatware on your phone, and need a PhD in port-forwarding to set up. KeenFresh is just a beautifully simple Windows app. Scan a QR code, and your phone's browser becomes a secure, low-latency magic wand.</p>
        </section>

        {/* Features */}
        <h2 className="section-title">Why KeenFresh is Actually Good</h2>
        <div className="grid">
          <div className="card">
            <div className="card-icon blue">
              <Smartphone size={24} />
            </div>
            <h3>No Mobile App Required</h3>
            <p>Don't clutter your phone. Just go to <strong>app.keenfresh.com</strong>, scan the QR code on your PC, and boom—you have a 60FPS stream and a full trackpad.</p>
          </div>
          <div className="card">
            <div className="card-icon green">
              <Globe size={24} />
            </div>
            <h3>Global Magic Relay</h3>
            <p>No need to mess with your router. KeenFresh uses a globally distributed AWS & Cloudflare architecture to magically connect you from anywhere on Earth.</p>
          </div>
          <div className="card">
            <div className="card-icon blue">
              <ShieldCheck size={24} />
            </div>
            <h3>Fort Knox Security</h3>
            <p>Your connection is secured via WebRTC. End-to-end encrypted signaling means not even we can see what you are doing. Your secrets are safe.</p>
          </div>
        </div>

        {/* Self Hosting Guide */}
        <h2 className="section-title">For the Nerds (We Love You)</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="card" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div className="card-icon" style={{ flexShrink: 0, width: '80px', height: '80px' }}>
              <Server size={40} />
            </div>
            <div>
              <h3>Want to self-host the Relay Server?</h3>
              <p>Don't trust our cloud? That's fair. KeenFresh is open-source friendly. We provide a <code>docker-compose.yml</code> so you can spin up your own secure signaling server on AWS EC2 or DigitalOcean in 5 minutes. Check out our GitHub!</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <section id="download" className="highlight-section" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(5, 5, 10, 0.5))' }}>
          <h2>Ready to Touch Grass?</h2>
          <p>Download the lightweight Windows client today and finally step away from your monitor.</p>
          <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '1.25rem 3rem', fontSize: '1.25rem' }}>
            <Download size={28} />
            Download KeenFresh Setup.exe
          </a>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#e2e8f0' }}>Created by Adhil Ansari</p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
              <em>(I may not be highly active on social media, but feel free to drop a message!)</em>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="https://github.com/adhilansari" target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc', textDecoration: 'none' }}>GitHub</a>
              <a href="https://www.linkedin.com/in/adhil-ansari-pv/" target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc', textDecoration: 'none' }}>LinkedIn</a>
              <a href="https://www.instagram.com/adhil_ansari_pv/" target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc', textDecoration: 'none' }}>Instagram</a>
              <a href="https://adhilansari.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc', textDecoration: 'none' }}>Portfolio</a>
            </div>
          </div>
          <p>&copy; {new Date().getFullYear()} KeenFresh Remote Architecture. Built for the modern couch potato.</p>
        </footer>

      </div>
    </>
  );
}

export default App;
