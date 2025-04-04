require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());
app.use(cors({ origin: ["http://localhost:4200"], methods: ["GET", "POST", "PUT", "DELETE"] }));

// In-memory user storage (use a database in production)
const users = [];

// JWT secret (should be in .env file)
const JWT_SECRET = process.env.JWT_SECRET || "your_secure_jwt_secret";

// Rate limiter to prevent abuse
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Role-based access control
const roles = {
    admin: ["read", "write", "delete"],
    user: ["read"],
    editor: ["read", "write"],
};

// Middleware to authorize based on role and action
function authorize(role, action) {
    return (req, res, next) => {
        if (!req.user || !roles[req.user.role]?.includes(action)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        next();
    };
}

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from Bearer format
    
    if (!token) return res.status(403).json({ success: false, message: "No token provided" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
}

// Register user
app.post("/register", async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }
        
        // Validate role
        if (!role || !roles[role]) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }
        
        // Check if user already exists
        if (users.find(u => u.username === username)) {
            return res.status(409).json({ success: false, message: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { username, password: hashedPassword, role };
        users.push(newUser);
        
        res.status(201).json({ 
            success: true, 
            message: "User registered successfully",
            user: { username: newUser.username, role: newUser.role }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Server error during registration" });
    }
});

// Login user and return JWT
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }
        
        const user = users.find((u) => u.username === username);
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        
        const userData = { username: user.username, role: user.role };
        const token = jwt.sign(userData, JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ 
            success: true, 
            message: "Login successful", 
            token, 
            user: userData 
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error during login" });
    }
});

// Protected route (any authenticated user)
app.get("/protected", authenticateToken, (req, res) => {
    res.json({ success: true, message: `Hello, ${req.user.username}` });
});

// Admin route
app.get("/admin-only", authenticateToken, authorize("admin", "delete"), (req, res) => {
    res.json({ success: true, message: "Admin access granted" });
});

// Editor route
app.get("/user-and-editor", authenticateToken, authorize("editor", "write"), (req, res) => {
    res.json({ success: true, message: "Editor access granted" });
});

// User route
app.get("/user", authenticateToken, authorize("user", "read"), (req, res) => {
    res.json({ success: true, message: "User access granted" });
});

// Public route
app.get("/", (req, res) => {
    res.send("API is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));