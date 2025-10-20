// src/pages/HomePage.tsx
import React from 'react';
import {
  Sparkles,
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
  BookOpen,
  Brain,
  MessageSquare,
  Zap,
  History,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Twitter as TwitterIcon,
  Linkedin as LinkedinIcon
} from 'lucide-react';

// Import your CSS
import './homepage.css';

// Define platform data
type Platform = {
  name: string;
  icon: React.ReactNode;
  desc: string;
};

type Feature = {
  title: string;
  icon: React.ReactNode;
  desc: string;
};

const HomePage: React.FC = () => {
  // Platform cards
  const platforms: Platform[] = [
    { 
      name: "LinkedIn", 
      icon: <Linkedin className="platform-icon" />, 
      desc: "Professional posts & thought leadership"
    },
    { 
      name: "Facebook", 
      icon: <Facebook className="platform-icon" />, 
      desc: "Community-focused content"
    },
    { 
      name: "Instagram", 
      icon: <Instagram className="platform-icon" />, 
      desc: "Visual & caption content"
    },
    { 
      name: "Twitter/X", 
      icon: <Twitter className="platform-icon" />, 
      desc: "Viral & trending content"
    },
    { 
      name: "Blogs", 
      icon: <BookOpen className="platform-icon" />, 
      desc: "Long-form & SEO content"
    }
  ];

  // AI Features
  const aiFeatures: Feature[] = [
    { 
      title: "AI Content Generation", 
      icon: <Sparkles className="feature-icon" />, 
      desc: "Generate platform-specific content in seconds with AI trained on best practices" 
    },
    { 
      title: "ReAct Agent Analysis", 
      icon: <Brain className="feature-icon" />, 
      desc: "Get intelligent insights about your content with our advanced agent" 
    },
    { 
      title: "AI Chatbot", 
      icon: <MessageSquare className="feature-icon" />, 
      desc: "Chat with an assistant trained on your content history and brand voice" 
    },
    { 
      title: "Content Library", 
      icon: <BookOpen className="feature-icon" />, 
      desc: "Search and manage all your generated posts in one place" 
    },
    { 
      title: "Brand Voice Training", 
      icon: <Zap className="feature-icon" />, 
      desc: "Train the AI on your brand guidelines for personalized content" 
    },
    { 
      title: "Credit System", 
      icon: <Zap className="feature-icon" />, 
      desc: "Flexible credit-based pricing that scales with your usage" 
    }
  ];

  return (
    <div className="homepage">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Sparkles className="logo-icon" />
          <span>inspireAI</span>
        </div>

        <nav>
          <a href="#features">Features</a>
          <a href="#platforms">Platforms</a>
          <a href="#docs">Docs</a>
        </nav>

        <div className="header-actions">
          <button className="sign-in">Sign In</button>
          <button className="get-started">Get Started</button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1>Generate <span>Amazing Content</span> Across All Platforms</h1>
        <p>Create engaging posts for LinkedIn, Facebook, Instagram, Twitter, and blogs in seconds. Powered by AI with intelligent insights from our ReAct agent.</p>
        <div className="hero-buttons">
          <button className="start">Start Creating Free <ArrowRight className="inline" /></button>
          <button className="watch">Watch Demo</button>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="platforms">
        <h2>Generate for Every Platform</h2>
        <p>Create platform-optimized content with AI that understands each channel’s unique requirements</p>

        <div className="platform-grid">
          {platforms.map((platform, i) => (
            <div key={i} className="platform-card">
              <div className="platform-icon-wrapper">{platform.icon}</div>
              <h3>{platform.name}</h3>
              <p>{platform.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Content History */}
      <section className="content-history">
        <div className="container">
          <div className="left">
            <h2>Your Content History</h2>
            <p>Access all your previously generated posts in one searchable library. Track what worked, learn from performance metrics, and refine your content strategy.</p>

            <div className="features-list">
              {[
                { title: "Search & Filter", desc: "Find posts by platform, date, or keywords" },
                { title: "Performance Insights", desc: "See engagement metrics and analytics" },
                { title: "Regenerate & Improve", desc: "Use past posts as inspiration for new content" }
              ].map((item, i) => (
                <div key={i} className="feature">
                  <CheckCircle className="feature-check" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="view-history">View Your History <History className="inline" /></button>
          </div>

          <div className="right">
            <div className="library-item">
              <RefreshCw className="library-icon" />
              <p>Browse your content library</p>
            </div>
            <div className="library-item">
              <RefreshCw className="library-icon" />
              <p>Browse your content library</p>
            </div>
          </div>
        </div>
      </section>

      {/* Powered by Intelligent AI */}
      <section className="ai-features">
        <h2>Powered by Intelligent AI</h2>
        <p>Advanced features to supercharge your content creation workflow</p>

        <div className="features-grid">
          {aiFeatures.map((feature, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon-wrapper">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2>Ready to Create Better Content?</h2>
        <p>Join creators and marketers using inspireAI to generate amazing content across all platforms in seconds</p>
        <button className="start-trial">Start Free Trial <ArrowRight className="inline" /></button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="column">
            <div className="logo">
              <Sparkles className="logo-icon" />
              <span>inspireAI</span>
            </div>
            <p>AI-powered content creation and analysis for everyone</p>
          </div>

          <div className="column">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#api">API</a></li>
            </ul>
          </div>

          <div className="column">
            <h4>Company</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="column">
            <h4>Legal</h4>
            <ul>
              <li><a href="#privacy">Privacy</a></li>
              <li><a href="#terms">Terms</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright">© {new Date().getFullYear()} inspireAI. All rights reserved.</p>
          <div className="social">
            <a href="#"><TwitterIcon /></a>
            <a href="#"><LinkedinIcon /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;