# Restaurant Management System (Motia Backend)

A backend-focused Restaurant Management System built using Motia as part of a hackathon.  
This project focuses on learning and applying event-driven backend concepts rather than building a full frontend application.

The system is designed to keep APIs simple while moving heavy or long-running logic to background workflows.

---

## Problem Statement

Small and medium-sized restaurants often manage orders, menus, and inventory in a tightly coupled way where all logic runs inside API requests.  
This makes systems harder to scale, maintain, and extend as requirements grow.

---

## Solution Overview

This project uses Motia to build a clean backend architecture where:

- APIs handle validation and core state updates
- Background logic runs using events
- Future real-time updates can be handled using streams

The goal is to separate business logic from side effects and build something closer to a real-world backend system.

---

## Tech Stack

- Motia
- Node.js
- Firestore
- Firebase Authentication
- Gemini AI (work in progress)

---

## Project Structure


---

## Core Features Implemented

### Role-Based Access

- Firebase Authentication for users
- Admin and customer separation
- Authorization enforced using middleware

---

### Admin Features

- Add, update, and delete ingredients
- Add, update, and delete dishes
- View all orders
- Update order status
- Basic dashboard data
- AI-based analytics endpoint (prototype)

---

### Customer Features

- View menu
- Place orders
- View order history
- View individual order details

---

### Order Lifecycle

Orders follow a defined lifecycle:

pending → accepted → preparing → ready → completed
↓
rejected


Invalid state transitions are prevented by the backend.

---

### Event-Driven Inventory Deduction

- When an order is accepted, the API emits an event
- A background event handler deducts ingredient quantities
- This avoids heavy processing inside the API
- Keeps the system non-blocking and easier to extend

---

## AI Analytics Agent (Work in Progress)

An AI analytics endpoint was added for admins to ask natural language questions about restaurant data.

- Collects orders, dishes, and ingredients from Firestore
- Sends context to a Gemini AI model
- Streams responses back using Motia Streams
- Designed to provide insights like popular dishes, ingredient usage, and trends

This feature is a prototype and not fully production-ready.

---

## Future Improvements

- Real-time order updates using Motia Streams
- Inventory low-stock alerts and automation
- Notifications for order status changes
- Analytics dashboards
- Order expiry and scheduled background jobs
- Smarter AI agent with recommendations and automation

---

## Summary

This project was built to explore how Motia can be used to manage APIs, background workflows, events, and streams in a single backend system.
