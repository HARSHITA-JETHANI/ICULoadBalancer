# 🚑 PulseRoute

### *Next-Gen Emergency ICU Load Balancer & Smart Router*

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Database-MongoDB-brightgreen?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/RealTime-Socket.io-black?style=for-the-badge" />
</p>

---

## 🧠 Overview

**PulseRoute** is a real-time, bidirectional emergency response ecosystem designed to optimize ICU bed allocation.

By intelligently connecting **ambulances 🚑** and **hospitals 🏥**, it ensures:

* Faster decision-making
* Better resource utilization
* Increased survival probability

---

## 🎯 The Core Problem

> ⚠️ In emergencies, *"Nearest"* ≠ *"Best"*

* 🚨 Trauma centers are often overloaded
* 📉 Smaller hospitals may have unused ICU capacity
* 👀 No real-time visibility into resources
* ⏳ Hospitals receive zero preparation time

---

## 💡 The PulseRoute Solution

We built a **3-tier intelligent system** that creates a **“Living Map” of healthcare capacity**

---

### 📟 Smart Dispatcher Dashboard

* Real-time hospital recommendations
* Dynamic routing based on:

  * Distance 📍
  * ICU availability 🛏️
  * Severity ⚠️

---

### 🏥 Hospital Admin Portal

* 🔄 One-click ICU/bed updates
* 🚨 Emergency alerts (audio + visual)
* 📡 Live ambulance tracking

---

### 🧠 Dynamic Severity Routing

| Severity Level     | Strategy                       |
| ------------------ | ------------------------------ |
| 🔴 Critical (8–10) | 90% weight on **distance**     |
| 🟡 Moderate (4–7)  | Balanced approach              |
| 🟢 Stable (1–3)    | 70% weight on **availability** |

---

## 🛠️ Tech Stack

| Layer        | Technology                            |
| ------------ | ------------------------------------- |
| 🎨 Frontend  | React 18, Tailwind CSS, Framer Motion |
| 🗺️ Mapping  | Leaflet.js, OpenStreetMap             |
| ⚡ Real-Time  | Socket.io                             |
| 🗄️ Database | MongoDB, Mongoose                     |
| 🔧 Backend   | Node.js, Express                      |
| 🎯 Icons     | Lucide React                          |

---

## 🚀 Quick Start Guide

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/HARSHITA-JETHANI/ICULoadBalancer.git
cd ICULoadBalancer
npm install
```

---

### 2️⃣ Environment Setup

Create a `.env` file inside `/backend`:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
```

---

### 3️⃣ Run the Project

#### 🔹 Backend

```bash
cd backend
node server.js
```

#### 🔹 Frontend

```bash
npm run dev
```

---

## 📸 Interface Preview

> 📌 Add screenshots in `/screenshots` folder and link here

* 🏠 Landing Page
* 🗺️ Dispatcher Dashboard
* 🏥 Admin Portal

---

## ⭐ Why This Project Stands Out

* 🚀 Real-world problem solving
* ⚡ Real-time system design
* 🧠 Intelligent decision-making algorithm
* 🌐 Full-stack architecture

---

## 📌 Future Enhancements

* 🤖 AI-based demand prediction
* 📊 Analytics dashboard for hospitals
* 📱 Mobile app for ambulance drivers
* 🌍 Multi-city scalability
