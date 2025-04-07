"use client"

import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { motion, AnimatePresence, useInView } from "framer-motion"

export default function App() {
  // States
  const [username, setUsername] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [onlineUsers, setOnlineUsers] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const animationFrameRef = useRef(null)
  const featuresRef = useRef(null)

  // Connect to socket when logged in
  useEffect(() => {
    if (isLoggedIn && username) {
      // Initialize socket
      socketRef.current = io("http://192.168.1.8:5000")

      // Register user
      socketRef.current.emit("register", username)
      setIsConnected(true)

      // Handle incoming messages
      socketRef.current.on("message", (msg) => {
        const newMsg = {
          ...msg,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, newMsg])

        // Handle alerts
        if (msg.text && (msg.text.includes("⚠️ WARNING:") || msg.text.includes("⛔"))) {
          alert(msg.text)
        }
      })

      // Handle user list updates
      socketRef.current.on("user_list", (data) => {
        setOnlineUsers(data.users)
      })

      // Handle connection status
      socketRef.current.on("connect", () => setIsConnected(true))
      socketRef.current.on("disconnect", () => setIsConnected(false))

      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.off("message")
          socketRef.current.off("user_list")
          socketRef.current.off("connect")
          socketRef.current.off("disconnect")
          socketRef.current.disconnect()
        }
      }
    }
  }, [isLoggedIn, username])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Particle animation for login screen
  useEffect(() => {
    if (!isLoggedIn && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      let animationFrame

      // Set canvas dimensions
      const resizeCanvas = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }

      resizeCanvas()
      window.addEventListener("resize", resizeCanvas)

      // Create particles
      const createParticles = () => {
        particlesRef.current = []
        const particleCount = Math.floor(window.innerWidth / 20) // Responsive particle count

        for (let i = 0; i < particleCount; i++) {
          particlesRef.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 1,
            color: getRandomColor(),
            speedX: Math.random() * 1 - 0.5,
            speedY: Math.random() * 1 - 0.5,
            opacity: Math.random() * 0.5 + 0.2,
          })
        }
      }

      // Get random color from theme
      const getRandomColor = () => {
        const colors = [
          "#007BDB", // Primary Blue
          "#0066B2", // Shield Blue
          "#65CFFF", // Sky Blue
          "#8CE2DB", // Soft Teal
          "#00C27D", // Action Green
        ]
        return colors[Math.floor(Math.random() * colors.length)]
      }

      // Draw particles
      const drawParticles = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        particlesRef.current.forEach((particle) => {
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
          ctx.fillStyle = particle.color
          ctx.globalAlpha = particle.opacity
          ctx.fill()

          // Update position
          particle.x += particle.speedX
          particle.y += particle.speedY

          // Bounce off edges
          if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1
          if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1
        })

        // Draw connections between nearby particles
        drawConnections()

        animationFrameRef.current = requestAnimationFrame(drawParticles)
      }

      // Draw connections between particles that are close to each other
      const drawConnections = () => {
        ctx.lineWidth = 0.3
        ctx.globalAlpha = 0.2

        for (let i = 0; i < particlesRef.current.length; i++) {
          for (let j = i + 1; j < particlesRef.current.length; j++) {
            const p1 = particlesRef.current[i]
            const p2 = particlesRef.current[j]
            const dx = p1.x - p2.x
            const dy = p1.y - p2.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 100) {
              ctx.beginPath()
              ctx.strokeStyle = p1.color
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.stroke()
            }
          }
        }
      }

      createParticles()
      drawParticles()

      // Mouse interaction
      const handleMouseMove = (e) => {
        const mouseX = e.clientX
        const mouseY = e.clientY

        particlesRef.current.forEach((particle) => {
          const dx = mouseX - particle.x
          const dy = mouseY - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            const angle = Math.atan2(dy, dx)
            particle.x -= Math.cos(angle) * 1
            particle.y -= Math.sin(angle) * 1
          }
        })
      }

      canvas.addEventListener("mousemove", handleMouseMove)

      return () => {
        window.removeEventListener("resize", resizeCanvas)
        canvas.removeEventListener("mousemove", handleMouseMove)
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isLoggedIn])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault()
    if (username.trim()) {
      setIsLoggedIn(true)
    }
  }

  // Send message function
  const sendMessage = () => {
    if (input.trim() !== "" && socketRef.current) {
      socketRef.current.emit("message", {
        user: username,
        text: input,
      })
      setInput("")
      setIsTyping(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value)

    if (!isTyping) {
      setIsTyping(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  // Generate avatar for user
  const generateAvatarFallback = (name) => {
    return name.slice(0, 2).toUpperCase()
  }

  // Generate random color for user avatar
  const generateUserColor = (name) => {
    const colors = [
      "#007BDB", // Primary Blue
      "#0066B2", // Shield Blue
      "#65CFFF", // Sky Blue
      "#8CE2DB", // Soft Teal
      "#00C27D", // Action Green
    ]

    // Simple hash function to get consistent color for same username
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        when: "beforeChildren",
        staggerChildren: 0.3,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.5 },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0, rotateY: 90 },
    visible: {
      scale: 1,
      opacity: 1,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        duration: 0.8,
      },
    },
    hover: {
      scale: 1.1,
      rotate: [0, -5, 5, -5, 0],
      filter: [
        "drop-shadow(0 0 0 rgba(0, 123, 219, 0.5))",
        "drop-shadow(0 0 10px rgba(0, 123, 219, 0.8))",
        "drop-shadow(0 0 20px rgba(0, 123, 219, 0.5))",
        "drop-shadow(0 0 10px rgba(0, 123, 219, 0.8))",
        "drop-shadow(0 0 0 rgba(0, 123, 219, 0.5))",
      ],
      transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop" },
    },
  }

  const buttonVariants = {
    hover: {
      scale: 1.05,
      backgroundColor: "#0066B2",
      boxShadow: "0 5px 15px rgba(0, 123, 219, 0.4)",
      transition: { duration: 0.3 },
    },
    tap: { scale: 0.95 },
  }

  const inputVariants = {
    focus: {
      scale: 1.02,
      borderColor: "#007BDB",
      boxShadow: "0 0 0 3px rgba(0, 123, 219, 0.2)",
    },
  }

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "loop",
        ease: "easeInOut",
      },
    },
  }

  // Feature section components
  const Feature = ({ number, title, description, isEven }) => {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false, amount: 0.5 })

    return (
      <div className="feature-item" ref={ref}>
        <motion.div
          className="feature-image-container"
          initial={{ x: isEven ? 100 : -100, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: isEven ? 100 : -100, opacity: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 50 }}
        >
          <img src={`/images/${number}.png`} alt={title} className="feature-image" />
        </motion.div>
        <motion.div
          className="feature-text"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h2 className="feature-title">{title}</h2>
          <p className="feature-description">{description}</p>
        </motion.div>
      </div>
    )
  }

  const features = [
    {
      number: 1,
      title: "Real-Time Messaging",
      description:
        "Experience seamless, instant messaging with no delays. Connect with others in real time, whether one-on-one or in a group. Enjoy smooth conversations that keep the chat flowing!",
    },
    {
      number: 2,
      title: "Toxicity Detection",
      description:
        "Our advanced AI scans every message for harmful content. It detects bullying, insults, and more in real time. Keeps your chat safe and welcoming for everyone.",
    },
    {
      number: 3,
      title: "Warning & Ban System",
      description:
        "Get three warnings for toxic behavior—then you're out. Our system ensures repeat offenders can't disrupt the peace. Maintains a respectful community with clear rules.",
    },
    {
      number: 4,
      title: "User-Friendly Interface",
      description:
        "Navigate a clean, modern design with smooth animations. Easy to use on any device, from desktop to mobile. Makes chatting intuitive, fun, and hassle-free!",
    },
  ]

  return (
    <div className="app-container">
      {/* CSS Styles */}
      <style>
        {`
          /* Base styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          }
          
          body {
            background-color: #F2F4F8; /* Off White */
            color: #0A1D3F; /* Dark Navy */
            overflow-x: hidden;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            width: 100vw;
          }
          
          .app-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            width: 100vw;
            overflow-x: hidden;
          }
          
          /* Scrollbar styling */
          ::-webkit-scrollbar {
            width: 6px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
          }
          
          ::-webkit-scrollbar-thumb {
            background: #65CFFF; /* Sky Blue */
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #007BDB; /* Primary Blue */
          }
          
          /* Login screen */
          .login-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            background-color: #F2F4F8; /* Off White */
            padding: 2rem;
            position: relative;
            overflow-x: hidden;
          }
          
          .login-hero {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            width: 100%;
            position: relative;
          }
          
          .login-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
          }
          
          .login-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            opacity: 0.05;
          }
          
          .login-background-circle {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, #007BDB, transparent);
          }
          
          .login-logo {
            width: 200px;
            height: auto;
            margin-bottom: 2rem;
            z-index: 1;
            filter: drop-shadow(0 5px 15px rgba(0, 123, 219, 0.3));
          }
          
          .login-title {
            font-size: 2.5rem;
            font-weight: bold;
            color: #0066B2; /* Shield Blue */
            margin-bottom: 1.5rem;
            text-align: center;
            z-index: 1;
            text-shadow: 0 2px 10px rgba(0, 123, 219, 0.2);
            background: linear-gradient(90deg, #007BDB, #65CFFF);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-size: 200% auto;
            animation: textShine 3s linear infinite;
          }
          
          @keyframes textShine {
            to {
              background-position: 200% center;
            }
          }
          
          .login-form {
            width: 100%;
            max-width: 400px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background-color: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 123, 219, 0.15);
            z-index: 1;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .login-form::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, #007BDB, #65CFFF, #8CE2DB, #00C27D);
            background-size: 300% 300%;
            animation: gradient 5s ease infinite;
            z-index: 2;
          }
          
          .login-input {
            padding: 0.75rem;
            border-radius: 8px;
            border: 2px solid #E2E8F0;
            font-size: 1rem;
            transition: all 0.3s ease;
            background-color: rgba(255, 255, 255, 0.9);
          }
          
          .login-input:focus {
            outline: none;
            border-color: #007BDB; /* Primary Blue */
            box-shadow: 0 0 0 3px rgba(0, 123, 219, 0.2);
          }
          
          .login-button {
            padding: 0.75rem;
            background-color: #007BDB; /* Primary Blue */
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .login-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: all 0.6s ease;
          }
          
          .login-button:hover::before {
            left: 100%;
          }
          
          .login-button:hover {
            background-color: #0066B2; /* Shield Blue */
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 123, 219, 0.3);
          }
          
          .login-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 6px rgba(0, 123, 219, 0.2);
          }
          
          .login-button:disabled {
            background-color: #CBD5E0;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          
          /* Features section */
          .features-section {
            padding: 4rem 2rem;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .features-title {
            text-align: center;
            font-size: 2rem;
            margin-bottom: 3rem;
            color: #0066B2;
          }
          
          .features-container {
            display: flex;
            flex-direction: column;
            gap: 8rem;
            padding: 2rem 0;
          }
          
          .feature-item {
            display: flex;
            align-items: center;
            gap: 2rem;
            position: relative;
          }
          
          .feature-item:nth-child(even) {
            flex-direction: row-reverse;
          }
          
          .feature-image-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .feature-image {
            width: 200px;
            height: 200px;
            object-fit: contain;
            filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
          }
          
          .feature-text {
            flex: 1;
            padding: 1rem;
          }
          
          .feature-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: #0066B2;
          }
          
          .feature-description {
            font-size: 1rem;
            line-height: 1.6;
            color: #4A5568;
          }
          
          /* Floating elements */
          .floating-element {
            position: absolute;
            z-index: 0;
            opacity: 0.6;
            filter: blur(1px);
          }
          
          .floating-element-1 {
            top: 15%;
            left: 10%;
            width: 50px;
            height: 50px;
            background-color: #65CFFF;
            border-radius: 50%;
          }
          
          .floating-element-2 {
            bottom: 20%;
            right: 15%;
            width: 70px;
            height: 70px;
            background-color: #8CE2DB;
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          }
          
          .floating-element-3 {
            top: 60%;
            left: 20%;
            width: 40px;
            height: 40px;
            background-color: #00C27D;
            border-radius: 63% 37% 30% 70% / 50% 45% 55% 50%;
          }
          
          /* Chat container */
          .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            width: 100%;
            background-color: #F2F4F8; /* Off White */
          }
          
          /* Header */
          .chat-header {
            background-color: #0066B2; /* Shield Blue */
            color: white;
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            z-index: 10;
          }
          
          .header-left {
            display: flex;
            align-items: center;
          }
          
          .header-logo {
            height: 40px;
            width: auto;
            margin-right: 1rem;
          }
          
          .header-title {
            font-size: 1.5rem;
            font-weight: bold;
          }
          
          .header-right {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          
          .connection-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
          }
          
          .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
          }
          
          .status-online {
            background-color: #00C27D; /* Action Green */
            box-shadow: 0 0 0 rgba(0, 194, 125, 0.4);
            animation: pulse 2s infinite;
          }
          
          .status-offline {
            background-color: #EF4444; /* Alert Red */
          }
          
          .user-count {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background-color: rgba(255, 255, 255, 0.2);
            padding: 0.5rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            cursor: pointer;
            position: relative;
            transition: all 0.3s ease;
          }
          
          .user-count:hover {
            background-color: rgba(255, 255, 255, 0.3);
          }
          
          .user-count:hover .user-list {
            display: block;
            animation: fadeIn 0.3s ease forwards;
          }
          
          .user-list {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 0.75rem;
            margin-top: 0.5rem;
            width: max-content;
            max-width: 250px;
            z-index: 20;
            color: #0A1D3F; /* Dark Navy */
          }
          
          .user-list-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #E2E8F0;
          }
          
          .user-list-items {
            max-height: 150px;
            overflow-y: auto;
          }
          
          .user-list-item {
            padding: 0.25rem 0;
          }
          
          /* Messages area */
          .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background-image: url('/images/chat-bg.png');
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
            background-attachment: fixed;
          }
          
          .message {
            display: flex;
            gap: 0.75rem;
            max-width: 80%;
            animation: fadeIn 0.3s ease forwards;
          }
          
          .message-self {
            align-self: flex-end;
            flex-direction: row-reverse;
          }
          
          .message-other {
            align-self: flex-start;
          }
          
          .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            flex-shrink: 0;
          }
          
          .message-bubble {
            padding: 0.75rem 1rem;
            border-radius: 18px;
            position: relative;
          }
          
          .message-self .message-bubble {
            background-color: #8CE2DB; /* Soft Teal */
            border-bottom-right-radius: 4px;
          }
          
          .message-other .message-bubble {
            background-color: white;
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          
          .message-warning .message-bubble {
            background-color: rgba(239, 68, 68, 0.1); /* Alert Red with opacity */
            border: 1px solid #EF4444; /* Alert Red */
          }
          
          .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.25rem;
          }
          
          .message-username {
            font-weight: 600;
            font-size: 0.875rem;
          }
          
          .message-time {
            font-size: 0.75rem;
            color: #64748B;
          }
          
          .message-text {
            word-break: break-word;
          }
          
          .message-warning .message-text {
            color: #EF4444; /* Alert Red */
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          /* Input area */
          .input-area {
            padding: 1rem;
            background-color: white;
            border-top: 1px solid #E2E8F0;
            box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
          }
          
          .typing-indicator {
            font-size: 0.75rem;
            color: #64748B;
            margin-bottom: 0.5rem;
            font-style: italic;
          }
          
          .input-container {
            display: flex;
            gap: 0.75rem;
          }
          
          .message-input-wrapper {
            flex: 1;
            position: relative;
          }
          
          .message-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border-radius: 24px;
            border: 1px solid #E2E8F0;
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
          }
          
          .message-input:focus {
            border-color: #007BDB; /* Primary Blue */
            box-shadow: 0 0 0 2px rgba(0, 123, 219, 0.1);
          }
          
          .send-button {
            background-color: #007BDB; /* Primary Blue */
            color: white;
            border: none;
            border-radius: 24px;
            padding: 0 1.25rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .send-button:hover {
            background-color: #0066B2; /* Shield Blue */
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0, 123, 219, 0.3);
          }
          
          .send-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0, 123, 219, 0.2);
          }
          
          .send-button:disabled {
            background-color: #CBD5E0;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          
          /* Animations */
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 194, 125, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(0, 194, 125, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 194, 125, 0); }
          }
          
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          .floating {
            animation: float 6s ease-in-out infinite;
          }
          
          .gradient-bg {
            background: linear-gradient(-45deg, #007BDB, #65CFFF, #8CE2DB, #00C27D);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
          }
          
          /* Background circles for login */
          .bg-circle-1 {
            top: -150px;
            left: -150px;
            width: 300px;
            height: 300px;
            opacity: 0.5;
            animation: float 8s ease-in-out infinite;
          }
          
          .bg-circle-2 {
            bottom: -100px;
            right: -100px;
            width: 250px;
            height: 250px;
            opacity: 0.3;
            animation: float 10s ease-in-out infinite;
          }
          
          .bg-circle-3 {
            top: 50%;
            left: 20%;
            width: 200px;
            height: 200px;
            opacity: 0.2;
            animation: float 12s ease-in-out infinite;
          }
          
          /* Responsive styles */
          @media (max-width: 768px) {
            .feature-item, .feature-item:nth-child(even) {
              flex-direction: column;
              gap: 1rem;
            }
            
            .feature-image {
              width: 150px;
              height: 150px;
            }
            
            .login-title {
              font-size: 2rem;
            }
            
            .features-title {
              font-size: 1.5rem;
            }
            
            .feature-title {
              font-size: 1.25rem;
            }
            
            .message {
              max-width: 90%;
            }
          }
        `}
      </style>

      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          // Login Screen with animations and features section
          <motion.div
            className="login-container"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            key="login"
          >
            {/* Hero Section */}
            <div className="login-hero">
              {/* Canvas for particle animation */}
              <canvas ref={canvasRef} className="login-canvas"></canvas>

              {/* Animated background circles */}
              <div className="login-background">
                <div className="login-background-circle bg-circle-1"></div>
                <div className="login-background-circle bg-circle-2"></div>
                <div className="login-background-circle bg-circle-3"></div>
              </div>

              {/* Floating elements */}
              <motion.div
                className="floating-element floating-element-1"
                variants={floatingVariants}
                animate="animate"
              ></motion.div>
              <motion.div
                className="floating-element floating-element-2"
                variants={floatingVariants}
                animate="animate"
                style={{ animationDelay: "1s" }}
              ></motion.div>
              <motion.div
                className="floating-element floating-element-3"
                variants={floatingVariants}
                animate="animate"
                style={{ animationDelay: "2s" }}
              ></motion.div>

              <motion.img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-XLT9ATSCSFLflpfsY8x50QXyUI8hIX.png"
                alt="SafeSpace Logo"
                className="login-logo"
                variants={logoVariants}
                whileHover="hover"
                initial="hidden"
                animate="visible"
              />

              <motion.h1 className="login-title" variants={itemVariants}>
                SafeSpace
              </motion.h1>

              <motion.form className="login-form" variants={itemVariants} onSubmit={handleLogin}>
                <motion.input
                  type="text"
                  className="login-input"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  variants={itemVariants}
                  whileFocus="focus"
                />

                <motion.button
                  type="submit"
                  className="login-button"
                  disabled={!username.trim()}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Join Chat
                </motion.button>
              </motion.form>
            </div>

            {/* Features Section */}
            <div className="features-section" ref={featuresRef}>
              <h2 className="features-title">Why Choose SafeSpace?</h2>
              <div className="features-container">
                {features.map((feature, index) => (
                  <Feature
                    key={index}
                    number={feature.number}
                    title={feature.title}
                    description={feature.description}
                    isEven={index % 2 !== 0}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          // Chat Screen
          <motion.div
            className="chat-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="chat"
          >
            {/* Header */}
            <div className="chat-header">
              <div className="header-left">
                <motion.img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-XLT9ATSCSFLflpfsY8x50QXyUI8hIX.png"
                  alt="SafeSpace Logo"
                  className="header-logo"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                />
                <h1 className="header-title">SafeSpace</h1>
              </div>
              <div className="header-right">
                <div className="connection-status">
                  <div className={`status-indicator ${isConnected ? "status-online" : "status-offline"}`}></div>
                  <span>{isConnected ? "Connected" : "Disconnected"}</span>
                </div>
                <div className="user-count">
                  <span>👥</span>
                  <span>{onlineUsers.length} online</span>
                  <div className="user-list">
                    <div className="user-list-title">Online Users</div>
                    <div className="user-list-items">
                      {onlineUsers.length > 0 ? (
                        onlineUsers.map((user, index) => (
                          <div key={index} className="user-list-item">
                            {user}
                          </div>
                        ))
                      ) : (
                        <div className="user-list-item">No users online</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="messages-area">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  className={`message ${
                    msg.text && (msg.text.includes("⚠️") || msg.text.includes("⛔"))
                      ? "message-warning"
                      : msg.user === username
                        ? "message-self"
                        : "message-other"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className="avatar"
                    style={{
                      backgroundColor: generateUserColor(msg.user || "Anonymous"),
                    }}
                  >
                    {generateAvatarFallback(msg.user || "AN")}
                  </div>
                  <div className="message-bubble">
                    <div className="message-header">
                      <span className="message-username">{msg.user || "Anonymous"}</span>
                      {msg.timestamp && (
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p
                      className={
                        msg.text && (msg.text.includes("⚠️") || msg.text.includes("⛔"))
                          ? "message-text message-warning-text"
                          : "message-text"
                      }
                    >
                      {msg.text && (msg.text.includes("⚠️") || msg.text.includes("⛔")) ? (
                        <>
                          <span>⚠️</span>
                          {msg.text}
                        </>
                      ) : (
                        msg.text
                      )}
                    </p>
                  </div>
                </motion.div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="input-area">
              {isTyping && <div className="typing-indicator">You are typing...</div>}
              <div className="input-container">
                <div className="message-input-wrapper">
                  <motion.input
                    type="text"
                    className="message-input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    whileFocus={inputVariants.focus}
                  />
                </div>
                <motion.button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Send
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

