<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RedBut.tech - Revolutionizing Restaurant Operations</title>
    <meta name="description" content="Transform your restaurant with AI-powered analytics, real-time customer engagement, and seamless operational management.">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <style>
        :root {
            --primary-red: #dc2626;
            --primary-red-light: #ef4444;
            --primary-red-dark: #b91c1c;
            --red-gradient: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            --red-light-gradient: linear-gradient(135deg, #fca5a5 0%, #dc2626 100%);
            --bg-white: #ffffff;
            --bg-light: #fafafa;
            --bg-red-subtle: #fef2f2;
            --text-black: #000000;
            --text-gray: #374151;
            --text-light-gray: #6b7280;
            --border-light: #e5e7eb;
            --shadow-red: rgba(220, 38, 38, 0.3);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-white);
            color: var(--text-black);
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Splash Screen */
        .splash-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #ffffff 0%, #fef2f2 50%, #ffffff 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: all 0.8s ease-in-out;
        }

        .splash-screen.fade-out {
            opacity: 0;
            transform: scale(1.1);
            pointer-events: none;
        }

        .splash-logo {
            font-size: 4rem;
            font-weight: 800;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 20px;
            animation: pulse 2s ease-in-out infinite;
        }

        .splash-text {
            font-size: 1.2rem;
            color: var(--text-gray);
            text-align: center;
            margin-bottom: 30px;
        }

        .splash-loader {
            width: 50px;
            height: 50px;
            border: 3px solid var(--border-light);
            border-top: 3px solid var(--primary-red);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Animated Background */
        .bg-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background: linear-gradient(135deg, #ffffff 0%, #fef2f2 25%, #ffffff 50%, #fef2f2 75%, #ffffff 100%);
            background-size: 400% 400%;
            animation: gradientShift 20s ease infinite;
        }

        .bg-animation::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 20% 80%, rgba(220, 38, 38, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.05) 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, rgba(220, 38, 38, 0.08) 0%, transparent 50%);
            animation: float 25s ease-in-out infinite;
        }

        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(1deg); }
            66% { transform: translateY(20px) rotate(-1deg); }
        }

        /* Navigation */
        nav {
            position: fixed;
            top: 0;
            width: 100%;
            padding: 20px 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border-light);
            z-index: 1000;
            transition: all 0.3s ease;
        }

        nav.scrolled {
            padding: 15px 0;
            background: rgba(255, 255, 255, 0.98);
            box-shadow: 0 2px 20px rgba(220, 38, 38, 0.1);
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 20px;
        }

        .logo {
            font-size: 2rem;
            font-weight: 800;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            transition: all 0.3s ease;
        }

        .logo:hover {
            filter: drop-shadow(0 0 10px var(--shadow-red));
        }

        .nav-links {
            display: flex;
            list-style: none;
            gap: 30px;
        }

        .nav-links a {
            color: var(--text-black);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            position: relative;
        }

        .nav-links a::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 0;
            height: 2px;
            background: var(--red-gradient);
            transition: width 0.3s ease;
        }

        .nav-links a:hover {
            color: var(--primary-red);
        }

        .nav-links a:hover::after {
            width: 100%;
        }

        /* Mobile Menu */
        .mobile-menu-toggle {
            display: none;
            flex-direction: column;
            cursor: pointer;
            padding: 10px;
        }

        .mobile-menu-toggle span {
            width: 25px;
            height: 3px;
            background: var(--text-black);
            margin: 3px 0;
            transition: 0.3s;
        }

        .mobile-menu-toggle.active span:nth-child(1) {
            transform: rotate(-45deg) translate(-5px, 6px);
        }

        .mobile-menu-toggle.active span:nth-child(2) {
            opacity: 0;
        }

        .mobile-menu-toggle.active span:nth-child(3) {
            transform: rotate(45deg) translate(-5px, -6px);
        }

        .mobile-menu {
            display: none;
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border-light);
            z-index: 999;
        }

        .mobile-menu.active {
            display: block;
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .mobile-menu ul {
            list-style: none;
            padding: 20px;
        }

        .mobile-menu li {
            margin: 15px 0;
        }

        .mobile-menu a {
            color: var(--text-black);
            text-decoration: none;
            font-weight: 500;
            font-size: 1.1rem;
            display: block;
            padding: 10px 0;
            transition: color 0.3s ease;
        }

        .mobile-menu a:hover {
            color: var(--primary-red);
        }

        /* Hero Section */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 0 20px;
            position: relative;
        }

        .hero-content {
            max-width: 800px;
            animation: fadeInUp 1s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero h1 {
            font-size: clamp(3rem, 8vw, 6rem);
            font-weight: 800;
            margin-bottom: 20px;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.1;
        }

        .hero-subtitle {
            font-size: clamp(1.2rem, 3vw, 2rem);
            color: var(--text-gray);
            margin-bottom: 30px;
            animation: fadeInUp 1s ease-out 0.2s both;
        }

        .hero-description {
            font-size: 1.2rem;
            color: var(--text-light-gray);
            margin-bottom: 40px;
            line-height: 1.8;
            animation: fadeInUp 1s ease-out 0.4s both;
        }

        .cta-button {
            display: inline-block;
            padding: 18px 40px;
            background: var(--red-gradient);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px var(--shadow-red);
            position: relative;
            overflow: hidden;
            animation: fadeInUp 1s ease-out 0.6s both;
            cursor: pointer;
            border: none;
        }

        .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
        }

        .cta-button:hover::before {
            left: 100%;
        }

        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 40px var(--shadow-red);
        }

        /* Features Section */
        .features {
            padding: 120px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .section-title {
            text-align: center;
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 700;
            margin-bottom: 20px;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .section-subtitle {
            text-align: center;
            font-size: 1.3rem;
            color: var(--text-gray);
            margin-bottom: 80px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 40px;
            margin-bottom: 80px;
        }

        .feature-card {
            background: var(--bg-white);
            border: 2px solid var(--border-light);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--red-gradient);
            transform: translateX(-100%);
            transition: transform 0.6s ease;
        }

        .feature-card:hover::before {
            transform: translateX(0);
        }

        .feature-card:hover {
            transform: translateY(-10px);
            border-color: var(--primary-red);
            box-shadow: 0 20px 40px rgba(220, 38, 38, 0.15);
        }

        .feature-icon {
            font-size: 3rem;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 20px;
            display: block;
        }

        .feature-card h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--text-black);
        }

        .feature-card p {
            color: var(--text-light-gray);
            line-height: 1.7;
        }

        /* Statistics Section */
        .stats {
            padding: 80px 20px;
            background: var(--bg-red-subtle);
            margin: 80px 20px;
            border-radius: 30px;
            border: 2px solid var(--border-light);
        }

        .stats-container {
            max-width: 1000px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 40px;
            text-align: center;
        }

        .stat-item h3 {
            font-size: 3rem;
            font-weight: 800;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }

        .stat-item p {
            color: var(--text-gray);
            font-size: 1.1rem;
        }

        /* CTA Section */
        .final-cta {
            padding: 120px 20px;
            text-align: center;
        }

        .final-cta h2 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 700;
            margin-bottom: 30px;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .final-cta p {
            font-size: 1.3rem;
            color: var(--text-gray);
            margin-bottom: 40px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        /* Email Form */
        .email-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-width: 400px;
            margin: 30px auto 0;
        }

        .email-input {
            padding: 15px 20px;
            border: 2px solid var(--border-light);
            border-radius: 25px;
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
            background: var(--bg-white);
        }

        .email-input:focus {
            border-color: var(--primary-red);
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .submit-btn {
            padding: 15px 30px;
            background: var(--red-gradient);
            color: white;
            border: none;
            border-radius: 25px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px var(--shadow-red);
        }

        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* Popup Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }

        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-white);
            border: 2px solid var(--border-light);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            animation: slideUp 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translate(-50%, -30%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }

        .modal h3 {
            font-size: 2rem;
            margin-bottom: 20px;
            background: var(--red-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .modal p {
            color: var(--text-gray);
            margin-bottom: 30px;
            line-height: 1.6;
        }

        .close-btn {
            background: var(--red-gradient);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .close-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px var(--shadow-red);
        }

        /* Footer */
        footer {
            padding: 60px 20px 40px;
            text-align: center;
            border-top: 1px solid var(--border-light);
            background: var(--bg-light);
        }

        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
        }

        .footer-links {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }

        .footer-links a {
            color: var(--text-gray);
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .footer-links a:hover {
            color: var(--primary-red);
        }

        .copyright {
            color: var(--text-light-gray);
            font-size: 0.9rem;
        }

        /* Scroll Animations */
        .scroll-reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }

        .scroll-reveal.revealed {
            opacity: 1;
            transform: translateY(0);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .nav-links {
                display: none;
            }

            .mobile-menu-toggle {
                display: flex;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
                gap: 30px;
            }
            
            .stats-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 30px;
            }
            
            .footer-links {
                flex-direction: column;
                gap: 15px;
            }

            .email-form {
                flex-direction: column;
            }
        }

        /* Floating Elements */
        .floating-shapes {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }

        .shape {
            position: absolute;
            background: rgba(220, 38, 38, 0.05);
            border-radius: 50%;
            animation: floatShape 20s infinite linear;
        }

        .shape:nth-child(1) {
            width: 80px;
            height: 80px;
            top: 20%;
            left: 10%;
            animation-delay: 0s;
        }

        .shape:nth-child(2) {
            width: 120px;
            height: 120px;
            top: 70%;
            right: 10%;
            animation-delay: 7s;
        }

        .shape:nth-child(3) {
            width: 60px;
            height: 60px;
            top: 40%;
            right: 20%;
            animation-delay: 14s;
        }

        @keyframes floatShape {
            0%, 100% {
                transform: translateY(0px) rotate(0deg);
                opacity: 0.3;
            }
            50% {
                transform: translateY(-80px) rotate(180deg);
                opacity: 0.8;
            }
        }
    </style>
</head>
<body>
    <!-- Splash Screen -->
    <div class="splash-screen" id="splashScreen">
        <div class="splash-logo">RedBut</div>
        <div class="splash-text">Revolutionizing Restaurant Operations</div>
        <div class="splash-loader"></div>
    </div>

    <!-- Animated Background -->
    <div class="bg-animation"></div>
    
    <!-- Floating Shapes -->
    <div class="floating-shapes">
        <div class="shape"></div>
        <div class="shape"></div>
        <div class="shape"></div>
    </div>

    <!-- Navigation -->
    <nav id="navbar">
        <div class="nav-container">
            <div class="logo">RedBut</div>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
            <div class="mobile-menu-toggle" id="mobileToggle">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        <div class="mobile-menu" id="mobileMenu">
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero" id="home">
        <div class="hero-content">
            <h1>Transform Your Restaurant Operations</h1>
            <p class="hero-subtitle">AI-Powered Analytics & Real-Time Customer Engagement</p>
            <p class="hero-description">
                Revolutionize your restaurant with cutting-edge technology. Get real-time insights, 
                boost customer satisfaction, and streamline operations with our comprehensive platform.
            </p>
            <button class="cta-button" onclick="showModal()">
                <i class="fas fa-rocket"></i> Get Started Today
            </button>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <h2 class="section-title scroll-reveal">Powerful Features</h2>
        <p class="section-subtitle scroll-reveal">Everything you need to run a successful restaurant</p>
        
        <div class="features-grid">
            <div class="feature-card scroll-reveal">
                <i class="fas fa-chart-line feature-icon"></i>
                <h3>AI-Powered Analytics</h3>
                <p>Get deep insights into your restaurant's performance with advanced analytics. Track staff performance, customer satisfaction, and operational efficiency in real-time.</p>
            </div>
            
            <div class="feature-card scroll-reveal">
                <i class="fas fa-comments feature-icon"></i>
                <h3>Real-Time Customer Engagement</h3>
                <p>Connect with your customers instantly through our integrated chat system. Address concerns, take orders, and provide exceptional service directly from your dashboard.</p>
            </div>
            
            <div class="feature-card scroll-reveal">
                <i class="fas fa-users feature-icon"></i>
                <h3>Staff Management</h3>
                <p>Optimize your team's performance with comprehensive staff analytics. Monitor response times, track performance metrics, and identify areas for improvement.</p>
            </div>
            
            <div class="feature-card scroll-reveal">
                <i class="fas fa-mobile-alt feature-icon"></i>
                <h3>Multi-Platform Access</h3>
                <p>Access your dashboard from anywhere, on any device. Our responsive platform ensures you stay connected to your restaurant operations 24/7.</p>
            </div>
            
            <div class="feature-card scroll-reveal">
                <i class="fas fa-brain feature-icon"></i>
                <h3>Smart Insights</h3>
                <p>Leverage machine learning to predict trends, optimize operations, and make data-driven decisions that boost your restaurant's profitability.</p>
            </div>
            
            <div class="feature-card scroll-reveal">
                <i class="fas fa-shield-alt feature-icon"></i>
                <h3>Secure & Reliable</h3>
                <p>Enterprise-grade security ensures your data is always protected. Built on robust infrastructure with 99.9% uptime guarantee.</p>
            </div>
        </div>
    </section>

    <!-- Statistics Section -->
    <section class="stats scroll-reveal">
        <div class="stats-container">
           
            <div class="stat-item">
                <h3>99.9%</h3>
                <p>Uptime Guarantee</p>
            </div>
            <div class="stat-item">
                <h3>247</h3>
                <p>AI Customer Support</p>
            </div>
            <div class="stat-item">
                <h3>50%</h3>
                <p>Efficiency Increase</p>
            </div>
        </div>
    </section>

    <!-- Final CTA Section -->
    <section class="final-cta scroll-reveal">
        <h2>Ready to Transform Your Restaurant?</h2>
        <p>Join hundreds of successful restaurants already using RedBut.tech to revolutionize their operations and boost customer satisfaction.</p>
        <button class="cta-button" onclick="showModal()">
            <i class="fas fa-arrow-right"></i> Start Your Journey
        </button>
    </section>

    <!-- Footer -->
    <footer>
        <div class="footer-content">
            <div class="footer-links">
                <a href="#privacy">Privacy Policy</a>
                <a href="#terms">Terms of Service</a>
                <a href="#support">Support</a>
                <a href="#contact">Contact Us</a>
            </div>
            <p class="copyright">© 2025 RedBut.tech. All rights reserved.</p>
        </div>
    </footer>

    <!-- Modal -->
    <div class="modal" id="comingSoonModal">
        <div class="modal-content">
            <h3><i class="fas fa-rocket"></i> Coming Soon!</h3>
            <p>We're putting the finishing touches on something amazing. Our platform will be launching very soon with revolutionary features that will transform how you run your restaurant.</p>
            <p><strong>Be the first to know when we launch!</strong></p>
            
            <form class="email-form" id="notifyForm">
                <input 
                    type="email" 
                    class="email-input" 
                    placeholder="Enter your email address" 
                    required 
                    id="emailInput"
                >
                <button type="submit" class="submit-btn">
                    <i class="fas fa-bell"></i> Notify Me When We Launch
                </button>
            </form>
            
            <div id="success-message" style="display: none; color: var(--primary-red); margin-top: 20px;">
                <i class="fas fa-check-circle"></i> Thank you! We'll notify you when we launch.
            </div>
        </div>
    </div>

    <script>
        // Splash Screen
        window.addEventListener('load', function() {
            setTimeout(function() {
                const splash = document.getElementById('splashScreen');
                splash.classList.add('fade-out');
                setTimeout(function() {
                    splash.style.display = 'none';
                }, 800);
            }, 2000);
        });

        // Mobile Menu Toggle
        const mobileToggle = document.getElementById('mobileToggle');
        const mobileMenu = document.getElementById('mobileMenu');

        mobileToggle.addEventListener('click', function() {
            mobileToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on links
        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', function() {
                mobileToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });

        // Navbar scroll effect
        window.addEventListener('scroll', function() {
            const navbar = document.getElementById('navbar');
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Scroll reveal animation
        function revealOnScroll() {
            const reveals = document.querySelectorAll('.scroll-reveal');
            
            reveals.forEach(element => {
                const windowHeight = window.innerHeight;
                const revealTop = element.getBoundingClientRect().top;
                const revealPoint = 100;
                
                if (revealTop < windowHeight - revealPoint) {
                    element.classList.add('revealed');
                }
            });
        }

        window.addEventListener('scroll', revealOnScroll);
        revealOnScroll(); // Check on load

        // Email Form Submission
        document.getElementById('notifyForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('emailInput');
            const submitBtn = e.target.querySelector('.submit-btn');
            const successMessage = document.getElementById('success-message');
            
            // Simple email validation
            const email = emailInput.value.trim();
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email address.');
                return;
            }
            
            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            
            // Simulate API call (replace with actual endpoint)
            setTimeout(function() {
                // Hide form and show success message
                document.querySelector('.email-form').style.display = 'none';
                successMessage.style.display = 'block';
                
                // Auto-close modal after 3 seconds
                setTimeout(function() {
                    hideModal();
                    // Reset form for next time
                    emailInput.value = '';
                    document.querySelector('.email-form').style.display = 'flex';
                    successMessage.style.display = 'none';
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-bell"></i> Notify Me When We Launch';
                }, 3000);
                
                // Store email in localStorage (for demonstration)
                const emails = JSON.parse(localStorage.getItem('notifyEmails') || '[]');
                emails.push({
                    email: email,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('notifyEmails', JSON.stringify(emails));
                
            }, 1500);
        });

        // Modal functions
        function showModal() {
            document.getElementById('comingSoonModal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        function hideModal() {
            document.getElementById('comingSoonModal').style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('comingSoonModal');
            if (event.target === modal) {
                hideModal();
            }
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Animate statistics on scroll
        function animateStats() {
            const stats = document.querySelectorAll('.stat-item h3');
            
            stats.forEach(stat => {
                const rect = stat.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (isVisible && !stat.classList.contains('animated')) {
                    stat.classList.add('animated');
                    const finalValue = stat.textContent;
                    const numericValue = parseInt(finalValue.replace(/\D/g, ''));
                    const suffix = finalValue.replace(/[\d.]/g, '');
                    let current = 0;
                    
                    const increment = numericValue / 50;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= numericValue) {
                            current = numericValue;
                            clearInterval(timer);
                        }
                        stat.textContent = Math.floor(current) + suffix;
                    }, 40);
                }
            });
        }

        window.addEventListener('scroll', animateStats);
        
        // Add some interactive particle effects
        function createParticles() {
            const hero = document.querySelector('.hero');
            
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: rgba(79, 172, 254, 0.6);
                    border-radius: 50%;
                    pointer-events: none;
                    animation: particle ${3 + Math.random() * 4}s infinite linear;
                    left: ${Math.random() * 100}%;
                    animation-delay: ${Math.random() * 2}s;
                `;
                hero.appendChild(particle);
            }
        }

        // Add particle animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes particle {
                0% {
                    transform: translateY(100vh) scale(0);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100px) scale(1);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        // Initialize particles
        createParticles();

        // Add loading animation
        window.addEventListener('load', function() {
            document.body.style.animation = 'fadeIn 1s ease-in';
        });
    </script>
</body>
</html>