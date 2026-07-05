import { Download, Smartphone, ShieldCheck, Coffee, Ghost, Cpu, Server, Globe, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
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
              <Download size={16} /> Get App
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
            <span className="sparkle">✨</span> Stop Pretending to Work at Your Desk
          </motion.div>
          <motion.h1 variants={fadeInUp}>
            Unchain Yourself <br /><span className="gradient-text">From the Keyboard</span>
          </motion.h1>
          <motion.p variants={fadeInUp}>
            Whether you are waiting for an absurdly long video render, pretending to be active on Slack, or just running a code compilation that takes longer than a Lord of the Rings movie—KeenFresh puts your entire PC in your pocket so you can finally go make a sandwich.
          </motion.p>
          <motion.div variants={fadeInUp} className="hero-actions">
            <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary large group">
              <Download size={22} className="group-hover:-translate-y-1 transition-transform" />
              View Releases on GitHub
            </a>
            <a href="#features" className="btn-secondary">
              See How It Works <ArrowRight size={18} />
            </a>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="hero-image-container"
          >
            <div className="hero-app-mockup">
              <div className="mockup-header">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="url-bar">app.keenfresh.com</div>
              </div>
              <div className="mockup-body">
                <div className="screen-content">
                  <div className="stream-overlay">Live 60FPS WebRTC Stream</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.header>

        {/* The Problem (Pain Points) */}
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="section"
          id="features"
        >
          <motion.h2 variants={fadeInUp} className="section-title">The "I Can't Leave My Desk" Support Group</motion.h2>
          <div className="grid">
            <motion.div variants={fadeInUp} className="card interactive">
              <div className="card-icon red">
                <Cpu size={24} />
              </div>
              <h3>The "Compiling" Excuse</h3>
              <p>Your code is building. You want to lie on the couch, but what if it fails after 15 minutes and needs a single key press? KeenFresh lets you monitor the build from your sofa.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive">
              <div className="card-icon amber">
                <Coffee size={24} />
              </div>
              <h3>The Coffee Run Anxiety</h3>
              <p>You step away to grab coffee, terrified that your boss just sent an urgent message. With KeenFresh, your desktop screen is right on your phone. Problem solved.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive">
              <div className="card-icon purple">
                <Ghost size={24} />
              </div>
              <h3>The Ghost Worker</h3>
              <p>We won't tell anyone if you're using KeenFresh to jiggle your mouse from the bathroom so your Teams status stays "Available." We just build the tools.</p>
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
          <h2>Your PC, Now in Your Pocket.</h2>
          <p>Traditional remote apps are clunky, require you to install bloatware on your phone, and need a PhD in port-forwarding to set up. KeenFresh is just a beautifully simple Windows app. Scan a QR code, and your phone's browser becomes a secure, low-latency magic wand.</p>
        </motion.section>

        {/* Features */}
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="section"
        >
          <motion.h2 variants={fadeInUp} className="section-title">Why KeenFresh is Actually Good</motion.h2>
          <div className="grid">
            <motion.div variants={fadeInUp} className="card interactive hover-blue">
              <div className="card-icon blue">
                <Smartphone size={24} />
              </div>
              <h3>No Mobile App Required</h3>
              <p>Don't clutter your phone. Just go to <strong>app.keenfresh.com</strong>, scan the QR code on your PC, and boom—you have a 60FPS stream and a full trackpad.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive hover-green">
              <div className="card-icon green">
                <Globe size={24} />
              </div>
              <h3>Global Magic Relay</h3>
              <p>No need to mess with your router. KeenFresh uses a globally distributed AWS & Cloudflare architecture to magically connect you from anywhere on Earth.</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="card interactive hover-blue">
              <div className="card-icon cyan">
                <ShieldCheck size={24} />
              </div>
              <h3>Fort Knox Security</h3>
              <p>Your connection is secured via WebRTC. End-to-end encrypted signaling means not even we can see what you are doing. Your secrets are safe.</p>
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
          <h2 className="section-title">For the Nerds (We Love You)</h2>
          <div className="grid single-col">
            <div className="card self-host-card">
              <div className="card-icon large-icon">
                <Server size={40} />
              </div>
              <div className="card-content">
                <h3>Want to self-host the Relay Server?</h3>
                <p>Don't trust our cloud? That's fair. KeenFresh is open-source friendly. We provide a <code>docker-compose.yml</code> so you can spin up your own secure signaling server on AWS EC2 or DigitalOcean in 5 minutes. Check out our GitHub!</p>
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
            <h2>Ready to Touch Grass?</h2>
            <p>Download the lightweight Windows client today and finally step away from your monitor.</p>
            <a href="https://github.com/adhilansari/remote-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-primary massive pulse">
              <Download size={28} />
              Get KeenFresh from GitHub
            </a>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <p className="author">Created by Adhil Ansari</p>
            <p className="note">
              <em>(I may not be highly active on social media, but feel free to drop a message!)</em>
            </p>
            <div className="social-links">
              <a href="https://github.com/adhilansari" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/in/adhil-ansari-pv/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://www.instagram.com/adhil_ansari_pv/" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://adhilansari.vercel.app/" target="_blank" rel="noopener noreferrer">Portfolio</a>
            </div>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()} KeenFresh Remote Architecture. Built for the modern couch potato.</p>
        </footer>

      </div>
    </>
  );
}

export default App;
