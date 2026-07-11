import { Download, Smartphone, ShieldCheck, Layers, Server, Globe, ArrowRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <>
      <div className="bg-glow"></div>
      <div className="bg-glow secondary"></div>

      <div className="container">
        {/* Navbar */}
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="navbar"
        >
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="KeenFresh Logo" width="40" height="40" style={{ objectFit: 'contain' }} />
            KeenFresh
          </div>
          <div>
            <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary small">
              <Download size={16} /> Get Client
            </a>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <motion.header
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="hero"
        >
          <motion.div variants={fadeInUp} className="hero-tag">
            <span className="sparkle">✨</span> Next-Generation Remote Access
          </motion.div>
          <motion.h1 variants={fadeInUp}>
            Control Your Workspace <br /><span className="gradient-text">From Anywhere.</span>
          </motion.h1>
          <motion.p variants={fadeInUp}>
            Experience zero-latency, WebRTC-powered remote desktop architecture. Control your PC securely from any mobile browser with pixel-perfect accuracy—no mobile application installation required.
          </motion.p>
          <motion.div variants={fadeInUp} className="hero-actions">
            <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary large group">
              <Download size={22} className="group-hover:-translate-y-1 transition-transform" />
              Download LTS Release
            </a>
            <a href="#architecture" className="btn-secondary">
              Explore Architecture <ArrowRight size={18} />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="hero-image-container"
            style={{ position: 'relative', height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center' }}
          >
            <img src="/desktop-nature.png" alt="KeenFresh Desktop Concept" style={{ width: '100%', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 1, position: 'relative' }} />
            <img src="/mobile-nature.png" alt="KeenFresh Mobile Concept" style={{ position: 'absolute', width: '32%', bottom: '-5%', right: '-5%', borderRadius: '20px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 2 }} />
          </motion.div>
        </motion.header>

        {/* Use Cases */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="section"
          id="architecture"
        >
          <motion.h2 variants={fadeInUp} className="section-title">Engineered for Professional Workflows</motion.h2>
          <div className="bento-grid">
            <motion.div variants={fadeInUp} className="card interactive">
              <div className="card-icon blue">
                <Activity size={24} />
              </div>
              <h3>Process Monitoring</h3>
              <p>Monitor complex data pipelines, lengthy code compilations, or high-fidelity video renders directly from your tablet or mobile device without remaining tethered to your desk.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive">
              <div className="card-icon cyan">
                <ShieldCheck size={24} />
              </div>
              <h3>Instant IT Administration</h3>
              <p>Provide immediate technical support by connecting to any authenticated KeenFresh host via a 9-digit secure pairing code. No account creation required for clients.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive">
              <div className="card-icon purple">
                <Server size={24} />
              </div>
              <h3>Server & Media Management</h3>
              <p>Manage headless servers, homelabs, or local media centers from the comfort of your living room using KeenFresh's intelligent virtual trackpad interface.</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Highlight Solution */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="highlight-section glow-border"
        >
          <h2>A Modern Approach to Remote Desktop.</h2>
          <p>Traditional remote applications are burdened by commercial bloatware and complex network configurations. KeenFresh offers a lightweight, open-source architecture that maps your mobile screen to your desktop monitor pixel-for-pixel with zero latency.</p>
        </motion.section>

        {/* Features */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="section"
        >
          <motion.h2 variants={fadeInUp} className="section-title">Enterprise-Grade Architecture</motion.h2>
          <div className="bento-grid">
            <motion.div variants={fadeInUp} className="card interactive hover-blue">
              <div className="card-icon blue">
                <Smartphone size={24} />
              </div>
              <h3>Zero-Install Mobile Client</h3>
              <p>Connect seamlessly through <strong>app.keenfresh.com</strong>. No mobile app installations or updates required—just a lightning-fast browser experience.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive hover-green">
              <div className="card-icon green">
                <Globe size={24} />
              </div>
              <h3>Global Matchmaking Relay</h3>
              <p>Avoid complex firewall configurations. KeenFresh utilizes an optimized WebRTC signaling server to establish direct peer-to-peer tunnels worldwide.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive hover-blue">
              <div className="card-icon cyan">
                <ShieldCheck size={24} />
              </div>
              <h3>End-to-End Encryption</h3>
              <p>All video and peripheral data is transmitted over secure DTLS/SRTP WebRTC protocols, ensuring your workstation remains impenetrable.</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Self Hosting Guide */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section"
        >
          <h2 className="section-title">Open Infrastructure</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '800px', margin: '0 auto' }}>
            <div className="card self-host-card">
              <div className="card-icon large-icon">
                <Layers size={40} />
              </div>
              <div className="card-content">
                <h3>Self-Host the Signaling Server</h3>
                <p>For organizations with strict compliance requirements, the entire KeenFresh signaling infrastructure is open-source. Utilize our provided <code>docker-compose.yml</code> to deploy your private matchmaking server on AWS or DigitalOcean within minutes.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          id="download"
          className="highlight-section cta-section"
        >
          <div className="cta-content">
            <h2>Experience Low-Latency Control</h2>
            <p>Download the lightweight Windows client today and elevate your remote workflow.</p>
            <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary massive pulse">
              <Download size={28} />
              Download KeenFresh Desktop
            </a>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <p className="author">Designed & Developed by Adhil Ansari</p>
            <p className="note">
              <em>(Open Source Remote Desktop Architecture)</em>
            </p>
            <div className="social-links">
              <a href="https://github.com/adhilansari" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/in/adhil-ansari-pv/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://adhilansari.vercel.app/" target="_blank" rel="noopener noreferrer">Portfolio</a>
            </div>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()} KeenFresh. All rights reserved.</p>
        </footer>

      </div>
    </>
  );
}

export default App;
