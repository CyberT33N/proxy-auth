const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
require('dotenv').config();

const bearerPassword = process.env.BEARER_PASSWORD;

// Custom logging function
const logRequest = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log('\n' + '═'.repeat(100));
    console.log(`🕒 ${timestamp}`);
    console.log('▶️  INCOMING REQUEST');
    console.log('┌' + '─'.repeat(98) + '┐');
    console.log(`│ 🌐 Method: ${req.method.padEnd(91)} │`);
    console.log(`│ 🔗 URL: ${req.url.padEnd(93)} │`);
    console.log(`│ 🖥️  IP: ${req.ip.padEnd(93)} │`);
    console.log('│ 📨 Headers:'.padEnd(100) + '│');
    
    Object.entries(req.headers).forEach(([key, value]) => {
        console.log(`│    ${key}: ${value.toString().slice(0, 80).padEnd(91)} │`);
    });
    
    console.log('└' + '─'.repeat(98) + '┘');
    next();
};

// Authentication middleware with logging
const authMiddleware = (req, res, next) => {
    console.log('\n🔐 Authentication Check');
    console.log('┌' + '─'.repeat(98) + '┐');

    // Skip authentication for OPTIONS requests
    if (req.method === 'OPTIONS') {
        console.log('│ ℹ️  Skipping auth for OPTIONS request'.padEnd(99) + '│');
        console.log('└' + '─'.repeat(98) + '┘');
        // Add CORS headers for OPTIONS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
        return res.sendStatus(200);
    }

    // Check Bearer token
    const bearerToken = req.headers['authorization'];
    if (!bearerToken || bearerToken !== bearerPassword) {
        console.log('│ ❌ Invalid Bearer token'.padEnd(99) + '│');
        console.log('└' + '─'.repeat(98) + '┘');
        return res.status(401).send('Invalid Bearer token');
    }
    console.log('│ ✅ Bearer token validated'.padEnd(99) + '│');
    console.log('└' + '─'.repeat(98) + '┘');

    next();
};

// Response logging middleware
const logResponse = (proxyRes, req, res) => {
    console.log('\n📤 OUTGOING RESPONSE');
    console.log('┌' + '─'.repeat(98) + '┐');
    console.log(`│ 📊 Status: ${proxyRes.statusCode} ${proxyRes.statusMessage}`.padEnd(99) + '│');
    console.log('│ 📨 Response Headers:'.padEnd(99) + '│');
    
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
        console.log(`│    ${key}: ${value.toString().slice(0, 80).padEnd(91)} │`);
    });

    let body = '';
    proxyRes.on('data', chunk => {
        body += chunk;
    });

    proxyRes.on('end', () => {
        try {
            const prettyBody = JSON.stringify(JSON.parse(body), null, 2);
            console.log('│ 📦 Response Body:'.padEnd(99) + '│');
            prettyBody.split('\n').forEach(line => {
                console.log(`│    ${line.slice(0, 90).padEnd(91)} │`);
            });
        } catch (e) {
            console.log(`│    ${body.slice(0, 90).padEnd(91)} │`);
        }
        console.log('└' + '─'.repeat(98) + '┘');
        console.log('═'.repeat(100) + '\n');
    });
};

// Proxy configuration
const proxyOptions = {
    target: 'http://localhost:11434',
    changeOrigin: true,
    pathRewrite: {
        '^/': '/'
    },
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('host', 'localhost:11434');
        console.log('\n🔄 FORWARDING REQUEST');
        console.log('┌' + '─'.repeat(98) + '┐');
        console.log(`│ 🎯 Target: ${proxyOptions.target}${req.url}`.padEnd(99) + '│');
        console.log('└' + '─'.repeat(98) + '┘');
    },
    onProxyRes: logResponse
};

// Apply middleware
app.use(logRequest);
app.use(authMiddleware);
app.use('/', createProxyMiddleware(proxyOptions));

const PORT = 3000;
app.listen(PORT, () => {
    console.log('\n' + '═'.repeat(100));
    console.log('🚀 Proxy server is running'.padEnd(99) + '│');
    console.log(`🔌 Port: ${PORT}`.padEnd(99) + '│');
    console.log(`🎯 Target: ${proxyOptions.target}`.padEnd(99) + '│');
    console.log('═'.repeat(100) + '\n');
});